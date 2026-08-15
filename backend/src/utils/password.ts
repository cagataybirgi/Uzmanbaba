import bcrypt from "bcrypt";

// 12 rounds ≈ 250ms on a modern CPU. Strong enough for credential storage
// without making login painfully slow.
const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A fixed valid bcrypt hash (cost 12) used to equalize timing on the login
 * "user not found" branch. Comparing a submitted password against it costs
 * the same as a real check, so response time can't reveal whether an email
 * is registered. The plaintext behind it is irrelevant — it never matches a
 * real credential. Computed once at import (~250ms, one-time startup cost).
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  "uzmanbaba-timing-equalizer-not-a-real-password",
  ROUNDS,
);
