import https from "node:https";
import { createRequire } from "node:module";
import type Iyzipay from "iyzipay";
import { config } from "../config.js";
import { AppError } from "../errors.js";
import { logger } from "../logger.js";

/**
 * Minimal, promise-based client for the iyzico calls the payment flow needs:
 *   - initializeCheckoutForm: asks iyzico for a hosted payment page
 *   - retrieveCheckoutForm:   asks iyzico what happened to a token
 *   - cancelPayment:          voids a charge before end-of-day settlement
 *   - refundPayment:          returns money for an already-settled charge
 *
 * Why not call the official `iyzipay` SDK end to end? Its transport is
 * `postman-request` over Node's global HTTPS agent, with no timeout and no
 * retry — and iyzico's edge intermittently resets fresh connections (see
 * the connection note below), which surfaced as a 1-in-3 failure rate on
 * "Öde". So we borrow exactly the parts of the SDK that encode iyzico's
 * protocol — the request models that shape/normalise the body and the HMAC
 * signer for the `Authorization` header — and do the HTTP call ourselves
 * with a bounded timeout and a retry. Same wire format the SDK would send.
 *
 * Card data never touches this server: the customer types it on iyzico's
 * page. That keeps us outside PCI scope.
 *
 * Kept deliberately small so tests can mock the whole module — see
 * tests/payments.test.ts.
 */

/* ─── request / result shapes ───────────────────────────────────────────── */

// These follow iyzico's own docs. (The bundled @types describe checkout-form
// init with the 3DS request type, which demands `paymentCard` — the one
// thing a hosted form must NOT carry — so we don't reuse that one.)

type Buyer = Iyzipay.PaymentRequestData["buyer"];
type Address = Iyzipay.PaymentRequestData["billingAddress"];
type BasketItem = Iyzipay.PaymentRequestData["basketItems"][number];

export interface CheckoutInitRequest {
  locale: "TR" | "EN";
  conversationId: string;
  /** Decimal string with two places, e.g. "250.00". */
  price: string;
  paidPrice: string;
  currency: "TRY";
  basketId: string;
  paymentGroup: "PRODUCT" | "LISTING" | "SUBSCRIPTION";
  callbackUrl: string;
  enabledInstallments: number[];
  buyer: Buyer;
  shippingAddress: Address;
  billingAddress: Address;
  basketItems: BasketItem[];
}

export interface CheckoutInitResult {
  status: "success" | "failure";
  conversationId?: string;
  token?: string;
  tokenExpireTime?: number;
  /** Hosted payment page. Redirect the customer here. */
  paymentPageUrl?: string;
  /** Embeddable variant of the same form (script tag + container). */
  checkoutFormContent?: string;
  errorCode?: string;
  errorMessage?: string;
  errorGroup?: string;
}

export interface CheckoutRetrieveResult {
  status: "success" | "failure";
  conversationId?: string;
  token?: string;
  /** "SUCCESS" once the charge went through; anything else is not paid. */
  paymentStatus?: string;
  paymentId?: string;
  price?: number | string;
  paidPrice?: number | string;
  currency?: string;
  basketId?: string;
  installment?: number;
  fraudStatus?: number;
  itemTransactions?: Array<{
    itemId?: string;
    paymentTransactionId?: string;
    price?: number | string;
    paidPrice?: number | string;
  }>;
  /** Older responses/typings spell the same list this way. */
  paymentItems?: Array<{ itemId?: string; paymentTransactionId?: string }>;
  errorCode?: string;
  errorMessage?: string;
  errorGroup?: string;
}

/** Same shape for cancel and refund: iyzico echoes the amount it returned. */
export interface ReversalResult {
  status: "success" | "failure";
  conversationId?: string;
  paymentId?: string;
  paymentTransactionId?: string;
  price?: number | string;
  currency?: string;
  errorCode?: string;
  errorMessage?: string;
  errorGroup?: string;
}

/* ─── the bits of the SDK we reuse ──────────────────────────────────────── */

// The package is CommonJS with no `exports` map, so its internals are
// reachable by path. They've been stable across the 2.0.x line; if a future
// release moves them the require below fails at boot, not mid-checkout.
const require = createRequire(import.meta.url);

interface SdkUtils {
  generateRandomString(size: number): string;
  generateAuthorizationHeaderV2(
    headerName: string,
    apiKey: string,
    separator: string,
    secretKey: string,
    path: string,
    body: unknown,
    randomString: string,
  ): string;
}
interface RequestModel {
  toJson(): Record<string, unknown>;
}
type RequestModelCtor = new (params: unknown) => RequestModel;

const sdkUtils = require("iyzipay/lib/utils.js") as SdkUtils;
const CreateCheckoutFormInitializeRequest = require(
  "iyzipay/lib/requests/CreateCheckoutFormInitializeRequest.js",
) as RequestModelCtor;
const RetrieveCheckoutFormRequest = require(
  "iyzipay/lib/requests/RetrieveCheckoutFormRequest.js",
) as RequestModelCtor;
const CreateCancelRequest = require(
  "iyzipay/lib/requests/CreateCancelRequest.js",
) as RequestModelCtor;
const CreateRefundRequest = require(
  "iyzipay/lib/requests/CreateRefundRequest.js",
) as RequestModelCtor;
const SDK_VERSION = (require("iyzipay/package.json") as { version: string }).version;

// Paths from the SDK's resource definitions (lib/resources/CheckoutForm*.js).
const PATH_CHECKOUT_INIT = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const PATH_CHECKOUT_RETRIEVE = "/payment/iyzipos/checkoutform/auth/ecom/detail";
// lib/resources/Cancel.js and lib/resources/Refund.js.
const PATH_CANCEL = "/payment/cancel";
const PATH_REFUND = "/payment/refund";

/* ─── transport ─────────────────────────────────────────────────────────── */

const REQUEST_TIMEOUT_MS = 20_000;

// Connection note. Measured against both the sandbox and the live host:
// after a quiet spell, the first one or two fresh TLS connections to
// iyzico's edge are reset (ECONNRESET) *before the handshake completes*,
// and every connection after that succeeds. Other hosts show nothing of
// the sort, so it's their edge (or a box in front of it), not this code.
//
// Two consequences shape this transport:
//   - a fresh connection per call (no keep-alive): payments are low-volume,
//     one handshake is ~100ms, and it removes the stale-socket race that
//     would otherwise produce the same error code for a different reason;
//   - a short retry on transient transport errors (below). A reset before
//     the handshake means iyzico never saw the request, so replaying it
//     can't double anything; init is keyed by conversationId and retrieve
//     is a read. Cancel and refund only ever retry that pre-handshake
//     reset, and iyzico refuses a second reversal of the same money, so a
//     replay there fails loudly rather than paying out twice.
const agent = new https.Agent({ keepAlive: false });

const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [150, 400];
const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "EPIPE",
  "EAI_AGAIN",
]);

interface Credentials {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

let warnedSandbox = false;

function credentials(): Credentials {
  if (!config.IYZICO_API_KEY || !config.IYZICO_SECRET_KEY) {
    throw new AppError("Ödeme sistemi henüz yapılandırılmadı.", {
      status: 503,
      code: "payments_unavailable",
    });
  }
  if (!warnedSandbox && config.isProd && /sandbox/i.test(config.IYZICO_BASE_URL)) {
    warnedSandbox = true;
    logger.warn("iyzico: production build is pointed at the SANDBOX API", {
      baseUrl: config.IYZICO_BASE_URL,
    });
  }
  return {
    apiKey: config.IYZICO_API_KEY,
    secretKey: config.IYZICO_SECRET_KEY,
    baseUrl: config.IYZICO_BASE_URL,
  };
}

/**
 * Signs and POSTs one JSON body to iyzico, retrying transient transport
 * errors (see the connection note above). Resolves with the parsed JSON
 * whatever the HTTP status — iyzico reports API-level failures as 200 +
 * `status: "failure"`, and auth problems as a JSON error too. Rejects on a
 * transport failure that survives the retries, a timeout, or a non-JSON
 * body.
 */
async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await postOnce<T>(path, body);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (!code || !RETRYABLE_CODES.has(code) || attempt >= MAX_ATTEMPTS) {
        throw err;
      }
      logger.warn("iyzico: transient transport error, retrying", {
        path,
        attempt,
        code,
      });
      await new Promise((r) =>
        setTimeout(r, RETRY_BACKOFF_MS[attempt - 1] ?? RETRY_BACKOFF_MS.at(-1)),
      );
    }
  }
}

/**
 * One signed attempt. Mirrors what the SDK sends: same headers, same HMAC
 * over `random + path + JSON.stringify(body)`.
 */
function postOnce<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { apiKey, secretKey, baseUrl } = credentials();
  const random = sdkUtils.generateRandomString(8);
  const payload = JSON.stringify(body);
  const url = new URL(baseUrl + path);

  return new Promise<T>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "POST",
        agent,
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "x-iyzi-rnd": random,
          "x-iyzi-client-version": `iyzipay-node-${SDK_VERSION}`,
          Authorization: sdkUtils.generateAuthorizationHeaderV2(
            "IYZWSv2",
            apiKey,
            ":",
            secretKey,
            path,
            body,
            random,
          ),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("error", reject);
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          try {
            resolve(JSON.parse(text) as T);
          } catch {
            reject(
              new Error(
                `iyzico: non-JSON response (HTTP ${res.statusCode}): ${text.slice(0, 200)}`,
              ),
            );
          }
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error(`iyzico: no response within ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    req.end(payload);
  });
}

/* ─── public API ────────────────────────────────────────────────────────── */

/** True when both iyzico keys are present in the environment. */
export function paymentsConfigured(): boolean {
  return config.paymentsEnabled;
}

export function initializeCheckoutForm(
  req: CheckoutInitRequest,
): Promise<CheckoutInitResult> {
  const body = new CreateCheckoutFormInitializeRequest(req).toJson();
  return post<CheckoutInitResult>(PATH_CHECKOUT_INIT, body);
}

export function retrieveCheckoutForm(
  token: string,
  conversationId: string,
): Promise<CheckoutRetrieveResult> {
  const body = new RetrieveCheckoutFormRequest({
    locale: "tr",
    conversationId,
    token,
  }).toJson();
  return post<CheckoutRetrieveResult>(PATH_CHECKOUT_RETRIEVE, body);
}

/**
 * Voids the whole charge. Only works on the day of the payment, before
 * iyzico settles it; after that iyzico answers with a failure and the
 * money has to come back through refundPayment instead. No fee is kept.
 */
export function cancelPayment(
  paymentId: string,
  conversationId: string,
  ip?: string,
): Promise<ReversalResult> {
  const body = new CreateCancelRequest({
    locale: "tr",
    conversationId,
    paymentId,
    ip,
  }).toJson();
  return post<ReversalResult>(PATH_CANCEL, body);
}

/**
 * Returns `cents` of one basket item's charge. Works on settled payments;
 * iyzico addresses refunds per item, hence the paymentTransactionId.
 */
export function refundPayment(
  paymentTransactionId: string,
  cents: number,
  conversationId: string,
  ip?: string,
): Promise<ReversalResult> {
  const body = new CreateRefundRequest({
    locale: "tr",
    conversationId,
    paymentTransactionId,
    price: formatAmount(cents),
    currency: "TRY",
    ip,
  }).toJson();
  return post<ReversalResult>(PATH_REFUND, body);
}

/* ─── helpers ───────────────────────────────────────────────────────────── */

/** 25000 → "250.00". iyzico wants a decimal string, never integer cents. */
export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** "250.00" | 250 → 25000. Rounds so float noise can't fail an equality. */
export function toCents(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
