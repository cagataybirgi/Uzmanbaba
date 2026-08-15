import { useEffect, useId, useState } from "react";
import { Star } from "lucide-react";
import {
  Alert,
  Button,
  Field,
  Modal,
  ModalActions,
  Photo,
  Textarea,
} from "./ds";
import { createReview } from "../data/reviews";
import { ApiError } from "../lib/api";
import type { Booking } from "../data/bookings";

interface ReviewModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful review submission. */
  onReviewed?: () => void;
}

const RATING_LABELS = ["", "Kötü", "Zayıf", "Orta", "İyi", "Mükemmel"];

/**
 * Star picker + optional comment for completed bookings.
 *
 * The picker is a real radio group: arrow keys move between stars, the
 * whole row is one tab stop, and each option carries its own label so a
 * screen reader announces "4 yıldız — İyi" rather than an unnamed button.
 */
export function ReviewModal({
  booking,
  isOpen,
  onClose,
  onReviewed,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const groupName = useId();

  useEffect(() => {
    if (!isOpen) {
      setRating(0);
      setHover(0);
      setComment("");
      setSubmitting(false);
      setSubmitError(null);
      setDone(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || rating < 1 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createReview({
        bookingId: booking.id,
        rating,
        comment: comment.trim() || undefined,
      });
      setDone(true);
      onReviewed?.();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "Değerlendirme gönderilemedi.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  const displayRating = hover || rating;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={done ? "Teşekkürler" : "Hizmeti Değerlendir"}
      description={`${booking.professional.name} ile yapılan ${booking.service} işini puanlayın.`}
    >
      {done ? (
        <>
          <p className="t-body max-w-[44ch]">
            Değerlendirmen alındı. Geri bildirimin diğer kullanıcılar için çok
            değerli — puanlar yalnızca tamamlanmış işlerden geldiği için
            listelerde gerçek deneyimi yansıtıyor.
          </p>
          <ModalActions>
            <Button variant="primary" onClick={onClose}>
              Tamam
            </Button>
          </ModalActions>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-6 flex items-center gap-4 border-y-2 border-rule py-4">
            <Photo
              src={booking.professional.avatar}
              name={booking.professional.name}
              alt=""
              size={56}
            />
            <div className="min-w-0">
              <p className="truncate font-display text-[17px] font-extrabold">
                {booking.professional.name}
              </p>
              <p className="truncate text-sm text-ink/70">{booking.service}</p>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 text-xs font-semibold tracking-wide text-ink/70">
                Hizmeti nasıl puanlarsın? *
              </legend>
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHover(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <label
                    key={n}
                    onMouseEnter={() => setHover(n)}
                    className="flex size-11 cursor-pointer items-center justify-center"
                  >
                    <input
                      type="radio"
                      name={groupName}
                      value={n}
                      checked={rating === n}
                      onChange={() => setRating(n)}
                      onFocus={() => setHover(n)}
                      onBlur={() => setHover(0)}
                      className="peer sr-only"
                    />
                    <span className="sr-only">
                      {n} yıldız — {RATING_LABELS[n]}
                    </span>
                    <Star
                      size={30}
                      aria-hidden="true"
                      className={
                        (n <= displayRating
                          ? "fill-brand text-brand"
                          : "text-ink/25") +
                        " transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="mt-1 h-5 text-xs text-ink/60">
                {displayRating === 0
                  ? "Bir puan seçin"
                  : RATING_LABELS[displayRating]}
              </p>
            </fieldset>

            <Field label="Yorumun" hint="İsteğe bağlı — en fazla 2000 karakter.">
              {(field) => (
                <Textarea
                  {...field}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Deneyimini birkaç cümleyle paylaş…"
                  maxLength={2000}
                />
              )}
            </Field>

            {submitError && <Alert tone="error">{submitError}</Alert>}
          </div>

          <ModalActions>
            <Button
              type="submit"
              variant="primary"
              disabled={rating < 1}
              loading={submitting}
              loadingLabel="Gönderiliyor…"
            >
              Değerlendirmeyi Gönder
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
