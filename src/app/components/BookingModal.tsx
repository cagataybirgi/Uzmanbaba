import { useEffect, useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Star, Calendar, CheckCircle2 } from "lucide-react";
import { type Professional } from "./ProfessionalCard";

interface BookingModalProps {
  professional: Professional | null;
  isOpen: boolean;
  onClose: () => void;
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

export function BookingModal({ professional, isOpen, onClose }: BookingModalProps) {
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // Stable, unique ids per modal instance — prevents collisions if the modal
  // is ever rendered more than once on the same page.
  const reactId = useId();
  const titleId = `${reactId}-title`;
  const descId = `${reactId}-desc`;
  const dateId = `${reactId}-date`;
  const addressId = `${reactId}-address`;
  const workId = `${reactId}-work`;

  const minDate = todayISO();
  const isFormValid = Boolean(date && address.trim() && description.trim());

  // Reset internal state whenever the dialog transitions to closed, so a
  // fresh form is shown next time it opens — even if the parent toggled
  // `isOpen` directly without going through onClose().
  useEffect(() => {
    if (!isOpen) {
      setDate("");
      setAddress("");
      setDescription("");
      setConfirmed(false);
    }
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setConfirmed(true);
  };

  // Don't render if no professional has been selected. The parent currently
  // guards this too, but defensive null-check keeps types tight.
  if (!professional) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Overlay — clicking it closes the dialog (Radix handles this) */}
        <Dialog.Overlay
          className="
            fixed inset-0 z-50 bg-black/50
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
          "
        />

        {/* Content
            - `aria-labelledby` is auto-wired to Dialog.Title by Radix
            - `aria-describedby` is auto-wired to Dialog.Description by Radix
            - `role="dialog"` and `aria-modal="true"` are applied automatically
            - Focus trap, ESC key, click-outside, return-focus all handled  */}
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
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <Dialog.Title
              id={titleId}
              className="font-semibold text-gray-900 text-lg"
            >
              {confirmed
                ? "Rezervasyon Onaylandı!"
                : `${professional.name} ile Rezervasyon`}
            </Dialog.Title>

            <Dialog.Close
              className="text-gray-400 hover:text-gray-600 transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
              aria-label="Modalı kapat"
            >
              <X size={20} />
            </Dialog.Close>
          </div>

          {/* Visually-hidden description for screen readers (silences Radix
              warning and gives extra context to AT users). */}
          <Dialog.Description id={descId} className="sr-only">
            {confirmed
              ? `${professional.name} ile yapılan rezervasyon onaylandı. Uzman sizi en kısa sürede arayacak.`
              : `${professional.title} ${professional.name} ile randevu oluşturmak için tarih, adres ve iş tanımını girin.`}
          </Dialog.Description>

          {confirmed ? (
            /* ── Success State ── */
            <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">
                  Rezervasyonunuz Alındı
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {professional.name} sizi en kısa sürede arayacak. Baba sorunu
                  çözer!
                </p>
              </div>
              <Dialog.Close
                className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-8 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
              >
                Tamam
              </Dialog.Close>
            </div>
          ) : (
            /* ── Booking Form ── */
            <form
              onSubmit={handleSubmit}
              className="px-6 py-5 flex flex-col gap-5"
              noValidate
            >
              {/* Professional Info */}
              <div className="flex items-center gap-4 bg-orange-50 rounded-xl p-4">
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-orange-300">
                  <img
                    src={professional.avatar}
                    alt=""
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {professional.name}
                  </p>
                  <p className="text-gray-500 text-sm">{professional.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star
                      size={12}
                      className="fill-orange-500 text-orange-500"
                      aria-hidden="true"
                    />
                    <span className="text-gray-700 text-xs font-medium">
                      {professional.rating}
                    </span>
                    <span className="text-gray-400 text-xs">
                      ({professional.reviews} değerlendirme)
                    </span>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={dateId}
                  className="text-sm font-medium text-gray-700"
                >
                  Tarih Seçin <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    id={dateId}
                    type="date"
                    value={date}
                    min={minDate}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    aria-required="true"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 pr-10"
                  />
                  <Calendar
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={addressId}
                  className="text-sm font-medium text-gray-700"
                >
                  Adresinizi Girin <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id={addressId}
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Tam hizmet adresini girin..."
                  autoComplete="street-address"
                  required
                  aria-required="true"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                />
              </div>

              {/* Work Description */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={workId}
                  className="text-sm font-medium text-gray-700"
                >
                  İş Tanımı <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <textarea
                  id={workId}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Sorunu ayrıntılı olarak açıklayın..."
                  rows={4}
                  required
                  aria-required="true"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Dialog.Close
                  className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                >
                  İptal
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                >
                  Rezervasyonu Onayla
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
