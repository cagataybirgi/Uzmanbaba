import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config.js";

/**
 * Email sender.
 *
 * - If SMTP_HOST is configured, builds a real nodemailer transport.
 * - Otherwise falls back to logging the payload to the console, which is
 *   what you want in local development. The same call site works for both.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.SMTP_HOST) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth:
      config.SMTP_USER && config.SMTP_PASS
        ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

interface SendArgs {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendArgs): Promise<void> {
  const t = getTransporter();
  if (!t) {
    // Dev fallback: print a readable block (not JSON-escaped) so the
    // verification code / reset link is easy to copy out of the terminal.
    const divider = "─".repeat(64);
    console.log(
      `\n${divider}\n` +
        `📧  DEV EMAIL (no SMTP configured — not actually sent)\n` +
        `    To:      ${to}\n` +
        `    Subject: ${subject}\n` +
        `${divider}\n` +
        `${text}\n` +
        `${divider}\n`,
    );
    return;
  }
  await t.sendMail({
    from: config.MAIL_FROM,
    to,
    subject,
    text,
    html: html ?? text,
  });
}

export function verificationEmail(code: string): { subject: string; text: string } {
  return {
    subject: "UzmanBaba — E-posta doğrulama kodu",
    text:
      `Merhaba,\n\n` +
      `UzmanBaba hesabını doğrulamak için aşağıdaki 6 haneli kodu kullan:\n\n` +
      `    ${code}\n\n` +
      `Bu kod 15 dakika içinde geçersiz olacak.\n\n` +
      `Bu işlemi sen başlatmadıysan bu e-postayı yok sayabilirsin.`,
  };
}

export function passwordResetEmail(token: string): { subject: string; text: string } {
  const link = `${config.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    subject: "UzmanBaba — Şifre sıfırlama",
    text:
      `Merhaba,\n\n` +
      `Şifreni sıfırlamak için aşağıdaki bağlantıyı kullan (1 saat geçerli):\n\n` +
      `${link}\n\n` +
      `Bu işlemi sen başlatmadıysan bu e-postayı yok sayabilirsin; şifren değişmez.`,
  };
}
