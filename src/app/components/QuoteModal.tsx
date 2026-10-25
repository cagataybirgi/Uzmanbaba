import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Field,
  Input,
  Modal,
  ModalActions,
  Photo,
} from "./ds";
import { quoteBooking, type Booking } from "../data/bookings";
import { ApiError } from "../lib/api";

interface QuoteModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called with the updated booking after the price is saved. */
  onQuoted?: (booking: Booking) => void;
}

const MIN_CENTS = 100; // ₺1
const MAX_CENTS = 100_000_000; // ₺1.000.000

/**
 * "250" / "250,50" / "250.50" / "1.250" / "1.250,00" → integer kuruş, or null.
 * Accepts both decimal separators because Turkish keyboards produce ","
 * while numeric keypads produce ".". A separator followed by exactly three
 * digits is read as a thousands separator ("1.250" = ₺1.250); one followed
 * by one or two digits is the decimal point ("1,25" = ₺1,25).
 */
export function parseLiraToCents(raw: string): number | null {
  const s = raw.trim().replace(/\s|₺|TL/gi, "");
  if (!s) return null;

  const m = s.match(/^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,](\d{1,2}))?$/);
  if (!m) return null;
  const intPart = m[1].replace(/[.,]/g, "");
  const frac = (m[2] ?? "").padEnd(2, "0");

  const cents = Number(`${intPart}${frac}`);
  if (!Number.isInteger(cents)) return null;
  return cents;
}

/**
 * The professional names a price for a booking. Amount is typed in lira and
 * sent as integer kuruş; validation mirrors the backend's bounds so the
 * error the user sees is the one they'd get from the server.
 */
export function QuoteModal({
  booking,
  isOpen,
  onClose,
  onQuoted,
}: QuoteModalProps) {
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pre-fill with the current price when editing an existing quote.
  useEffect(() => {
    if (isOpen && booking) {
      setAmount(
        booking.priceCents !== null
          ? (booking.priceCents / 100).toLocaleString("tr-TR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          : "",
      );
    }
    if (!isOpen) {
      setAmount("");
      setTouched(false);
      setSubmitting(false);
      setSubmitError(null);
    }
  }, [isOpen, booking]);

  const cents = parseLiraToCents(amount);
  const localError = !touched
    ? undefined
    : cents === null
      ? "Geçerli bir tutar gir. Örnek: 250 veya 250,50"
      : cents < MIN_CENTS
        ? "Fiyat en az ₺1 olmalı."
        : cents > MAX_CENTS
          ? "Fiyat en fazla ₺1.000.000 olabilir."
          : undefined;
  const valid = cents !== null && cents >= MIN_CENTS && cents <= MAX_CENTS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!booking || !valid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await quoteBooking(booking.id, cents);
      onQuoted?.(updated);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Fiyat kaydedilemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  const editing = booking.priceCents !== null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={editing ? "Fiyatı Düzenle" : "Fiyat Ver"}
      description={`${booking.customer.name} için ${booking.service} işine fiyat belirleyin.`}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6 flex items-center gap-4 border-y-2 border-rule py-4">
          <Photo
            src={booking.customer.avatar}
            name={booking.customer.name}
            alt=""
            size={56}
          />
          <div className="min-w-0">
            <p className="truncate font-display text-[17px] font-extrabold">
              {booking.customer.name}
            </p>
            <p className="truncate text-sm text-ink/70">{booking.service}</p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <Field
            label="Tutar (₺)"
            required
            hint="KDV dahil toplam. Müşteri bu tutarı kartıyla online ödeyecek; fiyat ödemeden sonra değiştirilemez."
            error={localError}
          >
            {(field) => (
              <Input
                {...field}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="250"
                autoFocus
                required
              />
            )}
          </Field>

          {submitError && <Alert tone="error">{submitError}</Alert>}
        </div>

        <ModalActions>
          <Button
            type="submit"
            variant="primary"
            disabled={touched && !valid}
            loading={submitting}
            loadingLabel="Kaydediliyor…"
          >
            {editing ? "Fiyatı Güncelle" : "Fiyatı Kaydet"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Vazgeç
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
