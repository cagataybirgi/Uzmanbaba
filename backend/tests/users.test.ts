import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/prisma.js";
import { UPLOADS_ROOT } from "../src/utils/upload.js";
import {
  closeDb,
  getApp,
  register,
  registerPair,
  resetDb,
  markVerified,
} from "./helpers.js";

const app = getApp();

function futureISO(daysAhead = 2): string {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60_000).toISOString();
}

/** Drives a booking all the way to `completed` so it can be reviewed. */
async function completedBooking(customerToken: string, proToken: string, proId: string) {
  const created = await request(app)
    .post("/api/bookings")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({
      professionalId: proId,
      scheduledAt: futureISO(),
      address: "Test Mah. 1. Sok. No:5",
      description: "Değerlendirme için tamamlanacak iş.",
    })
    .expect(201);
  const bookingId = created.body.item.id;
  await request(app)
    .patch(`/api/bookings/${bookingId}/complete`)
    .set("Authorization", `Bearer ${proToken}`)
    .expect(200);
  return bookingId;
}

describe("users: avatar upload validation", () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  const PNG_1x1 = Buffer.from(
    "89504e470d0a1a0a0000000d494844520000000100000001080600000" +
      "01f15c4890000000a49444154789c6360000002000154a24f5f0000000049454e44ae426082",
    "hex",
  );

  it("accepts a real PNG and stores it", async () => {
    const { token } = await register(app, { email: "avatar-ok@uzmanbaba.test" });
    const res = await request(app)
      .post("/api/users/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", PNG_1x1, { filename: "me.png", contentType: "image/png" })
      .expect(200);
    expect(res.body.user.avatar).toContain("/uploads/avatars/");
  });

  it("rejects a spoofed file: image/png MIME but non-image bytes", async () => {
    const { token } = await register(app, { email: "avatar-spoof@uzmanbaba.test" });
    const evil = Buffer.from("#!/bin/sh\nrm -rf /\n", "utf8");
    const res = await request(app)
      .post("/api/users/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", evil, { filename: "evil.png", contentType: "image/png" })
      .expect(400);
    expect(res.body.error.code).toBe("invalid_file_content");

    // And nothing was left on disk for this user.
    const dir = path.join(UPLOADS_ROOT, "avatars");
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    // The rejected upload was unlinked; the accepted-PNG test writes its own,
    // so we can't assert 0 globally — assert none contain the evil payload.
    for (const f of files) {
      const content = fs.readFileSync(path.join(dir, f));
      expect(content.includes(Buffer.from("rm -rf"))).toBe(false);
    }
  });
});

describe("users: account deletion cleanup", () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  it("recomputes a professional's rating when a reviewer deletes their account", async () => {
    // Two customers review the same professional (5 and 1) → avg 3.
    const { customer: c1, professional } = await registerPair(app);
    await markVerified(professional.user.id);
    const c2 = await register(app, { email: `c2-${Date.now()}@uzmanbaba.test` });

    const b1 = await completedBooking(c1.token, professional.token, professional.user.id);
    const b2 = await completedBooking(c2.token, professional.token, professional.user.id);

    await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${c1.token}`)
      .send({ bookingId: b1, rating: 5 })
      .expect(201);
    await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${c2.token}`)
      .send({ bookingId: b2, rating: 1 })
      .expect(201);

    let pro = await prisma.user.findUnique({ where: { id: professional.user.id } });
    expect(pro?.rating).toBe(3);
    expect(pro?.reviewsCount).toBe(2);

    // c1 (the 5-star reviewer) deletes their account → their review cascades.
    await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${c1.token}`)
      .send({ password: "Password123!" })
      .expect(204);

    // Rating must be recomputed to just the surviving 1-star review.
    pro = await prisma.user.findUnique({ where: { id: professional.user.id } });
    expect(pro?.rating).toBe(1);
    expect(pro?.reviewsCount).toBe(1);
  });

  it("deletes the uploaded avatar file from disk on account deletion", async () => {
    const { token } = await register(app, { email: "del-avatar@uzmanbaba.test" });
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d494844520000000100000001080600000" +
        "01f15c4890000000a49444154789c6360000002000154a24f5f0000000049454e44ae426082",
      "hex",
    );
    const up = await request(app)
      .post("/api/users/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", png, { filename: "me.png", contentType: "image/png" })
      .expect(200);

    const rel: string = up.body.user.avatar.replace(/^https?:\/\/[^/]+/, "");
    const abs = path.join(UPLOADS_ROOT, rel.replace(/^\/uploads\//, ""));
    expect(fs.existsSync(abs)).toBe(true);

    await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "Password123!" })
      .expect(204);

    expect(fs.existsSync(abs)).toBe(false);
  });
});
