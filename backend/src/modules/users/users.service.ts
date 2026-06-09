import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { AppError } from "../../errors.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { deleteLocalUpload, localPathFromAvatarUrl } from "../../utils/upload.js";
import { logger } from "../../logger.js";
import { toUserDto, type UserDto } from "../auth/auth.dto.js";
import type {
  UpdateMeInput,
  ChangePasswordInput,
  DeleteMeInput,
} from "./users.schemas.js";

/* ─── PATCH /users/me ─────────────────────────────────────────────────────── */

export async function updateMe(
  userId: string,
  input: UpdateMeInput,
): Promise<UserDto> {
  // Translate the validated input into a Prisma update payload. We only
  // include keys the client actually sent — `undefined` means "leave alone",
  // `null` (for nullable fields) means "clear".
  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.location !== undefined) data.location = input.location;
  if (input.avatar !== undefined) data.avatar = input.avatar;
  if (input.specialty !== undefined) data.specialty = input.specialty;
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.available !== undefined) data.available = input.available;

  if (input.notifications) {
    if (input.notifications.email !== undefined) data.notifyEmail = input.notifications.email;
    if (input.notifications.sms !== undefined) data.notifySms = input.notifications.sms;
    if (input.notifications.push !== undefined) data.notifyPush = input.notifications.push;
  }

  if (Object.keys(data).length === 0) {
    // Empty PATCH is a no-op — return the user as-is rather than touching
    // updatedAt and emitting an audit row for nothing.
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw AppError.unauthorized();
    return toUserDto(existing);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return toUserDto(updated);
}

/* ─── POST /auth/change-password ──────────────────────────────────────────── */

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();

  const ok = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!ok) {
    throw new AppError("Mevcut şifre hatalı.", {
      status: 400,
      code: "invalid_password",
    });
  }

  const passwordHash = await hashPassword(input.newPassword);

  // Voiding outstanding reset tokens prevents a stolen-but-unused email
  // link from re-flipping the password after the legitimate owner just
  // changed it.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
  ]);
}

/* ─── POST /users/me/avatar ──────────────────────────────────────────────── */

/**
 * Persists the new avatar's relative path and cleans up the previous one
 * if it was a locally-uploaded file. External avatars (Unsplash, etc.)
 * obviously aren't touched.
 */
export async function setAvatar(
  userId: string,
  relativePath: string,
): Promise<UserDto> {
  const previous = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true },
  });
  if (!previous) throw AppError.unauthorized();

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { avatar: relativePath },
  });

  if (previous.avatar && previous.avatar !== relativePath) {
    const oldLocal = localPathFromAvatarUrl(previous.avatar);
    if (oldLocal) {
      await deleteLocalUpload(oldLocal);
      logger.debug("avatar_replaced", { userId });
    }
  }

  return toUserDto(updated);
}

/* ─── DELETE /users/me ────────────────────────────────────────────────────── */

export async function deleteMe(
  userId: string,
  input: DeleteMeInput,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new AppError("Şifre hatalı.", {
      status: 400,
      code: "invalid_password",
    });
  }

  // Relations on User use `onDelete: Cascade`, so the User row is enough —
  // bookings, reviews, verification rows, etc. all go with it. If you ever
  // need a soft-delete (GDPR audit retention, dispute resolution), switch
  // this to flip a `deletedAt` and exclude it from queries instead.
  await prisma.user.delete({ where: { id: userId } });
}
