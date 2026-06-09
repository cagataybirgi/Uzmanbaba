import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  Star,
  MapPin,
  CheckCircle,
  ArrowLeft,
  Calendar,
  Briefcase,
  ShieldCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useProfessional } from "../data/professionals";
import { useProfessionalReviews } from "../data/reviews";
import { BookingModal } from "../components/BookingModal";

const REVIEWS_PER_PAGE = 5;

/** ISO → "12 May 2026" in the user's local tz. */
const TR_MONTHS_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];
function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${TR_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= rating ? "fill-orange-500 text-orange-500" : "text-gray-300"}
        />
      ))}
    </div>
  );
}

export function ProfessionalDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const pro = useProfessional(id);
  const [page, setPage] = useState(1);
  const reviews = useProfessionalReviews(id, page, REVIEWS_PER_PAGE);
  const [modalOpen, setModalOpen] = useState(false);

  /* ── Loading / error states (full-page) ──────────────────────────────── */

  if (pro.loading && !pro.data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-48 bg-gray-100 rounded-2xl mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-gray-100 rounded-2xl" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (pro.error || !pro.data) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h1 className="text-gray-900 text-2xl font-extrabold">Uzman bulunamadı</h1>
        <p className="text-gray-500 text-sm">
          {pro.error ?? "Aradığınız uzman mevcut değil ya da kaldırılmış olabilir."}
        </p>
        <Link
          to="/search"
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          Aramaya dön
        </Link>
      </div>
    );
  }

  const p = pro.data;

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 flex flex-col gap-6">
        {/* Back link */}
        <Link
          to="/search"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-orange-500 text-sm font-medium w-fit transition-colors"
        >
          <ArrowLeft size={14} /> Aramaya Dön
        </Link>

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Banner background — purely decorative */}
          <div className="h-24 bg-gradient-to-br from-orange-50 to-orange-100" />
          <div className="px-6 sm:px-8 pb-6 -mt-12 flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-white shadow-md flex-shrink-0 bg-gray-100">
              <img
                src={p.avatar}
                alt={p.name}
                className="w-full h-full object-cover object-top"
              />
            </div>

            <div className="flex-1 min-w-0 mt-2 sm:mt-12">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-gray-900 text-2xl font-extrabold">{p.name}</h1>
                {p.available && (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    <CheckCircle size={11} /> Bugün Müsait
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm mt-0.5">{p.title}</p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} /> {p.location}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star size={13} className="fill-orange-500 text-orange-500" />
                  <span className="font-semibold text-gray-700">
                    {p.rating ? p.rating.toFixed(1) : "—"}
                  </span>
                  <span className="text-gray-400">
                    ({p.reviews} değerlendirme)
                  </span>
                </span>
              </div>
            </div>

            <div className="sm:mt-12 w-full sm:w-auto">
              <button
                onClick={() => setModalOpen(true)}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all whitespace-nowrap"
              >
                Hemen Rezerve Et
              </button>
            </div>
          </div>
        </section>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — bio + reviews */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Bio */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-3">Hakkında</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {p.bio?.trim()
                  ? p.bio
                  : `${p.name}, ${p.title.toLocaleLowerCase("tr-TR")} alanında hizmet veriyor. Daha fazla bilgi için iletişime geçebilirsiniz.`}
              </p>
            </section>

            {/* Reviews */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Değerlendirmeler</h2>
                <span className="text-gray-400 text-sm">
                  {reviews.data?.total ?? p.reviews} adet
                </span>
              </div>

              {reviews.loading && !reviews.data && (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {reviews.error && !reviews.loading && (
                <p className="text-red-500 text-sm flex items-center gap-2">
                  <AlertCircle size={14} /> {reviews.error}
                </p>
              )}

              {!reviews.loading && !reviews.error && (reviews.data?.items.length ?? 0) === 0 && (
                <p className="text-gray-400 text-sm">
                  Henüz değerlendirme yapılmamış. İlk değerlendirmeyi siz yapın!
                </p>
              )}

              {!reviews.loading && !reviews.error && (reviews.data?.items ?? []).map((r) => (
                <article key={r.id} className="flex gap-3 py-4 border-b border-gray-100 last:border-b-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                    <img
                      src={r.author.avatar}
                      alt=""
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">
                        {r.author.name}
                      </p>
                      <Stars rating={r.rating} />
                      <span className="text-gray-400 text-xs ml-auto">
                        {formatReviewDate(r.createdAt)}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-gray-600 text-sm mt-2 leading-relaxed whitespace-pre-line">
                        {r.comment}
                      </p>
                    )}
                  </div>
                </article>
              ))}

              {/* Pagination — only when there's more than one page */}
              {reviews.data && reviews.data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || reviews.loading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} /> Önceki
                  </button>
                  <span className="text-sm text-gray-500">
                    Sayfa {reviews.data.page} / {reviews.data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= reviews.data.totalPages || reviews.loading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Sonraki <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* Right column — stats sidebar */}
          <aside className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
              <h3 className="font-bold text-gray-900 text-sm">İstatistikler</h3>
              <Stat
                icon={<Briefcase size={16} className="text-orange-500" />}
                label="Tamamlanan iş"
                value={p.completedJobs?.toString() ?? "—"}
              />
              <Stat
                icon={<Star size={16} className="text-orange-500" />}
                label="Ortalama puan"
                value={p.rating ? `${p.rating.toFixed(1)} / 5` : "—"}
              />
              <Stat
                icon={<Calendar size={16} className="text-orange-500" />}
                label="Üyelik"
                value={p.joinDate ?? "—"}
              />
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 flex gap-3 items-start">
              <ShieldCheck size={20} className="text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Güvenli Rezervasyon
                </p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Tüm uzmanlar kimlik kontrolünden geçer. İş tamamlanmadan ödeme
                  çıkmaz.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <BookingModal
        professional={p}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}
