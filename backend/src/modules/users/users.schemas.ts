import { z } from "zod";

/**
 * PATCH /api/users/me — every field is optional. Sending `null` for an
 * optional text field clears it; omitting it leaves the existing value.
 * That distinction matters for `bio` and `specialty`.
 */
export const updateMeSchema = z.object({
  name: z.string().trim().min(2, "Ad Soyad en az 2 karakter olmalı.").max(120).optional(),
  phone: z.string().trim().min(7, "Geçerli bir telefon girin.").max(32).optional(),
  location: z.string().trim().max(120).optional(),
  avatar: z.string().trim().url("Geçersiz görsel adresi.").max(2000).optional(),
  specialty: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  available: z.boolean().optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .partial()
    .optional(),
});

export const deleteMeSchema = z.object({
  // Sensitive op — confirm the user is who they say they are. This blocks
  // an attacker with a stolen session token from one-shot-deleting the
  // account without knowing the password.
  password: z.string().min(1, "Şifre zorunlu."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifre zorunlu."),
    newPassword: z
      .string()
      .min(8, "Yeni şifre en az 8 karakter olmalı.")
      .max(128, "Şifre çok uzun."),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "Yeni şifre mevcut şifre ile aynı olamaz.",
    path: ["newPassword"],
  });

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteMeInput = z.infer<typeof deleteMeSchema>;
