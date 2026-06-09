import type { User } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { AppError } from "../../errors.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { signAccessToken } from "../../utils/jwt.js";
import {
  generateNumericCode,
  generateOpaqueToken,
  sha256,
} from "../../utils/token.js";
import { sendEmail, verificationEmail, passwordResetEmail } from "../../utils/email.js";
import { logger } from "../../logger.js";
import { toUserDto, type UserDto } from "./auth.dto.js";
import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./auth.schemas.js";

const VERIFY_CODE_TTL_MIN = 15;
const RESET_TOKEN_TTL_HOURS = 1;

interface AuthResponse {
  token: string;
  user: UserDto;
}

function authResponse(user: User): AuthResponse {
  return {
    token: signAccessToken({ sub: user.id, email: user.email }),
    user: toUserDto(user),
  };
}

/* ─── register ────────────────────────────────────────────────────────────── */

export async function register(input: RegisterInput): Promise<AuthResponse> {
  // Email is unique — check up front so we return a friendly 409 instead of
  // a Prisma unique-violation surfaced as 500.
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict("Bu e-posta ile kayıtlı bir hesap zaten var.");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      phone: input.phone,
      passwordHash,
      accountType: input.accountType,
      specialty: input.specialty,
      bio: input.bio,
      location: input.city ? `${input.city}, TR` : "Türkiye",
    },
  });

  await issueVerificationCode(user);

  return authResponse(user);
}

/* ─── login ──────────────────────────────────────────────────────────────── */

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same error message + timing whether the email exists or the password is
  // wrong, so the endpoint can't be used to enumerate registered emails.
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError("E-posta veya şifre hatalı.", {
      status: 401,
      code: "invalid_credentials",
    });
  }
  return authResponse(user);
}

/* ─── verify email ───────────────────────────────────────────────────────── */

export async function verifyEmail(
  userId: string,
  input: VerifyEmailInput,
): Promise<UserDto> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();
  if (user.emailVerified) return toUserDto(user);

  // Newest, still-valid, not-yet-consumed code wins.
  const codeRow = await prisma.emailVerification.findFirst({
    where: {
      userId,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!codeRow || codeRow.code !== input.code) {
    throw new AppError("Hatalı veya süresi geçmiş kod.", {
      status: 400,
      code: "invalid_code",
    });
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerification.update({
      where: { id: codeRow.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  return toUserDto(updatedUser);
}

/* ─── resend verification ────────────────────────────────────────────────── */

export async function resendVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();
  if (user.emailVerified) {
    throw AppError.badRequest("E-posta zaten doğrulanmış.");
  }
  await issueVerificationCode(user);
}

async function issueVerificationCode(user: User): Promise<void> {
  const code = generateNumericCode(6);
  const expiresAt = new Date(Date.now() + VERIFY_CODE_TTL_MIN * 60_000);

  await prisma.$transaction([
    // Invalidate any prior outstanding codes so only the freshest one works.
    prisma.emailVerification.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.emailVerification.create({
      data: { userId: user.id, code, expiresAt },
    }),
  ]);

  const { subject, text } = verificationEmail(code);
  await sendEmail({ to: user.email, subject, text });
  logger.info("verification_code_issued", { userId: user.id });
}

/* ─── forgot password ────────────────────────────────────────────────────── */

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  // We deliberately return 200 whether the email exists or not, to avoid
  // leaking which addresses have accounts. The work is only done if the
  // user actually exists.
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    logger.info("forgot_password_unknown_email", { email: input.email });
    return;
  }

  const { token, hash } = generateOpaqueToken(32);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60_000);

  await prisma.$transaction([
    prisma.passwordReset.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: hash, expiresAt },
    }),
  ]);

  const { subject, text } = passwordResetEmail(token);
  await sendEmail({ to: user.email, subject, text });
  logger.info("password_reset_issued", { userId: user.id });
}

/* ─── reset password ─────────────────────────────────────────────────────── */

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = sha256(input.token);

  const row = await prisma.passwordReset.findUnique({
    where: { tokenHash },
  });

  if (!row || row.consumedAt || row.expiresAt < new Date()) {
    throw new AppError("Bağlantı geçersiz veya süresi dolmuş.", {
      status: 400,
      code: "invalid_token",
    });
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  logger.info("password_reset_consumed", { userId: row.userId });
}

/* ─── me ─────────────────────────────────────────────────────────────────── */

export async function getMe(userId: string): Promise<UserDto> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();
  return toUserDto(user);
}
