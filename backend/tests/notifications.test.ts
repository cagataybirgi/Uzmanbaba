import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { prisma } from "../src/prisma.js";
import { closeDb, getApp, markVerified, registerPair, resetDb } from "./helpers.js";

/**
 * Booking emails are checked at the sendEmail seam: the mailer is replaced,
 * everything that decides who gets what (services, notifyEmail, guards) is
 * real. iyzico is stubbed the same way payments.test.ts does it.
 */
vi.mock("../src/utils/email.js", async () => {
  const actual = await vi.importActual<typeof import("../src/utils/email.js")>(
    "../src/utils/email.js",
  );
  return { ...actual, sendEmail: vi.fn(async () => {}) };
});

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

import { sendEmail } from "../src/utils/email.js";
import {
  cancelPayment,
  initializeCheckoutForm,
  refundPayment,
  retrieveCheckoutForm,
} from "../src/utils/iyzico.js";
import { settleBookingEmails } from "../src/modules/bookings/bookings.notifications.js";

const sendMock = vi.mocked(sendEmail);
const initMock = vi.mocked(initializeCheckoutForm);
const retrieveMock = vi.mocked(retrieveCheckoutForm);
const cancelMock = vi.mocked(cancelPayment);
const refundMock = vi.mocked(refundPayment);

const app = getApp();

/** Lets queued emails from earlier steps send, then forgets them. */
async function resetMails() {
  await settleBookingEmails();
  sendMock.mockClear();
}

/** Booking emails sent to `email`, settled first. Auth emails are ignored. */
async function mailsTo(email: string) {
  await settleBookingEmails();
  return sendMock.mock.calls
    .map(([args]) => args)
    .filter((m) => m.to === email && !/doğrulama|Şifre/.test(m.subject));
}

async function setupBooking() {
  const { customer, professional } = await registerPair(app);
  await markVerified(professional.user.id);
  const created = await request(app)
    .post("/api/bookings")
    .set("Authorization", `Bearer ${customer.token}`)
    .send({
      professionalId: professional.user.id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString(),
      address: "Bağdat Caddesi No:42, Kadıköy",
      description: "Mutfak lavabosu <b>sızdırıyor</b>.",
    })
    .expect(201);
  return { customer, professional, bookingId: created.body.item.id as string };
}

async function quote(token: string, bookingId: string, priceCents: number) {
  await request(app)
    .patch(`/api/bookings/${bookingId}/quote`)
    .set("Authorization", `Bearer ${token}`)
    .send({ priceCents })
    .expect(200);
}

async function confirm(token: string, bookingId: string) {
  await request(app)
    .patch(`/api/bookings/${bookingId}/confirm`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
}

async function pay(customerToken: string, bookingId: string) {
  const token = `tok-${Math.random()}`;
  initMock.mockResolvedValueOnce({ status: "success", token, paymentPageUrl: "https://x" });
  await request(app)
    .post(`/api/payments/checkout/${bookingId}`)
    .set("Authorization", `Bearer ${customerToken}`)
    .expect(201);
  retrieveMock.mockImplementationOnce(async (_token, conversationId) => ({
    status: "success",
    paymentStatus: "SUCCESS",
    conversationId,
    paymentId: "iyz-pay-1",
    price: "250.00",
    paidPrice: "250.00",
    currency: "TRY",
    itemTransactions: [{ paymentTransactionId: "iyz-tx-1" }],
  }));
  await request(app).post("/api/payments/callback").type("form").send({ token }).expect(303);
}

describe("booking emails", () => {
  beforeEach(async () => {
    await resetDb();
    sendMock.mockReset();
    sendMock.mockImplementation(async () => {});
    initMock.mockReset();
    retrieveMock.mockReset();
    cancelMock.mockReset();
    refundMock.mockReset();
  });
  afterAll(closeDb);

  it("a new request emails the professional, with the customer's description", async () => {
    const { customer, professional } = await setupBooking();

    const toPro = await mailsTo(professional.user.email);
    expect(toPro).toHaveLength(1);
    expect(toPro[0]!.subject).toContain("Yeni hizmet talebi");
    expect(toPro[0]!.text).toContain("Mutfak lavabosu");
    expect(toPro[0]!.text).toContain("/dashboard?tab=incoming");
    expect(await mailsTo(customer.user.email)).toHaveLength(0);
  });

  it("a quote emails the customer the price; re-sending the same price doesn't", async () => {
    const { customer, professional, bookingId } = await setupBooking();

    await quote(professional.token, bookingId, 25_000);
    await quote(professional.token, bookingId, 25_000);

    const toCustomer = await mailsTo(customer.user.email);
    expect(toCustomer).toHaveLength(1);
    expect(toCustomer[0]!.subject).toContain("Fiyat teklifi");
    expect(toCustomer[0]!.text).toContain("₺250,00");
    // Not confirmed yet, so the email mustn't send them to pay.
    expect(toCustomer[0]!.text).toContain("onayladığında");

    await quote(professional.token, bookingId, 30_000);
    expect(await mailsTo(customer.user.email)).toHaveLength(2);
  });

  it("confirming emails the customer once, even if confirmed twice", async () => {
    const { customer, professional, bookingId } = await setupBooking();
    await quote(professional.token, bookingId, 25_000);
    await resetMails();

    await confirm(professional.token, bookingId);
    await confirm(professional.token, bookingId);

    const toCustomer = await mailsTo(customer.user.email);
    expect(toCustomer).toHaveLength(1);
    expect(toCustomer[0]!.subject).toContain("onaylandı");
    expect(toCustomer[0]!.text).toContain("Ödemeyi şimdi yapabilirsin");
  });

  it("a successful payment emails both sides", async () => {
    const { customer, professional, bookingId } = await setupBooking();
    await quote(professional.token, bookingId, 25_000);
    await confirm(professional.token, bookingId);
    await resetMails();

    await pay(customer.token, bookingId);

    const toCustomer = await mailsTo(customer.user.email);
    const toPro = await mailsTo(professional.user.email);
    expect(toCustomer.map((m) => m.subject)).toEqual(["UzmanBaba — Ödemen alındı"]);
    expect(toPro.map((m) => m.subject)).toEqual(["UzmanBaba — Ödeme alındı"]);
    expect(toCustomer[0]!.text).toContain("₺250,00");
  });

  it("a customer's cancel emails only the professional", async () => {
    const { customer, professional, bookingId } = await setupBooking();
    await resetMails();

    await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set("Authorization", `Bearer ${customer.token}`)
      .expect(200);

    const toPro = await mailsTo(professional.user.email);
    expect(toPro).toHaveLength(1);
    expect(toPro[0]!.subject).toContain("iptal");
    expect(await mailsTo(customer.user.email)).toHaveLength(0);
  });

  it("a professional cancelling a paid booking tells the customer, then confirms the refund", async () => {
    const { customer, professional, bookingId } = await setupBooking();
    await quote(professional.token, bookingId, 25_000);
    await confirm(professional.token, bookingId);
    await pay(customer.token, bookingId);
    cancelMock.mockResolvedValueOnce({ status: "success" });
    await resetMails();

    await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set("Authorization", `Bearer ${professional.token}`)
      .expect(200);

    const subjects = (await mailsTo(customer.user.email)).map((m) => m.subject);
    expect(subjects).toEqual([
      "UzmanBaba — Rezervasyonun iptal edildi",
      "UzmanBaba — Ödemen iade edildi",
    ]);
    expect(await mailsTo(professional.user.email)).toHaveLength(0);
  });

  it("no refund email when iyzico refuses the refund", async () => {
    const { customer, professional, bookingId } = await setupBooking();
    await quote(professional.token, bookingId, 25_000);
    await confirm(professional.token, bookingId);
    await pay(customer.token, bookingId);
    cancelMock.mockResolvedValueOnce({ status: "failure", errorCode: "x" });
    refundMock.mockResolvedValueOnce({ status: "failure", errorCode: "y" });
    await resetMails();

    await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set("Authorization", `Bearer ${professional.token}`)
      .expect(200);

    const subjects = (await mailsTo(customer.user.email)).map((m) => m.subject);
    expect(subjects).toEqual(["UzmanBaba — Rezervasyonun iptal edildi"]);
  });

  it("respects notifyEmail = false", async () => {
    const { customer, professional, bookingId } = await setupBooking();
    await prisma.user.updateMany({
      where: { id: { in: [customer.user.id, professional.user.id] } },
      data: { notifyEmail: false },
    });
    await resetMails();

    await quote(professional.token, bookingId, 25_000);
    await confirm(professional.token, bookingId);
    await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set("Authorization", `Bearer ${customer.token}`)
      .expect(200);

    expect(await mailsTo(customer.user.email)).toHaveLength(0);
    expect(await mailsTo(professional.user.email)).toHaveLength(0);
  });

  it("a broken mail server never fails the booking action", async () => {
    const { customer, professional } = await registerPair(app);
    await markVerified(professional.user.id);
    sendMock.mockRejectedValue(new Error("SMTP down"));

    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        professionalId: professional.user.id,
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
        address: "Adres",
        description: "Açıklama yeterince uzun bir metin.",
      })
      .expect(201);
    await settleBookingEmails();
    expect(sendMock).toHaveBeenCalled();
  });
});
