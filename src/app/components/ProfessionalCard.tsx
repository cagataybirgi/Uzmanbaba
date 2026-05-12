import { Star, MapPin, CheckCircle } from "lucide-react";

export interface Professional {
  id: number;
  name: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  available: boolean;
  avatar: string;
}

interface ProfessionalCardProps {
  professional: Professional;
  onBook: (professional: Professional) => void;
  compact?: boolean;
}

export function ProfessionalCard({
  professional,
  onBook,
  compact = false,
}: ProfessionalCardProps) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col ${
        compact ? "min-w-[140px]" : ""
      }`}
    >
      {/* Avatar Banner */}
      <div className="bg-gray-100 flex items-center justify-center h-32 overflow-hidden">
        <img
          src={professional.avatar}
          alt={professional.name}
          className="w-full h-full object-cover object-top"
        />
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <h3 className="font-semibold text-gray-900 text-center">
          {professional.name}
        </h3>
        <p className="text-gray-500 text-xs text-center">{professional.title}</p>
        <div className="flex items-center justify-center gap-1 text-gray-400 text-xs">
          <MapPin size={11} />
          <span>{professional.location}</span>
        </div>

        {/* Rating */}
        <div className="flex items-center justify-center gap-1 mt-1">
          <Star size={13} className="fill-orange-500 text-orange-500" />
          <span className="text-gray-800 text-xs font-medium">
            {professional.rating}
          </span>
          <span className="text-gray-400 text-xs">
            ({professional.reviews} değerlendirme)
          </span>
        </div>

        {/* Availability */}
        {professional.available && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <CheckCircle size={12} className="text-green-500" />
            <span className="text-green-600 text-xs font-medium">
              Bugün Müsait
            </span>
          </div>
        )}

        {/* Book Button */}
        <button
          onClick={() => onBook(professional)}
          className="mt-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors w-full"
        >
          Hemen Rezerve Et
        </button>
      </div>
    </div>
  );
}
