import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { prisma } from "../src/prisma.js";
import { closeDb, getApp, markVerified, registerPair, resetDb } from "./helpers.js";

/**
 * The iyzico SDK is replaced wholesale so these tests never leave the
 * process. The two mocked calls are the only seam the service uses; every
 * state transition (row status, booking.paidAt, redirects) is real.
 */
vi.mock("../src/utils/iyzico.js", async () => {
  const actual = await vi.importActual<typeof import("../src/utils/iyzico.js")>(
    "../src/utils/iyzico.js",
  );
  return {
    ...actual,
    paymentsConfigured: () => true,
    initializeCheckoutForm: vi.fn(),
    retrieveCheckoutForm: vi.fn(),
    cancelPayment: vi.fn(),
    refundPayment: vi.fn(),
  };
});

import {
  cancelPayment,
  initializeCheckoutForm,
  refundPayment,
  retrieveCheckoutForm,
  type CheckoutInitRequest,
  type CheckoutInitResult,
  type CheckoutRetrieveResult,
} from "../src/utils/iyzico.js";

const initMock = vi.mocked(initializeCheckoutForm);
const retrieveMock = vi.mocked(retrieveCheckoutForm);
const cancelMock = vi.mocked(cancelPayment);
const refundMock = vi.mocked(refundPayment);

const app = getApp();

function futureISO(daysAhead = 2): string {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60_000).toISOString();
}

/** Registers both parties and creates one booking from customer → pro. */
async function setupBooking() {
  const { customer, professional } = await registerPair(app);
  await markVerified(professional.user.id);
  const created = await request(app)
    .post("/api/bookings")
    .set("Authorization", `Bearer ${customer.token}`)
    .send({
      professionalId: professional.user.id,
      scheduledAt: futureISO(),
      address: "Bağdat Caddesi No:42, Kadıköy",
      description: "Mutfak lavabosu sızdırıyor.",
    })
    .expect(201);
  return { customer, professional, bookingId: created.body.item.id as string };
}

/** Quote + confirm so the booking is payable. */
async function makePayable(
  professionalToken: string,
  bookingId: string,
  priceCents = 25_000,
) {
  await request(app)
    .patch(`/api/bookings/${bookingId}/quote`)
    .set("Authorization", `Bearer ${professionalToken}`)
    .send({ priceCents })
    .expect(200);
  await request(app)
    .patch(`/api/bookings/${bookingId}/confirm`)
    .set("Authorization", `Bearer ${professionalToken}`)
    .expect(200);
}

function successfulInit(token = `tok-${Math.random()}`): CheckoutInitResult {
  return {
    status: "success",
    token,
    paymentPageUrl: `https://sandbox-cpp.iyzipay.com?token=${token}`,
    checkoutFormContent: '<script type="text/javascript"></script>',
  };
}

/** Runs checkout + callback so the booking ends up paid. Returns the payment id. */
async function pay(customerToken: string, bookingId: string, token = `tok-${Math.random()}`) {
  initMock.mockResolvedValueOnce(successfulInit(token));
  const start = await request(app)
    .post(`/api/payments/checkout/${bookingId}`)
    .set("Authorization", `Bearer ${customerToken}`)
    .expect(201);
  retrieveMock.mockImplementationOnce(async (_token, conversationId) =>
    paidRetrieve(conversationId),
  );
  await request(app)
    .post("/api/payments/callback")
    .type("form")
    .send({ token })
    .expect(303);
  return start.body.session.paymentId as string;
}

/** A retrieve result that says "paid, exactly what was asked". */
function paidRetrieve(
  conversationId: string,
  overrides: Partial<CheckoutRetrieveResult> = {},
): CheckoutRetrieveResult {
  return {
    status: "success",
    paymentStatus: "SUCCESS",
    conversationId,
    paymentId: "iyz-pay-123",
    price: "250.00",
    paidPrice: "250.00",
    currency: "TRY",
    itemTransactions: [{ paymentTransactionId: "iyz-tx-456" }],
    ...overrides,
  };
}

describe("payments", () => {
  beforeEach(async () => {
    await resetDb();
    initMock.mockReset();
    retrieveMock.mockReset();
    cancelMock.mockReset();
    refundMock.mockReset();
  });
  afterAll(closeDb);

  /* ── quote ─────────────────────────────────────────────────────────────── */

  describe("quote", () => {
    it("lets the professional set a price on an open booking", async () => {
      const { professional, customer, bookingId } = await setupBooking();

      const res = await request(app)
        .patch(`/api/bookings/${bookingId}/quote`)
        .set("Authorization", `Bearer ${professional.token}`)
        .send({ priceCents: 25_000 })
        .expect(200);
      expect(res.body.item.priceCents).toBe(25_000);
      expect(res.body.item.paidAt).toBeNull();

      // The customer sees the quote on their own list.
      const mine = await request(app)
        .get("/api/bookings/me")
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);
      expect(mine.body.items[0].priceCents).toBe(25_000);
    });

    it("refuses a re-quote while the customer has the payment form open", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce(successfulInit("tok-live"));
      await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);

      await request(app)
        .patch(`/api/bookings/${bookingId}/quote`)
        .set("Authorization", `Bearer ${professional.token}`)
        .send({ priceCents: 99_900 })
        .expect(409);
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.priceCents).toBe(25_000);

      // Once the token would have expired, re-quoting works again.
      await prisma.payment.updateMany({
        where: { bookingId },
        data: { createdAt: new Date(Date.now() - 31 * 60 * 1000) },
      });
      await request(app)
        .patch(`/api/bookings/${bookingId}/quote`)
        .set("Authorization", `Bearer ${professional.token}`)
        .send({ priceCents: 99_900 })
        .expect(200);
    });

    it("rejects a quote from the customer, and sub-₺1 or fractional prices", async () => {
      const { professional, customer, bookingId } = await setupBooking();

      await request(app)
        .patch(`/api/bookings/${bookingId}/quote`)
        .set("Authorization", `Bearer ${customer.token}`)
        .send({ priceCents: 25_000 })
        .expect(403);

      await request(app)
        .patch(`/api/bookings/${bookingId}/quote`)
        .set("Authorization", `Bearer ${professional.token}`)
        .send({ priceCents: 50 })
        .expect(400);

      await request(app)
        .patch(`/api/bookings/${bookingId}/quote`)
        .set("Authorization", `Bearer ${professional.token}`)
        .send({ priceCents: 250.5 })
        .expect(400);
    });
  });

  /* ── checkout start ────────────────────────────────────────────────────── */

  describe("checkout", () => {
    it("refuses until the booking is quoted AND confirmed", async () => {
      const { professional, customer, bookingId } = await setupBooking();

      // Neither quoted nor confirmed.
      await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(400);

      // Confirmed, no price.
      await request(app)
        .patch(`/api/bookings/${bookingId}/confirm`)
        .set("Authorization", `Bearer ${professional.token}`)
        .expect(200);
      const noPrice = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(400);
      expect(noPrice.body.error.message).toMatch(/fiyat/i);

      expect(initMock).not.toHaveBeenCalled();
    });

    it("a job completed before it was priced or paid can still be quoted and paid", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await request(app)
        .patch(`/api/bookings/${bookingId}/complete`)
        .set("Authorization", `Bearer ${professional.token}`)
        .expect(200);
      await request(app)
        .patch(`/api/bookings/${bookingId}/quote`)
        .set("Authorization", `Bearer ${professional.token}`)
        .send({ priceCents: 25_000 })
        .expect(200);

      initMock.mockResolvedValueOnce(successfulInit("tok-after-work"));
      await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
    });

    it("a cancelled booking can't be quoted or paid", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      await request(app)
        .patch(`/api/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);

      await request(app)
        .patch(`/api/bookings/${bookingId}/quote`)
        .set("Authorization", `Bearer ${professional.token}`)
        .send({ priceCents: 30_000 })
        .expect(400);
      await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(400);
      expect(initMock).not.toHaveBeenCalled();
    });

    it("only the booking's customer may start a checkout", async () => {
      const { professional, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);

      await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${professional.token}`)
        .expect(403);

      await request(app).post(`/api/payments/checkout/${bookingId}`).expect(401);
    });

    it("creates a pending payment from the booking's price and returns the hosted URL", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce(successfulInit("tok-abc"));

      const res = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);

      expect(res.body.session.paymentPageUrl).toContain("tok-abc");
      const paymentId: string = res.body.session.paymentId;

      // What we told iyzico: our ids, the DB price, our callback.
      expect(initMock).toHaveBeenCalledTimes(1);
      const sent = initMock.mock.calls[0]![0] as CheckoutInitRequest;
      expect(sent.conversationId).toBe(paymentId);
      expect(sent.basketId).toBe(bookingId);
      expect(sent.price).toBe("250.00");
      expect(sent.paidPrice).toBe("250.00");
      expect(sent.callbackUrl).toMatch(/\/api\/payments\/callback$/);
      expect(sent.buyer.email).toBe(customer.user.email);
      expect(sent.basketItems[0]!.price).toBe("250.00");

      const row = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(row).toMatchObject({
        bookingId,
        status: "pending",
        amountCents: 25_000,
        token: "tok-abc",
      });
    });

    it("a second checkout supersedes an abandoned pending one", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock
        .mockResolvedValueOnce(successfulInit("tok-1"))
        .mockResolvedValueOnce(successfulInit("tok-2"));

      const first = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
      await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);

      const old = await prisma.payment.findUnique({
        where: { id: first.body.session.paymentId },
      });
      expect(old?.status).toBe("failed");
      expect(old?.errorCode).toBe("superseded");
    });

    it("records a provider rejection as a failed attempt and answers 502", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce({
        status: "failure",
        errorCode: "5001",
        errorMessage: "Geçersiz istek",
      });

      const res = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(502);
      expect(res.body.error.code).toBe("payment_provider_error");

      const rows = await prisma.payment.findMany({ where: { bookingId } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ status: "failed", errorCode: "5001" });
    });
  });

  /* ── callback + reconcile ──────────────────────────────────────────────── */

  describe("callback", () => {
    it("full happy path: pay → callback → booking marked paid → visible everywhere", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce(successfulInit("tok-ok"));

      const start = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
      const paymentId: string = start.body.session.paymentId;

      retrieveMock.mockImplementationOnce(async (_token, conversationId) =>
        paidRetrieve(conversationId),
      );

      // iyzico's browser POST: form-encoded, no auth header, and — like a
      // real browser leaving iyzico's page — a foreign Origin.
      const cb = await request(app)
        .post("/api/payments/callback")
        .set("Origin", "https://sandbox-cpp.iyzipay.com")
        .type("form")
        .send({ token: "tok-ok" })
        .expect(303);
      expect(cb.headers.location).toContain(`/odeme/sonuc?payment=${paymentId}`);
      expect(retrieveMock).toHaveBeenCalledWith("tok-ok", paymentId);

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment).toMatchObject({
        status: "succeeded",
        providerPaymentId: "iyz-pay-123",
        providerTransactionId: "iyz-tx-456",
      });
      expect(payment?.paidAt).toBeInstanceOf(Date);

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.paidAt).toBeInstanceOf(Date);

      // Both dashboards see it.
      const mine = await request(app)
        .get("/api/bookings/me")
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);
      expect(mine.body.items[0].paidAt).not.toBeNull();
      const pros = await request(app)
        .get("/api/bookings/professional/me")
        .set("Authorization", `Bearer ${professional.token}`)
        .expect(200);
      expect(pros.body.items[0].paidAt).not.toBeNull();

      // Result page reads the outcome from our DB.
      const shown = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);
      expect(shown.body.item).toMatchObject({
        status: "succeeded",
        amountCents: 25_000,
        bookingId,
      });

      // And now the price is frozen, and paying again is refused.
      await request(app)
        .patch(`/api/bookings/${bookingId}/quote`)
        .set("Authorization", `Bearer ${professional.token}`)
        .send({ priceCents: 99_900 })
        .expect(400);
      await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(409);
    });

    it("is idempotent — a repeated callback doesn't ask iyzico again", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce(successfulInit("tok-twice"));
      await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
      retrieveMock.mockImplementation(async (_t, conversationId) =>
        paidRetrieve(conversationId),
      );

      await request(app)
        .post("/api/payments/callback")
        .type("form")
        .send({ token: "tok-twice" })
        .expect(303);
      await request(app)
        .post("/api/payments/callback")
        .type("form")
        .send({ token: "tok-twice" })
        .expect(303);

      expect(retrieveMock).toHaveBeenCalledTimes(1);
    });

    it("two callbacks racing for the same token settle once and refund nothing", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce(successfulInit("tok-race"));
      const start = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
      // Both requests read the row as pending and get to iyzico before
      // either writes — the window a double-posted callback lands in.
      retrieveMock.mockImplementation(async (_t, conversationId) => {
        await new Promise((r) => setTimeout(r, 300));
        return paidRetrieve(conversationId);
      });

      const [first, second] = await Promise.all([
        request(app).post("/api/payments/callback").type("form").send({ token: "tok-race" }),
        request(app).post("/api/payments/callback").type("form").send({ token: "tok-race" }),
      ]);
      expect(first.status).toBe(303);
      expect(second.status).toBe(303);
      expect(retrieveMock).toHaveBeenCalledTimes(2);

      expect(cancelMock).not.toHaveBeenCalled();
      expect(refundMock).not.toHaveBeenCalled();
      const payment = await prisma.payment.findUnique({
        where: { id: start.body.session.paymentId },
      });
      expect(payment?.status).toBe("succeeded");
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.paidAt).not.toBeNull();
    });

    it("a callback for a payment stuck in refunding leaves it alone", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      const paymentId = await pay(customer.token, bookingId, "tok-stuck");
      await prisma.payment.update({ where: { id: paymentId }, data: { status: "refunding" } });
      retrieveMock.mockReset();
      retrieveMock.mockImplementation(async (_t, conversationId) =>
        paidRetrieve(conversationId),
      );

      await request(app)
        .post("/api/payments/callback")
        .type("form")
        .send({ token: "tok-stuck" })
        .expect(303);

      expect(retrieveMock).not.toHaveBeenCalled();
      expect(refundMock).not.toHaveBeenCalled();
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe("refunding");
    });

    it("a declined card leaves the booking unpaid and the attempt failed", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce(successfulInit("tok-declined"));
      const start = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
      const paymentId: string = start.body.session.paymentId;

      retrieveMock.mockResolvedValueOnce({
        status: "failure",
        conversationId: paymentId,
        paymentStatus: "FAILURE",
        errorCode: "10051",
        errorMessage: "Kart limiti yetersiz",
      });

      const cb = await request(app)
        .post("/api/payments/callback")
        .type("form")
        .send({ token: "tok-declined" })
        .expect(303);
      // Still routed to the result page — it reads the failure from our DB.
      expect(cb.headers.location).toContain(`payment=${paymentId}`);

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment).toMatchObject({
        status: "failed",
        errorCode: "10051",
        errorMessage: "Kart limiti yetersiz",
      });
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.paidAt).toBeNull();

      const shown = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);
      expect(shown.body.item.status).toBe("failed");
      expect(shown.body.item.errorMessage).toBe("Kart limiti yetersiz");

      // Customer can try again.
      initMock.mockResolvedValueOnce(successfulInit("tok-retry"));
      await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
    });

    it("a successful charge for the wrong amount never marks the booking paid", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce(successfulInit("tok-tampered"));
      const start = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
      const paymentId: string = start.body.session.paymentId;

      retrieveMock.mockResolvedValueOnce(
        paidRetrieve(paymentId, { price: "1.00", paidPrice: "1.00" }),
      );

      await request(app)
        .post("/api/payments/callback")
        .type("form")
        .send({ token: "tok-tampered" })
        .expect(303);

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe("failed");
      expect(payment?.errorCode).toBe("amount_mismatch");
      // Provider id kept so the stray charge can be refunded from the panel.
      expect(payment?.providerPaymentId).toBe("iyz-pay-123");
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.paidAt).toBeNull();
    });

    it("the callback is never blocked by CORS, whatever Origin the browser sends", async () => {
      // `null` is what a browser sends after a bank's 3DS page.
      for (const origin of ["https://sandbox-cpp.iyzipay.com", "null", "https://evil.example"]) {
        const res = await request(app)
          .post("/api/payments/callback")
          .set("Origin", origin)
          .type("form")
          .send({ token: "never-issued" })
          .expect(303);
        expect(res.headers.location).toContain("/odeme/sonuc?status=error");
      }
      // The rest of the API still enforces it.
      await request(app)
        .get("/api/bookings/me")
        .set("Origin", "https://evil.example")
        .expect(500);
    });

    it("an unknown or missing token goes to the error result page, nothing changes", async () => {
      const unknown = await request(app)
        .post("/api/payments/callback")
        .type("form")
        .send({ token: "never-issued" })
        .expect(303);
      expect(unknown.headers.location).toContain("status=error");

      const empty = await request(app)
        .post("/api/payments/callback")
        .type("form")
        .send({})
        .expect(303);
      expect(empty.headers.location).toContain("status=error");

      expect(retrieveMock).not.toHaveBeenCalled();
    });

    it("GET /payments/:id reconciles a pending payment when the callback was lost", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce(successfulInit("tok-lost"));
      const start = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
      const paymentId: string = start.body.session.paymentId;

      // No callback ever arrives. The result page asks us; we ask iyzico.
      retrieveMock.mockImplementationOnce(async (_t, conversationId) =>
        paidRetrieve(conversationId),
      );
      const shown = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);
      expect(shown.body.item.status).toBe("succeeded");

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.paidAt).toBeInstanceOf(Date);
    });

    it("a token whose form is still open stays pending, not failed", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce(successfulInit("tok-open"));
      const start = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
      const paymentId: string = start.body.session.paymentId;

      // What iyzico actually answers while the customer is still on the form.
      retrieveMock.mockResolvedValue({
        status: "failure",
        conversationId: paymentId,
        errorCode: "5122",
        errorMessage: "Gönderilen tokena ait ödeme bilgisi bulunamadı",
      });

      const shown = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);
      expect(shown.body.item.status).toBe("pending");
      expect(shown.body.item.errorMessage).toBeNull();

      // Same answer through the callback: still no verdict recorded.
      await request(app)
        .post("/api/payments/callback")
        .type("form")
        .send({ token: "tok-open" })
        .expect(303);
      const row = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(row?.status).toBe("pending");
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.paidAt).toBeNull();
    });

    it("GET /payments/:id is owner-only", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce(successfulInit("tok-private"));
      const start = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);

      await request(app)
        .get(`/api/payments/${start.body.session.paymentId}`)
        .set("Authorization", `Bearer ${professional.token}`)
        .expect(403);
      await request(app)
        .get(`/api/payments/${start.body.session.paymentId}`)
        .expect(401);
    });
  });

  /* ── refunds ───────────────────────────────────────────────────────────── */

  describe("refunds", () => {
    async function paidBooking() {
      const ctx = await setupBooking();
      await makePayable(ctx.professional.token, ctx.bookingId);
      const paymentId = await pay(ctx.customer.token, ctx.bookingId);
      return { ...ctx, paymentId };
    }

    function cancel(token: string, bookingId: string) {
      return request(app)
        .patch(`/api/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    }

    it("cancelling a paid booking voids the charge the same day", async () => {
      const { customer, professional, bookingId, paymentId } = await paidBooking();
      cancelMock.mockResolvedValueOnce({ status: "success", paymentId: "iyz-pay-123" });

      const res = await cancel(customer.token, bookingId);
      expect(res.body.item.status).toBe("cancelled");
      expect(res.body.item.refund).toBe("done");

      // The professional's list shows it as refunded too, not as paid.
      const pros = await request(app)
        .get("/api/bookings/professional/me")
        .set("Authorization", `Bearer ${professional.token}`)
        .expect(200);
      expect(pros.body.items[0].refund).toBe("done");

      expect(cancelMock).toHaveBeenCalledWith("iyz-pay-123", paymentId, undefined);
      expect(refundMock).not.toHaveBeenCalled();
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe("refunded");
      expect(payment?.refundedAt).toBeInstanceOf(Date);

      const shown = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);
      expect(shown.body.item.status).toBe("refunded");
    });

    it("falls back to a refund once the charge is settled", async () => {
      const { professional, bookingId, paymentId } = await paidBooking();
      cancelMock.mockResolvedValueOnce({ status: "failure", errorCode: "5093" });
      refundMock.mockResolvedValueOnce({ status: "success", price: "250.00" });

      await cancel(professional.token, bookingId);

      expect(refundMock).toHaveBeenCalledWith("iyz-tx-456", 25_000, paymentId, undefined);
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe("refunded");
    });

    it("when iyzico refuses both, the booking is still cancelled and the payment stays succeeded", async () => {
      const { customer, bookingId, paymentId } = await paidBooking();
      cancelMock.mockResolvedValueOnce({ status: "failure", errorCode: "5093" });
      refundMock.mockResolvedValueOnce({
        status: "failure",
        errorCode: "5115",
        errorMessage: "İade edilemez",
      });

      const res = await cancel(customer.token, bookingId);
      expect(res.body.item.status).toBe("cancelled");
      // Money is still with us, so the booking still reads as paid.
      expect(res.body.item.refund).toBeNull();
      expect(res.body.item.paidAt).not.toBeNull();

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment).toMatchObject({ status: "succeeded", errorCode: "5115" });
      expect(payment?.refundedAt).toBeNull();
    });

    it("a call that breaks mid-flight leaves the payment in refunding, never retried blindly", async () => {
      const { customer, bookingId, paymentId } = await paidBooking();
      cancelMock.mockRejectedValueOnce(new Error("iyzico: no response within 20000ms"));

      const res = await cancel(customer.token, bookingId);
      expect(res.body.item.refund).toBe("pending");

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment).toMatchObject({ status: "refunding", errorCode: "refund_unknown" });

      // A second cancel is a no-op for the booking and must not touch iyzico.
      await cancel(customer.token, bookingId);
      expect(cancelMock).toHaveBeenCalledTimes(1);
      expect(refundMock).not.toHaveBeenCalled();
    });

    it("records who cancelled", async () => {
      const { professional, bookingId } = await paidBooking();
      cancelMock.mockResolvedValueOnce({ status: "success" });
      await cancel(professional.token, bookingId);
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.cancelledBy).toBe("professional");
      expect(booking?.cancelledAt).toBeInstanceOf(Date);
    });

    it("once the appointment time passes, the customer can't cancel a paid booking", async () => {
      const { customer, bookingId, paymentId } = await paidBooking();
      await prisma.booking.update({
        where: { id: bookingId },
        data: { scheduledAt: new Date(Date.now() - 60 * 60_000) },
      });

      await request(app)
        .patch(`/api/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(400);

      expect(cancelMock).not.toHaveBeenCalled();
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.status).toBe("confirmed");
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe("succeeded");
    });

    it("...but the professional still can, and the customer gets the money back", async () => {
      const { professional, bookingId, paymentId } = await paidBooking();
      await prisma.booking.update({
        where: { id: bookingId },
        data: { scheduledAt: new Date(Date.now() - 60 * 60_000) },
      });
      cancelMock.mockResolvedValueOnce({ status: "success" });

      const res = await cancel(professional.token, bookingId);
      expect(res.body.item.refund).toBe("done");
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe("refunded");
    });

    it("an unpaid booking past its time can still be cancelled by the customer", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      await prisma.booking.update({
        where: { id: bookingId },
        data: { scheduledAt: new Date(Date.now() - 60 * 60_000) },
      });
      const res = await cancel(customer.token, bookingId);
      expect(res.body.item.status).toBe("cancelled");
    });

    it("cancelling an unpaid booking never calls iyzico", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      await cancel(customer.token, bookingId);
      expect(cancelMock).not.toHaveBeenCalled();
      expect(refundMock).not.toHaveBeenCalled();
    });

    it("a payment that lands after the booking was cancelled is refunded on the spot", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);
      initMock.mockResolvedValueOnce(successfulInit("tok-late"));
      const start = await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
      const paymentId: string = start.body.session.paymentId;

      // Cancelled while the form was open; the customer pays anyway.
      await cancel(professional.token, bookingId);
      expect(cancelMock).not.toHaveBeenCalled();

      retrieveMock.mockImplementationOnce(async (_token, conversationId) =>
        paidRetrieve(conversationId),
      );
      cancelMock.mockResolvedValueOnce({ status: "success" });
      await request(app)
        .post("/api/payments/callback")
        .type("form")
        .send({ token: "tok-late" })
        .expect(303);

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe("refunded");
      const shown = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);
      expect(shown.body.item.status).toBe("refunded");
    });

    it("a double charge refunds the second payment and keeps the first", async () => {
      const { professional, customer, bookingId } = await setupBooking();
      await makePayable(professional.token, bookingId);

      // Two tabs: both forms opened before either was paid.
      initMock.mockResolvedValueOnce(successfulInit("tok-a"));
      await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);
      initMock.mockResolvedValueOnce(successfulInit("tok-b"));
      await request(app)
        .post(`/api/payments/checkout/${bookingId}`)
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(201);

      for (const token of ["tok-a", "tok-b"]) {
        retrieveMock.mockImplementationOnce(async (_t, conversationId) =>
          paidRetrieve(conversationId, { paymentId: `iyz-${token}` }),
        );
      }
      cancelMock.mockResolvedValueOnce({ status: "success" });
      await request(app).post("/api/payments/callback").type("form").send({ token: "tok-a" });
      await request(app).post("/api/payments/callback").type("form").send({ token: "tok-b" });

      expect(cancelMock).toHaveBeenCalledTimes(1);
      expect(cancelMock.mock.calls[0]![0]).toBe("iyz-tok-b");
      const a = await prisma.payment.findUnique({ where: { token: "tok-a" } });
      const b = await prisma.payment.findUnique({ where: { token: "tok-b" } });
      expect(a?.status).toBe("succeeded");
      expect(b?.status).toBe("refunded");

      // One charge still stands: the booking is paid, not refunded.
      const mine = await request(app)
        .get("/api/bookings/me")
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);
      expect(mine.body.items[0].refund).toBeNull();
      expect(mine.body.items[0].paidAt).not.toBeNull();
    });
  });
});
