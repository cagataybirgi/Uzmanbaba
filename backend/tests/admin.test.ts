import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { PaymentStatus } from "@prisma/client";
import { prisma } from "../src/prisma.js";
import { closeDb, getApp, markVerified, register, registerPair, resetDb } from "./helpers.js";

/**
 * Only the two reversal calls are reached from the admin routes (through
 * PaymentRefunder). Payments are written straight to the table so these
 * tests don't depend on the checkout flow — payments.test.ts covers that.
 */
vi.mock("../src/utils/iyzico.js", async () => {
  const actual = await vi.importActual<typeof import("../src/utils/iyzico.js")>(
    "../src/utils/iyzico.js",
  );
  return {
    ...actual,
    paymentsConfigured: () => true,
    cancelPayment: vi.fn(),
    refundPayment: vi.fn(),
  };
});

import { cancelPayment, refundPayment } from "../src/utils/iyzico.js";

const cancelMock = vi.mocked(cancelPayment);
const refundMock = vi.mocked(refundPayment);

const app = getApp();

async function registerAdmin() {
  const admin = await register(app, {
    email: `admin-${Date.now()}-${Math.random()}@uzmanbaba.test`,
    name: "Yönetici",
  });
  await prisma.user.update({ where: { id: admin.user.id }, data: { isAdmin: true } });
  return admin;
}

/** A booking from a fresh customer to a fresh professional, made through the API. */
async function createBooking() {
  const { customer, professional } = await registerPair(app);
  await markVerified(professional.user.id);
  const res = await request(app)
    .post("/api/bookings")
    .set("Authorization", `Bearer ${customer.token}`)
    .send({
      professionalId: professional.user.id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString(),
      address: "Bağdat Caddesi No:42, Kadıköy",
      description: "Mutfak lavabosu sızdırıyor.",
    })
    .expect(201);
  return { customer, professional, bookingId: res.body.item.id as string };
}

/**
 * Puts a charged payment on a booking in the given state. `minutesAgo`
 * backdates updatedAt, which is how a `refunding` row becomes "stuck".
 */
async function seedPayment(
  bookingId: string,
  opts: { status: PaymentStatus; bookingCancelled?: boolean; minutesAgo?: number },
) {
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      priceCents: 25_000,
      paidAt: new Date(),
      ...(opts.bookingCancelled
        ? { status: "cancelled", cancelledBy: "customer", cancelledAt: new Date() }
        : { status: "confirmed" }),
    },
  });
  const payment = await prisma.payment.create({
    data: {
      bookingId,
      status: opts.status,
      amountCents: 25_000,
      providerPaymentId: "iyz-pay-123",
      providerTransactionId: "iyz-tx-456",
      paidAt: new Date(),
      rawResult: { status: "success", paymentId: "iyz-pay-123" },
    },
  });
  if (opts.minutesAgo) {
    await prisma.$executeRaw`
      UPDATE "Payment"
         SET "updatedAt" = now() - make_interval(mins => ${opts.minutesAgo}::int)
       WHERE id = ${payment.id}::uuid`;
  }
  return payment.id;
}

function resolve(token: string, paymentId: string, body: Record<string, unknown>) {
  return request(app)
    .post(`/api/admin/payments/${paymentId}/resolve`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

describe("admin", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("access", () => {
    it("rejects anonymous requests", async () => {
      await request(app).get("/api/admin/users").expect(401);
    });

    it("rejects signed-in users who are not admins", async () => {
      const user = await register(app);
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${user.token}`)
        .expect(403);
      expect(res.body.error.code).toBe("forbidden");
    });

    it("revoking admin takes effect on the very next request", async () => {
      const admin = await registerAdmin();
      await request(app)
        .get("/api/admin/summary")
        .set("Authorization", `Bearer ${admin.token}`)
        .expect(200);

      await prisma.user.update({ where: { id: admin.user.id }, data: { isAdmin: false } });
      await request(app)
        .get("/api/admin/summary")
        .set("Authorization", `Bearer ${admin.token}`)
        .expect(403);
    });

    it("exposes isAdmin on the signed-in user, and the API can't set it", async () => {
      const admin = await registerAdmin();
      const me = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${admin.token}`)
        .expect(200);
      expect(me.body.user.isAdmin).toBe(true);

      const user = await register(app);
      expect(user.user).toMatchObject({ isAdmin: false });
      await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ name: "Yeni Ad", isAdmin: true })
        .expect(200);
      const row = await prisma.user.findUniqueOrThrow({ where: { id: user.user.id } });
      expect(row.isAdmin).toBe(false);
    });
  });

  describe("lists", () => {
    it("lists users with search, type filter and booking counts", async () => {
      const admin = await registerAdmin();
      const { customer, professional } = await createBooking();

      const all = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${admin.token}`)
        .expect(200);
      expect(all.body.total).toBe(3);

      const pros = await request(app)
        .get("/api/admin/users")
        .query({ accountType: "professional" })
        .set("Authorization", `Bearer ${admin.token}`)
        .expect(200);
      expect(pros.body.items).toHaveLength(1);
      expect(pros.body.items[0]).toMatchObject({
        id: professional.user.id,
        bookingsCount: 1,
        specialty: "Test Uzmanı",
      });

      const found = await request(app)
        .get("/api/admin/users")
        .query({ q: customer.user.email.slice(0, 12).toUpperCase() })
        .set("Authorization", `Bearer ${admin.token}`)
        .expect(200);
      expect(found.body.items.map((u: { id: string }) => u.id)).toEqual([customer.user.id]);
      // Never leaks credentials.
      expect(found.body.items[0]).not.toHaveProperty("passwordHash");
    });

    it("lists bookings with a status filter and both parties' contact details", async () => {
      const admin = await registerAdmin();
      const { customer, bookingId } = await createBooking();
      await createBooking();
      await prisma.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });

      const res = await request(app)
        .get("/api/admin/bookings")
        .query({ status: "cancelled" })
        .set("Authorization", `Bearer ${admin.token}`)
        .expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0]).toMatchObject({
        id: bookingId,
        status: "cancelled",
        customer: { id: customer.user.id, email: customer.user.email },
      });
    });

    it("the attention list holds stuck refunds and money kept on cancelled bookings, nothing else", async () => {
      const admin = await registerAdmin();
      const stuck = await seedPayment((await createBooking()).bookingId, {
        status: "refunding",
        bookingCancelled: true,
        minutesAgo: 30,
      });
      const held = await seedPayment((await createBooking()).bookingId, {
        status: "succeeded",
        bookingCancelled: true,
      });
      // A normal paid booking and a finished refund: fine, not listed.
      await seedPayment((await createBooking()).bookingId, { status: "succeeded" });
      await seedPayment((await createBooking()).bookingId, {
        status: "refunded",
        bookingCancelled: true,
      });

      const res = await request(app)
        .get("/api/admin/payments")
        .query({ attention: "true" })
        .set("Authorization", `Bearer ${admin.token}`)
        .expect(200);
      expect(res.body.total).toBe(2);
      const byId = Object.fromEntries(
        res.body.items.map((p: { id: string; attention: string }) => [p.id, p.attention]),
      );
      expect(byId).toEqual({ [stuck]: "refund_unknown", [held]: "refund_failed" });
      // Oldest first, so the longest-waiting one is on top.
      expect(res.body.items[0].id).toBe(stuck);

      const everything = await request(app)
        .get("/api/admin/payments")
        .set("Authorization", `Bearer ${admin.token}`)
        .expect(200);
      expect(everything.body.total).toBe(4);

      const summary = await request(app)
        .get("/api/admin/summary")
        .set("Authorization", `Bearer ${admin.token}`)
        .expect(200);
      expect(summary.body.summary).toMatchObject({
        users: { total: 9, professionals: 4 },
        bookings: { pending: 0, confirmed: 1, completed: 0, cancelled: 3 },
        attention: { refund_unknown: 1, refund_failed: 1 },
      });
    });
  });

  describe("resolving payments", () => {
    it("won't touch a refund that may still be in flight", async () => {
      const admin = await registerAdmin();
      const paymentId = await seedPayment((await createBooking()).bookingId, {
        status: "refunding",
        bookingCancelled: true,
      });

      const res = await resolve(admin.token, paymentId, { action: "retry_refund" }).expect(409);
      expect(res.body.error.message).toMatch(/işleniyor/);
      expect(cancelMock).not.toHaveBeenCalled();
      const row = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
      expect(row.status).toBe("refunding");
    });

    it("mark_refunded records a refund the panel shows, without calling iyzico", async () => {
      const admin = await registerAdmin();
      const { customer, bookingId } = await createBooking();
      const paymentId = await seedPayment(bookingId, {
        status: "refunding",
        bookingCancelled: true,
        minutesAgo: 30,
      });

      const res = await resolve(admin.token, paymentId, {
        action: "mark_refunded",
        note: "Panelde iade görünüyor.",
      }).expect(200);
      expect(res.body.item).toMatchObject({ status: "refunded", attention: null });
      expect(res.body.refund).toBeUndefined();
      expect(cancelMock).not.toHaveBeenCalled();
      expect(refundMock).not.toHaveBeenCalled();

      const row = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
      expect(row.refundedAt).toBeInstanceOf(Date);
      expect(row.rawResult).toMatchObject({
        status: "success", // the original iyzico payload is kept
        adminActions: [
          {
            action: "mark_refunded",
            note: "Panelde iade görünüyor.",
            by: admin.user.id,
            fromStatus: "refunding",
          },
        ],
      });

      // The customer's dashboard now shows it as refunded.
      const mine = await request(app)
        .get("/api/bookings/me")
        .set("Authorization", `Bearer ${customer.token}`)
        .expect(200);
      expect(mine.body.items[0].refund).toBe("done");

      // So does the admin's bookings list, instead of a stale "paid".
      const adminList = await request(app)
        .get("/api/admin/bookings")
        .set("Authorization", `Bearer ${admin.token}`)
        .expect(200);
      expect(adminList.body.items[0]).toMatchObject({ id: bookingId, refund: "done" });
    });

    it("retry_refund on a stuck refund sends it again through the refunder", async () => {
      const admin = await registerAdmin();
      const paymentId = await seedPayment((await createBooking()).bookingId, {
        status: "refunding",
        bookingCancelled: true,
        minutesAgo: 30,
      });
      cancelMock.mockResolvedValueOnce({ status: "success", paymentId: "iyz-pay-123" });

      const res = await resolve(admin.token, paymentId, { action: "retry_refund" }).expect(200);
      expect(res.body.refund).toMatchObject({ outcome: "refunded", method: "cancel" });
      expect(res.body.item.status).toBe("refunded");
      expect(cancelMock).toHaveBeenCalledTimes(1);
      expect(cancelMock).toHaveBeenCalledWith("iyz-pay-123", paymentId, undefined);

      const row = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
      // Both the admin decision and the reversal are on record.
      expect(row.rawResult).toMatchObject({
        adminActions: [{ action: "retry_refund", fromStatus: "refunding" }],
        refund: { method: "cancel" },
      });
    });

    it("retry_refund that iyzico refuses again leaves the payment listed, with the error", async () => {
      const admin = await registerAdmin();
      const paymentId = await seedPayment((await createBooking()).bookingId, {
        status: "succeeded",
        bookingCancelled: true,
      });
      cancelMock.mockResolvedValueOnce({ status: "failure", errorCode: "5093" });
      refundMock.mockResolvedValueOnce({
        status: "failure",
        errorCode: "5115",
        errorMessage: "İade edilemez",
      });

      const res = await resolve(admin.token, paymentId, { action: "retry_refund" }).expect(200);
      expect(res.body.refund).toMatchObject({ outcome: "failed", errorCode: "5115" });
      expect(res.body.item).toMatchObject({
        status: "succeeded",
        attention: "refund_failed",
        errorMessage: "İade edilemez",
      });
    });

    it("refuses payments that need nothing", async () => {
      const admin = await registerAdmin();
      const paymentId = await seedPayment((await createBooking()).bookingId, {
        status: "succeeded",
      });

      await resolve(admin.token, paymentId, { action: "mark_refunded" }).expect(409);
      await resolve(admin.token, paymentId, { action: "retry_refund" }).expect(409);
      const row = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
      expect(row.status).toBe("succeeded");
      expect(cancelMock).not.toHaveBeenCalled();
    });

    it("validates the action and the id", async () => {
      const admin = await registerAdmin();
      await resolve(admin.token, "not-a-uuid", { action: "mark_refunded" }).expect(400);
      await resolve(admin.token, "6f1c0d4e-1111-4222-8333-944455556666", {
        action: "mark_refunded",
      }).expect(404);
      const paymentId = await seedPayment((await createBooking()).bookingId, {
        status: "refunding",
        bookingCancelled: true,
        minutesAgo: 30,
      });
      await resolve(admin.token, paymentId, { action: "delete_it" }).expect(400);
    });
  });
});
