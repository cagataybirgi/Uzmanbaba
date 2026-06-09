import { useEffect, useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Star, CheckCircle2, AlertCircle } from "lucide-react";
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

/**
 * Star picker + optional comment for completed bookings.
 *
 * Uses a hover state so the row of stars fills as the mouse moves, matching
 * how every other star picker on the planet behaves. Touch users get the
 * same effect on focus.
 */
export function ReviewModal({ booking, isOpen, onClose, onReviewed }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reactId = useId();
  const titleId = `${reactId}-title`;
  const descId = `${reactId}-desc`;
  const commentId = `${reactId}-comment`;

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

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

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
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="
            fixed inset-0 z-50 bg-black/50
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
          "
        />
        <Dialog.Content
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="
            fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2
            w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto
            bg-white rounded-2xl shadow-2xl
            focus:outline-none
            data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
          "
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <Dialog.Title id={titleId} className="font-semibold text-gray-900 text-lg">
              {done ? "Teşekkürler!" : "Hizmeti Değerlendir"}
            </Dialog.Title>
            <Dialog.Close
              className="text-gray-400 hover:text-gray-600 transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
              aria-label="Kapat"
            >
              <X size={20} />
            </Dialog.Close>
          </div>

          <Dialog.Description id={descId} className="sr-only">
            {booking.professional.name} ile yapılan {booking.service} işini puanlayın.
          </Dialog.Description>

          {done ? (
            <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">
                  Değerlendirmen Alındı
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Geri bildirimin diğer kullanıcılar için çok değerli.
                </p>
              </div>
              <Dialog.Close className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-8 rounded-lg transition-colors">
                Tamam
              </Dialog.Close>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
              {/* Booking summary */}
              <div className="flex items-center gap-4 bg-orange-50 rounded-xl p-4">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-orange-300">
                  <img
                    src={booking.professional.avatar}
                    alt=""
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {booking.professional.name}
                  </p>
                  <p className="text-gray-500 text-sm">{booking.service}</p>
                </div>
              </div>

              {/* Star picker */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium text-gray-700">
                  Hizmeti nasıl puanlarsın?
                </p>
                <div
                  className="flex items-center gap-1"
                  onMouseLeave={() => setHover(0)}
                  role="radiogroup"
                  aria-label="Puanlama"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHover(n)}
                      onFocus={() => setHover(n)}
                      onBlur={() => setHover(0)}
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} yıldız`}
                      className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded"
                    >
                      <Star
                        size={32}
                        className={`transition-colors ${
                          n <= displayRating
                            ? "fill-orange-500 text-orange-500"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 h-4">
                  {displayRating === 0
                    ? "Bir puan seçin"
                    : ["", "Kötü", "Zayıf", "Orta", "İyi", "Mükemmel"][displayRating]}
                </p>
              </div>

              {/* Optional comment */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={commentId}
                  className="text-sm font-medium text-gray-700"
                >
                  Yorumun{" "}
                  <span className="text-gray-400 text-xs font-normal">
                    (opsiyonel)
                  </span>
                </label>
                <textarea
                  id={commentId}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Deneyimini birkaç cümleyle paylaş..."
                  rows={4}
                  maxLength={2000}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none"
                />
              </div>

              {submitError && (
                <p className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{submitError}</span>
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <Dialog.Close
                  className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                  disabled={submitting}
                >
                  Vazgeç
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={rating < 1 || submitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {submitting ? "Gönderiliyor..." : "Değerlendirmeyi Gönder"}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
