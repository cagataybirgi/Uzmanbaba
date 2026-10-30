import type { Booking, User } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { config } from "../../config.js";
import { logger } from "../../logger.js";
import { sendEmail } from "../../utils/email.js";

/* ═══════════════════════════════════════════════════════════════════════════
 * Booking emails
 *
 * One email per step of a booking, to whoever has to act or wants to know:
 *
 *   requested  → professional   (a customer asked for a job)
 *   quoted     → customer       (a price was named or changed)
 *   confirmed  → customer       (the professional accepted)
 *   paid       → both           (iyzico confirmed the charge)
 *   cancelled  → the other side (whoever didn't press the button)
 *   refunded   → customer       (the money is on its way back)
 *
 * Every send skips a recipient who turned email notifications off
 * (User.notifyEmail). Auth emails — verification, password reset — don't go
 * through here and always send.
 *
 * Sending happens in the background: SMTP can take seconds, and a booking
 * action must never fail or wait because a mail server is slow or down. Each
 * job re-reads the booking when it runs, so the email shows the committed
 * state. Failures are logged, never thrown.
 * ═══════════════════════════════════════════════════════════════════════ */

type BookingWithParties = Booking & { customer: User; professional: User };

const pending = new Set<Promise<void>>();

function enqueue(event: string, job: () => Promise<void>): void {
  const run = job().catch((err) => {
    logger.error("booking_email_failed", { event, err: String(err) });
  });
  pending.add(run);
  void run.finally(() => pending.delete(run));
}

/** Resolves once every email queued so far has been sent or has failed. */
export async function settleBookingEmails(): Promise<void> {
  while (pending.size > 0) await Promise.all(pending);
}

async function loadBooking(bookingId: string): Promise<BookingWithParties | null> {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, professional: true },
  });
}

async function deliver(to: User, subject: string, body: string): Promise<void> {
  if (!to.notifyEmail) return;
  await sendEmail({
    to: to.email,
    subject: `UzmanBaba — ${subject}`,
    text: `Merhaba ${to.name},\n\n${body}\n\nUzmanBaba`,
  });
}

/* ─── formatting ────────────────────────────────────────────────────────── */

const priceFormat = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

const formatPrice = (cents: number) => priceFormat.format(cents / 100);

function dashboardLink(tab: "bookings" | "incoming"): string {
  return `${config.APP_URL}/dashboard?tab=${tab}`;
}

function summary(b: Booking): string {
  return (
    `    Hizmet: ${b.service}\n` +
    `    Tarih:  ${dateFormat.format(b.scheduledAt)}\n` +
    `    Adres:  ${b.address}`
  );
}

/* ─── events ────────────────────────────────────────────────────────────── */

export function notifyBookingRequested(bookingId: string): void {
  enqueue("requested", async () => {
    const b = await loadBooking(bookingId);
    if (!b) return;
    await deliver(
      b.professional,
      "Yeni hizmet talebi",
      `${b.customer.name} senden hizmet talep etti:\n\n` +
        `${summary(b)}\n\n` +
        `Açıklama:\n${b.description}\n\n` +
        `Talebi incelemek, fiyat vermek ve onaylamak için:\n${dashboardLink("incoming")}`,
    );
  });
}

export function notifyBookingQuoted(bookingId: string): void {
  enqueue("quoted", async () => {
    const b = await loadBooking(bookingId);
    if (!b || b.priceCents === null) return;
    const next =
      b.status === "confirmed" || b.status === "completed"
        ? "Ödemeyi şimdi yapabilirsin:"
        : "Uzman talebini onayladığında ödeme yapabileceksin. Rezervasyonun:";
    await deliver(
      b.customer,
      "Fiyat teklifi",
      `${b.professional.name} talebin için fiyat belirledi: ${formatPrice(b.priceCents)}\n\n` +
        `${summary(b)}\n\n` +
        `${next}\n${dashboardLink("bookings")}`,
    );
  });
}

export function notifyBookingConfirmed(bookingId: string): void {
  enqueue("confirmed", async () => {
    const b = await loadBooking(bookingId);
    if (!b) return;
    const next =
      b.priceCents === null
        ? "Uzman fiyatı belirlediğinde sana haber vereceğiz."
        : b.paidAt
          ? "Ödemen alındı, başka bir şey yapmana gerek yok."
          : `Tutar: ${formatPrice(b.priceCents)}. Ödemeyi şimdi yapabilirsin.`;
    await deliver(
      b.customer,
      "Rezervasyonun onaylandı",
      `${b.professional.name} rezervasyonunu onayladı.\n\n` +
        `${summary(b)}\n\n` +
        `${next}\n${dashboardLink("bookings")}`,
    );
  });
}

export function notifyBookingPaid(bookingId: string, amountCents: number): void {
  enqueue("paid", async () => {
    const b = await loadBooking(bookingId);
    if (!b) return;
    const amount = formatPrice(amountCents);
    await deliver(
      b.customer,
      "Ödemen alındı",
      `${amount} tutarındaki ödemen alındı. Teşekkürler!\n\n` +
        `${summary(b)}\n    Uzman:  ${b.professional.name}\n\n` +
        `Rezervasyonun:\n${dashboardLink("bookings")}`,
    );
    await deliver(
      b.professional,
      "Ödeme alındı",
      `${b.customer.name} ${amount} tutarındaki ödemeyi yaptı.\n\n` +
        `${summary(b)}\n\n` +
        `Talep:\n${dashboardLink("incoming")}`,
    );
  });
}

export function notifyBookingCancelled(bookingId: string): void {
  enqueue("cancelled", async () => {
    const b = await loadBooking(bookingId);
    if (!b || b.status !== "cancelled") return;

    if (b.cancelledBy === "customer") {
      await deliver(
        b.professional,
        "Rezervasyon iptal edildi",
        `${b.customer.name} rezervasyonu iptal etti.\n\n` +
          `${summary(b)}\n\n` +
          `Talepler:\n${dashboardLink("incoming")}`,
      );
      return;
    }

    // Refund state is told separately (notifyPaymentRefunded) once iyzico
    // has actually moved the money, so this only promises that it will.
    const refundLine = b.paidAt
      ? "Yaptığın ödeme kartına iade edilecek; iade tamamlanınca ayrıca e-posta alacaksın.\n\n"
      : "";
    await deliver(
      b.customer,
      "Rezervasyonun iptal edildi",
      `${b.professional.name} rezervasyonunu iptal etti.\n\n` +
        `${summary(b)}\n\n` +
        refundLine +
        `Başka bir uzman bulmak için:\n${config.APP_URL}/search`,
    );
  });
}

export function notifyPaymentRefunded(paymentId: string): void {
  enqueue("refunded", async () => {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: { include: { customer: true, professional: true } } },
    });
    if (!payment || payment.status !== "refunded") return;
    const b = payment.booking;
    await deliver(
      b.customer,
      "Ödemen iade edildi",
      `${formatPrice(payment.amountCents)} tutarındaki ödemen kartına iade edildi.\n\n` +
        `${summary(b)}\n    Uzman:  ${b.professional.name}\n\n` +
        `Tutarın kartına yansıması bankana göre birkaç iş günü sürebilir.`,
    );
  });
}
