import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config.js";
import { AppError } from "../errors.js";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  // Token version at signing time. Compared against User.tokenVersion in
  // requireAuth; a mismatch means the password changed (or sessions were
  // revoked) after this token was issued. Optional for backward compat
  // with tokens signed before the field existed — treated as 0.
  ver?: number;
}

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: config.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, config.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof (decoded as JwtPayload).sub !== "string" ||
      typeof (decoded as JwtPayload).email !== "string"
    ) {
      throw AppError.unauthorized("Geçersiz oturum.");
    }
    return decoded as JwtPayload;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
    }
    throw AppError.unauthorized("Geçersiz oturum.");
  }
}
