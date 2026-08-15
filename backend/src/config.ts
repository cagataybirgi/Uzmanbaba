import "dotenv/config";
import { z } from "zod";

/**
 * Strongly-typed environment loader.
 *
 * Parses `process.env` once at startup. If a required variable is missing or
 * malformed the process exits with a readable error — far better than
 * crashing later with an `undefined` somewhere deep in a request handler.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  PUBLIC_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:4000")
    // Strip trailing slashes so concatenation produces a single `/`.
    .transform((s) => s.replace(/\/+$/, "")),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters (use a long random string)"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Number of reverse-proxy hops to trust for req.ip (Express "trust proxy").
  // Default 0 = trust nobody, so a direct-exposure deploy can't be tricked by
  // a spoofed X-Forwarded-For into defeating per-IP rate limiting. Set to 1
  // (or the real hop count) when running behind Nginx/fly.io/etc.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("UzmanBaba <no-reply@uzmanbaba.com>"),

  APP_URL: z.string().url().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Print every issue, not just the first, so misconfigured envs surface
  // in one go rather than one fix-and-restart cycle at a time.
  console.error("[config] Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  isDev: parsed.data.NODE_ENV === "development",
  corsOrigins: parsed.data.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

export type Config = typeof config;
