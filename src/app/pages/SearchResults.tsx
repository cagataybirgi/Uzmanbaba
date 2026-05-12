import { useState } from "react";
import { useSearchParams } from "react-router";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ProfessionalCard, type Professional } from "../components/ProfessionalCard";
import { BookingModal } from "../components/BookingModal";

const ALL_PROS: Professional[] = [
  {
    id: 1,
    name: "Ahmet Yılmaz",
    title: "Sertifikalı Tesisatçı",
    location: "Ankara, TR",
    rating: 4.9,
    reviews: 214,
    available: true,
    avatar: "https://images.unsplash.com/photo-1649769069590-268b0b994462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwcGx1bWJlciUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc3ODU4MTg3M3ww&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: 2,
    name: "Elif Kaya",
    title: "Temizlik Uzmanı",
    location: "Ankara, TR",
    rating: 4.8,
    reviews: 178,
    available: true,
    avatar: "https://images.unsplash.com/photo-1574320200624-96b6e093f695?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBjbGVhbmluZyUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc3ODU4MTg3M3ww&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: 3,
    name: "Mehmet Demir",
    title: "Elektrik Teknisyeni",
    location: "İzmir, TR",
    rating: 4.7,
    reviews: 132,
    available: false,
    avatar: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwZWxlY3RyaWNpYW4lMjB3b3JrZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3Nzg1ODE4NzN8MA&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: 4,
    name: "Selin Arslan",
    title: "Boya & Badana Uzmanı",
    location: "İstanbul, TR",
    rating: 4.8,
    reviews: 95,
    available: true,
    avatar: "https://images.unsplash.com/photo-1576323200687-e210fe495315?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBwYWludGVyJTIwY29udHJhY3RvciUyMHBvcnRyYWl0fGVufDF8fHx8MTc3ODU4MTg3Nnww&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: 5,
    name: "Kerem Çelik",
    title: "Marangoz & Usta",
    location: "Bursa, TR",
    rating: 4.6,
    reviews: 88,
    available: true,
    avatar: "https://images.unsplash.com/photo-1661447133325-a4a73386b9e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwaGFuZHltYW4lMjBjYXJwZW50ZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3Nzg1ODE4NzZ8MA&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: 6,
    name: "Ayşe Polat",
    title: "Klima & Isıtma Uzmanı",
    location: "Ankara, TR",
    rating: 4.9,
    reviews: 201,
    available: true,
    avatar: "https://images.unsplash.com/photo-1685475896056-8f5c6fb7e8a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBwcm9mZXNzaW9uYWwlMjB0ZWNobmljaWFuJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzc4NTgxODc2fDA&ixlib=rb-4.1.0&q=80&w=400",
  },
];

const LOCATIONS = [
  "Türkiye",
  "Ankara",
  "İstanbul",
  "İzmir",
  "Bursa",
  "Antalya",
  "Adana",
];

const ITEMS_PER_PAGE = 6;

export function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [location, setLocation] = useState("Türkiye");
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "Tesisat");
  const [activeQuery, setActiveQuery] = useState(searchParams.get("q") || "Tesisat");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const totalPages = Math.ceil(ALL_PROS.length / ITEMS_PER_PAGE);
  const paginated = ALL_PROS.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchInput);
    setCurrentPage(1);
    setSearchParams({ q: searchInput });
  };

  const handleBook = (pro: Professional) => {
    setSelectedPro(pro);
    setModalOpen(true);
  };

  return (
    <>
      {/* Search Bar */}
      <section className="bg-white border-b border-gray-200 py-4 px-4 sticky top-16 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
          >
            {/* Location dropdown */}
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white min-w-[150px]"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  📍 {loc}
                </option>
              ))}
            </select>

            {/* Search input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Hizmet ara..."
                className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Aramayı Güncelle
            </button>
          </form>
          <p className="text-gray-400 text-xs mt-2 pl-1 capitalize">
            {activeQuery} hizmetleri • {location}
          </p>
        </div>
      </section>

      {/* Results */}
      <section className="py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-gray-900 text-xl font-bold">
              <span className="text-orange-500">{ALL_PROS.length}</span>{" "}
              {activeQuery} Uzmanı bulundu —{" "}
              <span className="font-normal text-gray-500">{location}</span>
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Sırala:</span>
              <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option>En İyi Puan</option>
                <option>En Yakın</option>
                <option>Müsaitlik</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginated.map((pro) => (
              <ProfessionalCard
                key={pro.id}
                professional={pro}
                onBook={handleBook}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} /> Önceki
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                  currentPage === p
                    ? "bg-orange-500 text-white"
                    : "border border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-500"
                }`}
              >
                {p}
              </button>
            ))}

            {totalPages > 3 && (
              <span className="text-gray-400 text-sm px-1">...</span>
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <BookingModal
        professional={selectedPro}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
