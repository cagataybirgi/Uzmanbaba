import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Button,
  ButtonLink,
  Field,
  Input,
  Modal,
  ModalActions,
  Photo,
  Textarea,
} from "./ds";
import { useAuth } from "../context/AuthContext";
import { createBooking } from "../data/bookings";
import type { Professional } from "../data/professionals";
import { ApiError } from "../lib/api";

interface BookingModalProps {
  professional: Professional | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful booking — e.g. so the dashboard can refetch. */
  onBooked?: () => void;
}

/**
 * Returns today's date as a YYYY-MM-DD string in the user's local timezone.
 * Using toISOString() directly would shift by the UTC offset and let users
 * in negative-offset timezones pick "yesterday".
 */
function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Combines a YYYY-MM-DD and HH:MM into an ISO timestamp in the user's
 * local timezone. The backend expects an RFC 3339 datetime.
 */
function toISO(date: string, time: string): string {
  // Constructing via `new Date('YYYY-MM-DDTHH:MM')` is interpreted as local
  // time, which is what the user typed. `.toISOString()` then converts to UTC.
  const d = new Date(`${date}T${time}:00`);
  return d.toISOString();
}

export function BookingModal({
  professional,
  isOpen,
  onClose,
  onBooked,
}: BookingModalProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const minDate = todayISO();
  const isFormValid = Boolean(
    date && time && address.trim() && description.trim(),
  );

  // Reset on close so the next open shows a fresh form.
  useEffect(() => {
    if (!isOpen) {
      setDate("");
      setTime("10:00");
      setAddress("");
      setDescription("");
      setConfirmed(false);
      setSubmitting(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !professional || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createBooking({
        professionalId: professional.id,
        scheduledAt: toISO(date, time),
        address: address.trim(),
        description: description.trim(),
      });
      setConfirmed(true);
      onBooked?.();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Rezervasyon oluşturulamadı. Lütfen tekrar deneyin.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!professional) return null;

  const title = confirmed
    ? "Rezervasyon Onaylandı"
    : !isAuthenticated
      ? "Önce Giriş Yap"
      : "Rezervasyon Oluştur";

  const description_ = confirmed
    ? `${professional.name} ile yapılan rezervasyon talebi alındı.`
    : `${professional.name} ile randevu oluşturmak için tarih, adres ve iş tanımını girin.`;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      description={description_}
    >
      {/* ── Unauthenticated ──────────────────────────────────────────── */}
      {!isAuthenticated && !confirmed ? (
        <>
          <p className="t-body max-w-[44ch]">
            Rezervasyon oluşturmak için hesabınızla giriş yapmanız gerekiyor.
            Hesabın yoksa dakikalar içinde oluşturabilirsin.
          </p>
          <ModalActions>
            <ButtonLink to="/login" variant="primary" onClick={onClose}>
              Giriş Yap
            </ButtonLink>
            <ButtonLink to="/register" variant="secondary" onClick={onClose}>
              Yeni Hesap Aç
            </ButtonLink>
          </ModalActions>
        </>
      ) : confirmed ? (
        /* ── Success ────────────────────────────────────────────────── */
        <>
          <p className="t-body max-w-[44ch]">
            Talebin {professional.name} adlı uzmana iletildi. Uzman
            onayladığında bildirim alacaksın; rezervasyonu panelinden takip
            edebilirsin.
          </p>
          <ModalActions>
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                navigate("/dashboard?tab=bookings");
              }}
            >
              Panelime Git
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Kapat
            </Button>
          </ModalActions>
        </>
      ) : (
        /* ── Form ───────────────────────────────────────────────────── */
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-6 flex items-center gap-4 border-y-2 border-rule py-4">
            <Photo src={professional.avatar} name={professional.name} alt="" size={56} />
            <div className="min-w-0">
              <p className="truncate font-display text-[17px] font-extrabold">
                {professional.name}
              </p>
              <p className="truncate text-sm text-ink/70">
                {professional.title}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tarih" required>
                {(field) => (
                  <Input
                    {...field}
                    type="date"
                    value={date}
                    min={minDate}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                )}
              </Field>
              <Field label="Saat" required>
                {(field) => (
                  <Input
                    {...field}
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                )}
              </Field>
            </div>

            <Field label="Adres" required>
              {(field) => (
                <Input
                  {...field}
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Tam hizmet adresini girin…"
                  autoComplete="street-address"
                  required
                />
              )}
            </Field>

            <Field label="İş tanımı" required>
              {(field) => (
                <Textarea
                  {...field}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="İşin detaylarını kısaca yaz…"
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
              disabled={!isFormValid}
              loading={submitting}
              loadingLabel="Gönderiliyor…"
            >
              Rezervasyonu Onayla
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Vazgeç
            </Button>
          </ModalActions>
        </form>
      )}
    </Modal>
  );
}
