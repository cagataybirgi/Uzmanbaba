import { useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/select";
import { Input } from "../components/input";
import { TURKISH_CITIES } from "../data/cities";
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
  
  // 1. Read from URL instead of local state
  const urlCity = searchParams.get("city") || "Tümü";
  const urlService = searchParams.get("service") || "";

  // 2. Local state for the inputs (so typing doesn't instantly filter until submit)
  const [localCity, setLocalCity] = useState(urlCity);
  const [localService, setLocalService] = useState(urlService);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 3. Filter the ALL_PROS array based on URL parameters
  const filteredPros = useMemo(() => {
    return ALL_PROS.filter((pro) => {
      // Check City: Match if "Tümü" OR if pro.location contains the city string
      const matchCity = urlCity === "Tümü" || pro.location.includes(urlCity);
      
      // Check Service: Match if empty OR if pro title/name contains the service string (case insensitive)
      const matchService = !urlService || 
                           pro.title.toLowerCase().includes(urlService.toLowerCase()) || 
                           pro.name.toLowerCase().includes(urlService.toLowerCase());
      
      return matchCity && matchService;
    });
  }, [urlCity, urlService]);

  const totalPages = Math.ceil(filteredPros.length / ITEMS_PER_PAGE);
  const paginated = filteredPros.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 4. Update URL parameters on submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (localCity !== "Tümü") params.append("city", localCity);
    if (localService.trim()) params.append("service", localService.trim());
    
    setSearchParams(params);
    setCurrentPage(1); // Reset to page 1 on new search
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
              value={localCity}
              onChange={(e) => setLocalCity(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white min-w-[150px]"
            >
              <option value="Tümü">Tüm Türkiye</option>
              {TURKISH_CITIES.map((loc) => (
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
                value={localService}
                onChange={(e) => setLocalService(e.target.value)}
                placeholder="Hizmet ara... (Örn: Tesisat)"
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
            {urlService || "Tüm Hizmetler"} • {urlCity}
          </p>
        </div>
      </section>

      {/* Results */}
      <section className="py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-gray-900 text-xl font-bold">
              <span className="text-orange-500">{filteredPros.length}</span>{" "}
              {urlService || "Hizmet"} Uzmanı bulundu —{" "}
              <span className="font-normal text-gray-500">{urlCity}</span>
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
            {paginated.length > 0 ? (
              paginated.map((pro) => (
                <ProfessionalCard
                  key={pro.id}
                  professional={pro}
                  onBook={handleBook}
                />
              ))
            ) : (
              <p className="col-span-full text-center py-12 text-gray-500">
                Aradığınız kriterlere uygun profesyonel bulunamadı. Lütfen filtreleri değiştirerek tekrar deneyin.
              </p>
            )}
          </div>

          {/* Pagination (Only show if there are pages) */}
          {totalPages > 0 && (
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
          )}
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