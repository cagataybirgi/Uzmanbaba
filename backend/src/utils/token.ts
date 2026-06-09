import { createHash, randomBytes, randomInt } from "node:crypto";

/**
 * Generates a 6-digit numeric verification code. Uses randomInt so the
 * distribution is uniform (Math.random doesn't guarantee this).
 */
export function generateNumericCode(length = 6): string {
  const max = 10 ** length;
  return randomInt(0, max).toString().padStart(length, "0");
}

/**
 * Returns a high-entropy, URL-safe token plus its SHA-256 hash. Email the
 * token; store the hash. Compare by hashing the incoming token — the raw
 * token never has to be stored, so a DB leak can't be replayed.
 */
export function generateOpaqueToken(bytes = 32): { token: string; hash: string } {
  const token = randomBytes(bytes).toString("base64url");
  const hash = sha256(token);
  return { token, hash };
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
