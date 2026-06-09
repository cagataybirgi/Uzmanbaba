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
