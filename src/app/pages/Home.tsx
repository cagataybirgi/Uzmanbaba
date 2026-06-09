import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, Wrench, Truck, Sparkles, ArrowRight } from "lucide-react";
import { ProfessionalCard, type Professional } from "../components/ProfessionalCard";
import { BookingModal } from "../components/BookingModal";
import { TURKISH_CITIES } from "../data/cities";
import { useFeaturedProfessionals } from "../data/professionals";

const FEATURED_LIMIT = 3;

const SERVICES = [
  {
    icon: Sparkles,
    title: "Temizlik",
    desc: "Konut ve ticari temizlik hizmetleri.",
    color: "bg-blue-50 text-blue-500",
  },
  {
    icon: Truck,
    title: "Nakliyat",
    desc: "Yerel ve uzun mesafeli taşımacılık.",
    color: "bg-green-50 text-green-500",
  },
  {
    icon: Wrench,
    title: "Tesisat",
    desc: "Onarım, kurulum ve bakım.",
    color: "bg-orange-50 text-orange-500",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Ara",
    desc: "İhtiyacınız olan hizmeti bulun.",
  },
  {
    step: "2",
    title: "Rezerve Et",
    desc: "Güvenle randevu alın ve ödeme yapın.",
  },
  {
    step: "3",
    title: "Tamamlandı",
    desc: "Uzman işi tamamlar, siz rahatlarsınız.",
  },
];

export function Home() {
  const [selectedCity, setSelectedCity] = useState("Tümü");
  const [serviceQuery, setServiceQuery] = useState("");
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const featured = useFeaturedProfessionals(FEATURED_LIMIT);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedCity !== "Tümü") params.append("city", selectedCity);
    if (serviceQuery.trim()) params.append("service", serviceQuery.trim());
    navigate(`/search?${params.toString()}`);
  };

  const handleBook = (pro: Professional) => {
    setSelectedPro(pro);
    setModalOpen(true);
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 via-white to-orange-50 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <div className="inline-block bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Baba sorunu çözer
          </div>
          <h1 className="text-gray-900 text-4xl sm:text-5xl font-extrabold leading-tight">
            Yerel Hizmetleri{" "}
            <span className="text-orange-500">Anında Bul</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl">
            Kapınıza kadar güvenilir uzmanlar. Temizlikten tesisata, nakliyattan elektriğe — baba halleder.
          </p>

          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row w-full max-w-2xl gap-2 mt-2 bg-white p-2 rounded-2xl shadow-lg border border-gray-100"
          >
            {/* City Select */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="border-0 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-0 sm:border-r border-gray-200 min-w-[140px] text-gray-700"
            >
              <option value="Tümü">Tüm Türkiye</option>
              {TURKISH_CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            {/* Service Input */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                placeholder="Hangi hizmete ihtiyacın var? (Örn: Tesisat)"
                className="w-full border-0 bg-transparent pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-0"
              />
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Ara
            </button>
          </form>

          <p className="text-gray-400 text-xs">
            Popüler:{" "}
            {["Temizlik", "Tesisat", "Nakliyat", "Elektrik"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  navigate(`/search?service=${s}`);
                }}
                className="text-orange-500 hover:underline mx-1"
              >
                {s}
              </button>
            ))}
          </p>
        </div>
      </section>

      {/* Popular Services */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-gray-900 text-2xl font-bold mb-8">
            Popüler Hizmetler
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {SERVICES.map((svc) => (
              <div
                key={svc.title}
                className="border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/search?service=${svc.title}`)}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${svc.color}`}
                >
                  <svc.icon size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{svc.title}</h3>
                <p className="text-gray-500 text-sm mb-3">{svc.desc}</p>
                <span className="text-orange-500 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Daha Fazla <ArrowRight size={14} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-gray-900 text-2xl font-bold mb-10 text-center">
            Nasıl Çalışır?
          </h2>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            {/* Connecting line (desktop) */}
            <div className="hidden sm:block absolute top-8 left-[calc(16.7%+1rem)] right-[calc(16.7%+1rem)] h-0.5 bg-orange-200" />

            {HOW_IT_WORKS.map((item, i) => (
              <div
                key={i}
                className="relative flex flex-col items-center text-center flex-1 gap-3"
              >
                <div className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold shadow-lg z-10">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="text-gray-500 text-sm max-w-[160px]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Providers + Why Choose Us */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Featured Providers */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-gray-900 text-2xl font-bold">Öne Çıkan Uzmanlar</h2>
                <button
                  onClick={() => navigate("/search")}
                  className="text-orange-500 hover:underline text-sm font-medium flex items-center gap-1"
                >
                  Tümünü Gör <ArrowRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {featured.loading && !featured.data
                  ? Array.from({ length: FEATURED_LIMIT }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm animate-pulse"
                      >
                        <div className="h-32 bg-gray-100" />
                        <div className="p-4 flex flex-col gap-2">
                          <div className="h-4 bg-gray-100 rounded w-2/3 mx-auto" />
                          <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" />
                          <div className="h-3 bg-gray-100 rounded w-1/3 mx-auto mt-1" />
                          <div className="h-9 bg-gray-100 rounded mt-3" />
                        </div>
                      </div>
                    ))
                  : featured.error
                  ? (
                      <p className="text-gray-400 text-sm col-span-full text-center py-8">
                        Öne çıkan uzmanlar yüklenemedi.
                      </p>
                    )
                  : (featured.data ?? []).map((pro) => (
                      <ProfessionalCard
                        key={pro.id}
                        professional={pro}
                        onBook={handleBook}
                      />
                    ))}
              </div>
            </div>

            {/* Why Choose Us */}
            <div className="flex flex-col justify-center gap-4">
              <h2 className="text-gray-900 text-2xl font-bold">Neden UzmanBaba?</h2>
              {[
                { icon: "✅", title: "Doğrulanmış Uzmanlar", desc: "Her uzman kimlik ve belge kontrolünden geçer." },
                { icon: "🔒", title: "Güvenli Ödeme", desc: "İş tamamlanmadan ödeme çıkmaz." },
                { icon: "⭐", title: "Garantili Memnuniyet", desc: "Memnun kalmazsanız iade garantisi." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 items-start">
                  <span className="text-2xl mt-0.5">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-14 px-4 bg-orange-500">
        <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-4">
          <h2 className="text-white text-3xl font-extrabold">Uzmanınızı Bugün Bulun</h2>
          <p className="text-orange-100 text-base">
            Binlerce doğrulanmış uzman sizi bekliyor. Baba sorunu çözer!
          </p>
          <button
            onClick={() => navigate("/search")}
            className="bg-white text-orange-500 hover:bg-orange-50 font-bold px-8 py-3 rounded-xl transition-colors text-sm"
          >
            Hemen Başla
          </button>
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