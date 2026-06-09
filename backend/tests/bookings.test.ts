import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../src/prisma.js";
import { closeDb, getApp, registerPair, resetDb, markVerified } from "./helpers.js";

const app = getApp();

/** A scheduled-at far enough in the future that the time-validation refine passes. */
function futureISO(daysAhead = 2): string {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60_000).toISOString();
}

async function setup() {
  const { customer, professional } = await registerPair(app);
  await markVerified(professional.user.id);
  return { customer, professional };
}

describe("bookings", () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  it("creates a booking and counts toward customer's pendingJobs", async () => {
    const { customer, professional } = await setup();

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        professionalId: professional.user.id,
        scheduledAt: futureISO(),
        address: "Bağdat Caddesi No:42",
        description: "Mutfak lavabosu sızdırıyor.",
      })
      .expect(201);

    expect(res.body.item).toMatchObject({
      status: "pending",
      professional: { id: professional.user.id },
      customer: { id: customer.user.id },
      review: null,
    });

    const dbCustomer = await prisma.user.findUnique({
      where: { id: customer.user.id },
    });
    expect(dbCustomer?.pendingJobs).toBe(1);
  });

  it("rejects booking yourself", async () => {
    const { customer } = await setup();
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        professionalId: customer.user.id,
        scheduledAt: futureISO(),
        address: "x",
        description: "yyyyy",
      })
      .expect(400);
    expect(res.body.error.code).toBe("bad_request");
  });

  it("requires auth", async () => {
    await request(app)
      .post("/api/bookings")
      .send({
        professionalId: "00000000-0000-0000-0000-000000000000",
        scheduledAt: futureISO(),
        address: "x",
        description: "yyyyy",
      })
      .expect(401);
  });

  it("lists current user's bookings (customer side)", async () => {
    const { customer, professional } = await setup();
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        professionalId: professional.user.id,
        scheduledAt: futureISO(),
        address: "x",
        description: "Lavabo akmıyor.",
      })
      .expect(201);

    const res = await request(app)
      .get("/api/bookings/me")
      .set("Authorization", `Bearer ${customer.token}`)
      .expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].customer.id).toBe(customer.user.id);
  });

  it("end-to-end lifecycle: confirm → complete → review updates pro's rating", async () => {
    const { customer, professional } = await setup();

    // 1. Customer creates the booking.
    const created = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        professionalId: professional.user.id,
        scheduledAt: futureISO(),
        address: "x",
        description: "Çamaşır makinesi kurulumu.",
      })
      .expect(201);
    const bookingId = created.body.item.id;

    // 2. Professional confirms.
    const confirmed = await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .set("Authorization", `Bearer ${professional.token}`)
      .expect(200);
    expect(confirmed.body.item.status).toBe("confirmed");

    // 3. Customer can't confirm their own booking.
    await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .set("Authorization", `Bearer ${customer.token}`)
      .expect(403);

    // 4. Professional completes.
    const done = await request(app)
      .patch(`/api/bookings/${bookingId}/complete`)
      .set("Authorization", `Bearer ${professional.token}`)
      .expect(200);
    expect(done.body.item.status).toBe("completed");

    // Counter housekeeping.
    const cust = await prisma.user.findUnique({ where: { id: customer.user.id } });
    const pro = await prisma.user.findUnique({ where: { id: professional.user.id } });
    expect(cust?.pendingJobs).toBe(0);
    expect(cust?.completedJobs).toBe(1);
    expect(pro?.completedJobs).toBe(1);

    // 5. Customer leaves a review.
    const reviewed = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ bookingId, rating: 5, comment: "Çok hızlıydı." })
      .expect(201);
    expect(reviewed.body.item.rating).toBe(5);

    // 6. Listing the booking again shows the embedded review (no extra fetch).
    const listed = await request(app)
      .get("/api/bookings/me")
      .set("Authorization", `Bearer ${customer.token}`)
      .expect(200);
    expect(listed.body.items[0].review).toMatchObject({ rating: 5 });

    // 7. Professional's aggregates recomputed.
    const afterPro = await prisma.user.findUnique({ where: { id: professional.user.id } });
    expect(afterPro?.rating).toBe(5);
    expect(afterPro?.reviewsCount).toBe(1);

    // 8. Second review on the same booking → 409.
    await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ bookingId, rating: 4 })
      .expect(409);
  });

  it("cancel is open to either party + decrements pendingJobs", async () => {
    const { customer, professional } = await setup();
    const created = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        professionalId: professional.user.id,
        scheduledAt: futureISO(),
        address: "x",
        description: "Klima bakımı.",
      })
      .expect(201);
    const bookingId = created.body.item.id;

    // Professional cancels.
    const cancelled = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set("Authorization", `Bearer ${professional.token}`)
      .expect(200);
    expect(cancelled.body.item.status).toBe("cancelled");

    const cust = await prisma.user.findUnique({ where: { id: customer.user.id } });
    expect(cust?.pendingJobs).toBe(0);
  });

  it("professional listing only shows the pro's incoming requests", async () => {
    const { customer, professional } = await setup();
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        professionalId: professional.user.id,
        scheduledAt: futureISO(),
        address: "x",
        description: "Boya badana.",
      })
      .expect(201);

    const pro = await request(app)
      .get("/api/bookings/professional/me")
      .set("Authorization", `Bearer ${professional.token}`)
      .expect(200);
    expect(pro.body.total).toBe(1);
    expect(pro.body.items[0].professional.id).toBe(professional.user.id);

    // Customer's pro-listing is empty (they aren't a pro).
    const cust = await request(app)
      .get("/api/bookings/professional/me")
      .set("Authorization", `Bearer ${customer.token}`)
      .expect(200);
    expect(cust.body.total).toBe(0);
  });
});
