import request, { type Response } from "supertest";
import type { Express } from "express";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";

/**
 * Singleton app instance for tests. supertest will wrap it in a one-off
 * server per request — no `listen()` needed, no port to manage.
 */
let cachedApp: Express | null = null;
export function getApp(): Express {
  if (!cachedApp) cachedApp = buildApp();
  return cachedApp;
}

/**
 * Truncates every table the app writes to. Called from `beforeEach` to give
 * each test a clean slate without paying the cost of dropping and re-creating
 * the schema. Identity sequences are restarted so any int-PK columns get
 * predictable values.
 */
export async function resetDb(): Promise<void> {
  // Order matters because of FK cascades — Review → Booking → User, etc.
  // Using TRUNCATE ... CASCADE skips dependency-ordering hassle and is the
  // fastest path in Postgres.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
       "Review",
       "Booking",
       "PasswordReset",
       "EmailVerification",
       "User"
     RESTART IDENTITY CASCADE`,
  );
}

export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
}

/* ─── auth helpers ──────────────────────────────────────────────────────── */

interface RegisterArgs {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  accountType?: "customer" | "professional";
  specialty?: string;
  city?: string;
}

interface RegisteredUser {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    accountType: "customer" | "professional";
  };
}

/**
 * Registers a user via the public endpoint and returns the token. Defaults
 * are fine for "I just need an authenticated request"; override fields when
 * a specific test cares about a particular shape.
 */
export async function register(
  app: Express,
  overrides: RegisterArgs = {},
): Promise<RegisteredUser> {
  const payload = {
    email: overrides.email ?? `user-${Date.now()}-${Math.random()}@uzmanbaba.test`,
    password: overrides.password ?? "Password123!",
    name: overrides.name ?? "Test User",
    phone: overrides.phone ?? "+90 555 000 11 22",
    accountType: overrides.accountType ?? "customer",
    specialty: overrides.specialty,
    city: overrides.city,
  };
  const res: Response = await request(app)
    .post("/api/auth/register")
    .send(payload)
    .expect(201);
  return res.body as RegisteredUser;
}

/**
 * Convenience: register a customer + register a professional, return both.
 * Used by the booking lifecycle tests where you need two users.
 */
export async function registerPair(app: Express) {
  const customer = await register(app, {
    email: `customer-${Date.now()}-${Math.random()}@uzmanbaba.test`,
    accountType: "customer",
  });
  const professional = await register(app, {
    email: `pro-${Date.now()}-${Math.random()}@uzmanbaba.test`,
    accountType: "professional",
    specialty: "Test Uzmanı",
    city: "Ankara",
  });
  return { customer, professional };
}

/** Sets the email-verified flag directly (the verify endpoint requires a code). */
export async function markVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });
}
