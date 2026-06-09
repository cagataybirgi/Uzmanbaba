import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { closeDb, getApp, register, resetDb } from "./helpers.js";

const app = getApp();

describe("auth", () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  it("registers a user and returns a token + user dto", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "newuser@uzmanbaba.test",
        password: "Password123!",
        name: "Yeni Kullanıcı",
        phone: "+90 555 111 22 33",
        accountType: "customer",
      })
      .expect(201);

    expect(res.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT shape
    expect(res.body.user).toMatchObject({
      email: "newuser@uzmanbaba.test",
      name: "Yeni Kullanıcı",
      accountType: "customer",
      emailVerified: false,
      // Notifications default applied server-side
      notifications: { email: true, sms: true, push: false },
    });
    expect(res.body.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("rejects a duplicate email with 409", async () => {
    await register(app, { email: "dup@uzmanbaba.test" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "dup@uzmanbaba.test",
        password: "Password123!",
        name: "Another",
        phone: "+90 555 111 22 33",
        accountType: "customer",
      })
      .expect(409);
    expect(res.body.error.code).toBe("conflict");
  });

  it("validates required fields with 400 + field details", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "bad", password: "x" })
      .expect(400);
    expect(res.body.error.code).toBe("validation_error");
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it("logs in with correct credentials", async () => {
    await register(app, { email: "login@uzmanbaba.test", password: "Sup3rSecret!" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@uzmanbaba.test", password: "Sup3rSecret!" })
      .expect(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("login@uzmanbaba.test");
  });

  it("uses the same error for wrong email and wrong password (no enumeration)", async () => {
    await register(app, { email: "anti-enum@uzmanbaba.test", password: "RightOne123!" });

    const wrongPwd = await request(app)
      .post("/api/auth/login")
      .send({ email: "anti-enum@uzmanbaba.test", password: "Wrong!23456" })
      .expect(401);

    const noUser = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@uzmanbaba.test", password: "Whatever123!" })
      .expect(401);

    expect(wrongPwd.body.error).toEqual(noUser.body.error);
    expect(wrongPwd.body.error.code).toBe("invalid_credentials");
  });

  it("rejects unauthenticated /auth/me", async () => {
    const res = await request(app).get("/api/auth/me").expect(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("returns the current user for an authenticated /auth/me", async () => {
    const { token, user } = await register(app, {
      email: "me@uzmanbaba.test",
      name: "Me Mine",
    });
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user.email).toBe("me@uzmanbaba.test");
  });
});
