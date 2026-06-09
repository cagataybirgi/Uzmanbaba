import { z } from "zod";

/**
 * Request-body schemas for the auth endpoints. Field names + messages stay
 * close to the Turkish UI copy so server-side validation errors can surface
 * unchanged in the frontend.
 */

const emailField = z
  .string({ required_error: "E-posta zorunlu." })
  .trim()
  .toLowerCase()
  .email("Geçerli bir e-posta girin.");

const passwordField = z
  .string({ required_error: "Şifre zorunlu." })
  .min(8, "Şifre en az 8 karakter olmalı.")
  .max(128, "Şifre çok uzun.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Ad Soyad en az 2 karakter olmalı.").max(120),
    email: emailField,
    phone: z.string().trim().min(7, "Geçerli bir telefon girin.").max(32),
    password: passwordField,
    accountType: z.enum(["customer", "professional"]).default("customer"),
    specialty: z.string().trim().max(120).optional(),
    city: z.string().trim().max(60).optional(),
    bio: z.string().trim().max(2000).optional(),
  })
  // A professional must declare what they do. The frontend already requires
  // it, but enforcing here means the contract is self-describing.
  .refine(
    (data) =>
      data.accountType !== "professional" || (data.specialty?.length ?? 0) > 0,
    {
      message: "Uzmanlık alanı zorunlu.",
      path: ["specialty"],
    },
  );

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Şifre zorunlu."),
});

export const verifyEmailSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "6 haneli kod girin."),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10, "Geçersiz bağlantı."),
  password: passwordField,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
