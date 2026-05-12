import { useState } from "react";
import { X, Star, Calendar } from "lucide-react";
import { type Professional } from "./ProfessionalCard";

interface BookingModalProps {
  professional: Professional | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingModal({ professional, isOpen, onClose }: BookingModalProps) {
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen || !professional) return null;

  const handleConfirm = () => {
    if (!date || !address || !description) return;
    setConfirmed(true);
  };

  const handleClose = () => {
    setDate("");
    setAddress("");
    setDescription("");
    setConfirmed(false);
    onClose();
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Modal Panel */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">
            {confirmed ? "Rezervasyon Onaylandı!" : `${professional.name} ile Rezervasyon`}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {confirmed ? (
          /* Success State */
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">Rezervasyonunuz Alındı</p>
              <p className="text-gray-500 text-sm mt-1">
                {professional.name} sizi en kısa sürede arayacak. Baba sorunu çözer!
              </p>
            </div>
            <button
              onClick={handleClose}
              className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-8 rounded-lg transition-colors"
            >
              Tamam
            </button>
          </div>
        ) : (
          /* Form */
          <div className="px-6 py-5 flex flex-col gap-5">
            {/* Professional Info */}
            <div className="flex items-center gap-4 bg-orange-50 rounded-xl p-4">
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-orange-300">
                <img
                  src={professional.avatar}
                  alt={professional.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{professional.name}</p>
                <p className="text-gray-500 text-sm">{professional.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={12} className="fill-orange-500 text-orange-500" />
                  <span className="text-gray-700 text-xs font-medium">{professional.rating}</span>
                  <span className="text-gray-400 text-xs">({professional.reviews} değerlendirme)</span>
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Tarih Seçin</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 pr-10"
                />
                <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Adresinizi Girin</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Tam hizmet adresini girin..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              />
            </div>

            {/* Work Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">İş Tanımı</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sorunu ayrıntılı olarak açıklayın..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleConfirm}
                disabled={!date || !address || !description}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                Rezervasyonu Onayla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
