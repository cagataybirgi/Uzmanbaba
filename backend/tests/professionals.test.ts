import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../src/prisma.js";
import { closeDb, getApp, register, resetDb, markVerified } from "./helpers.js";

const app = getApp();

/**
 * Seeds three professionals + one customer (the customer shouldn't show up
 * in the professionals listing). Returns their ids so tests can target them.
 */
async function seedPros() {
  const ahmet = await register(app, {
    email: `pro-ahmet-${Date.now()}@uzmanbaba.test`,
    name: "Ahmet Yılmaz",
    accountType: "professional",
    specialty: "Tesisatçı",
    city: "Ankara",
  });
  const elif = await register(app, {
    email: `pro-elif-${Date.now()}@uzmanbaba.test`,
    name: "Elif Kaya",
    accountType: "professional",
    specialty: "Temizlik Uzmanı",
    city: "İstanbul",
  });
  const mehmet = await register(app, {
    email: `pro-mehmet-${Date.now()}@uzmanbaba.test`,
    name: "Mehmet Demir",
    accountType: "professional",
    specialty: "Elektrikçi",
    city: "İzmir",
  });
  const customer = await register(app, {
    email: `cust-${Date.now()}@uzmanbaba.test`,
    accountType: "customer",
  });

  // Listing endpoint only surfaces verified professionals. Patch the DB
  // directly (registering already creates them, just unverified).
  await Promise.all([
    markVerified(ahmet.user.id),
    markVerified(elif.user.id),
    markVerified(mehmet.user.id),
  ]);

  // Give them distinct ratings so the "rating" sort is meaningful.
  await prisma.user.update({ where: { id: ahmet.user.id },  data: { rating: 4.9, reviewsCount: 200, completedJobs: 12 } });
  await prisma.user.update({ where: { id: elif.user.id },   data: { rating: 4.7, reviewsCount: 150, completedJobs: 7 } });
  await prisma.user.update({ where: { id: mehmet.user.id }, data: { rating: 4.5, reviewsCount: 100, completedJobs: 3, available: false } });

  return { ahmet, elif, mehmet, customer };
}

describe("professionals", () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  it("lists verified professionals, excluding customers", async () => {
    await seedPros();
    const res = await request(app).get("/api/professionals").expect(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items.every((p: { name: string }) => p.name !== "Test User")).toBe(true);
  });

  it("filters by city via case-insensitive prefix", async () => {
    await seedPros();
    const res = await request(app)
      .get("/api/professionals?city=ankara")
      .expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].location).toMatch(/^Ankara/);
  });

  it("searches name + specialty (q parameter)", async () => {
    await seedPros();
    const res = await request(app)
      .get("/api/professionals?q=temizlik")
      .expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].title).toMatch(/Temizlik/);
  });

  it("sorts by rating descending by default", async () => {
    await seedPros();
    const res = await request(app).get("/api/professionals").expect(200);
    const ratings = res.body.items.map((p: { rating: number }) => p.rating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });

  it("availability sort surfaces available pros first", async () => {
    await seedPros();
    const res = await request(app)
      .get("/api/professionals?sort=availability")
      .expect(200);
    const flags = res.body.items.map((p: { available: boolean }) => p.available);
    expect(flags).toEqual([true, true, false]); // mehmet is unavailable
  });

  it("featured returns up to N highest-rated available pros", async () => {
    await seedPros();
    const res = await request(app)
      .get("/api/professionals/featured?limit=2")
      .expect(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.items[0].rating).toBeGreaterThanOrEqual(res.body.items[1].rating);
  });

  it("returns factual public platform statistics", async () => {
    await seedPros();
    const res = await request(app)
      .get("/api/professionals/stats")
      .expect(200);

    expect(res.body.stats.emailVerifiedProfessionals).toBe(3);
    expect(res.body.stats.citiesServed).toBe(3);
    expect(res.body.stats.averageRating).toBeCloseTo(4.7, 5);
    expect(res.body.stats.completedJobs).toBe(22);
  });

  it("detail endpoint returns the professional with detail fields", async () => {
    const { ahmet } = await seedPros();
    const res = await request(app)
      .get(`/api/professionals/${ahmet.user.id}`)
      .expect(200);
    expect(res.body.item.id).toBe(ahmet.user.id);
    expect(res.body.item.name).toBe("Ahmet Yılmaz");
    // Detail-page fields added to ProfessionalDto.
    expect(res.body.item).toHaveProperty("bio");
    expect(res.body.item.completedJobs).toBe(0);
    // joinDate is "Ay YYYY" in Turkish (e.g. "Haziran 2026").
    expect(res.body.item.joinDate).toMatch(/^\p{L}+ \d{4}$/u);
  });

  it("public reviews listing 404s for a non-professional id", async () => {
    const { customer } = await seedPros();
    await request(app)
      .get(`/api/professionals/${customer.user.id}/reviews`)
      .expect(404);
  });

  it("detail 404s for an unknown id", async () => {
    await request(app)
      .get("/api/professionals/00000000-0000-0000-0000-000000000000")
      .expect(404);
  });
});
