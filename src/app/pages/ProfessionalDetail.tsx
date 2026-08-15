import { useState } from "react";
import { useParams } from "react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useProfessional } from "../data/professionals";
import { useProfessionalReviews } from "../data/reviews";
import { BookingModal } from "../components/BookingModal";
import {
  Button,
  ButtonLink,
  ErrorState,
  FeatureBlock,
  Kicker,
  Photo,
  Shell,
  Skeleton,
  Table,
  Tag,
  Td,
} from "../components/ds";

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
    <div
      className="flex items-center gap-0.5 text-brand"
      role="img"
      aria-label={`5 üzerinden ${rating} puan`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={15}
          aria-hidden="true"
          className={n <= rating ? "fill-brand" : "text-ink/25"}
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

  /* ── Loading (full page) ─────────────────────────────────────────────── */

  if (pro.loading && !pro.data) {
    return (
      <Shell className="py-14 md:py-16" aria-busy="true">
        <span className="sr-only">Uzman profili yükleniyor…</span>
        <div className="flex flex-col gap-7 border-y-2 border-rule py-10 sm:flex-row">
          <Skeleton className="h-[150px] w-[120px] shrink-0" />
          <div className="flex flex-1 flex-col gap-4">
            <Skeleton className="h-12 w-3/5" />
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Skeleton className="h-56" />
          <Skeleton className="h-40" />
        </div>
      </Shell>
    );
  }

  /* ── Error / not found ───────────────────────────────────────────────── */

  if (pro.error || !pro.data) {
    return (
      <Shell className="py-16 md:py-20">
        <ErrorState
          title="Uzman bulunamadı"
          message={
            pro.error ??
            "Aradığınız uzman mevcut değil ya da kaldırılmış olabilir."
          }
        />
        <div className="mt-7">
          <ButtonLink to="/search" variant="primary">
            Aramaya dön
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  const p = pro.data;
  const reviewItems = reviews.data?.items ?? [];

  return (
    <>
      <Shell className="py-10 md:py-14">
        <ButtonLink to="/search" variant="ghost" className="mb-7 -ml-4">
          <ArrowLeft size={15} aria-hidden="true" />
          Aramaya Dön
        </ButtonLink>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="grid gap-7 border-y-2 border-rule py-10 sm:grid-cols-[120px_minmax(0,1fr)] lg:grid-cols-[120px_minmax(0,1fr)_auto] lg:gap-x-[clamp(24px,4vw,64px)]">
          <Photo src={p.avatar} name={p.name} alt="" size={120} portrait />

          <div>
            <h1 className="font-display text-[clamp(32px,4vw,52px)] leading-[1.06] font-extrabold tracking-[-0.02em] -ml-[0.058em]">
              {p.name}
            </h1>
            <p className="t-lead mt-3.5">{p.title}</p>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] tracking-[0.08em] text-ink/70 uppercase">
              <span>{p.location}</span>
              <span className="tnum">
                {(p.rating ?? 0).toFixed(1).replace(".", ",")} ({p.reviews})
              </span>
              <Tag tone={p.available ? "accent" : "neutral"}>
                {p.available ? "Bugün Müsait" : "Dolu"}
              </Tag>
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-1 lg:justify-self-end">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto"
            >
              Hemen Rezerve Et
            </Button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="grid gap-10 pt-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-x-[clamp(24px,5vw,72px)]">
          <div>
            <Kicker as="h2" className="mb-3.5">
              Hakkında
            </Kicker>
            <p className="t-body max-w-[58ch] whitespace-pre-line">
              {p.bio?.trim()
                ? p.bio
                : `${p.name}, ${p.title.toLocaleLowerCase("tr-TR")} alanında hizmet veriyor. Daha fazla bilgi için iletişime geçebilirsiniz.`}
            </p>

            <Kicker as="h2" className="mt-14 mb-3.5">
              Değerlendirmeler ({reviews.data?.total ?? p.reviews})
            </Kicker>

            {reviews.loading && !reviews.data && (
              <div aria-busy="true" className="flex flex-col gap-4 pt-4">
                <span className="sr-only">Değerlendirmeler yükleniyor…</span>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border-t-2 border-rule pt-7">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="mt-3 h-4 w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {reviews.error && !reviews.loading && (
              <ErrorState
                title="Değerlendirmeler yüklenemedi"
                message={reviews.error}
              />
            )}

            {!reviews.loading && !reviews.error && reviewItems.length === 0 && (
              <p className="t-body border-t-2 border-rule pt-7">
                Henüz değerlendirme yapılmamış. Tamamlanan bir rezervasyonun
                ardından ilk değerlendirmeyi sen yapabilirsin.
              </p>
            )}

            {!reviews.loading &&
              !reviews.error &&
              reviewItems.map((r) => (
                <article key={r.id} className="border-t-2 border-rule py-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <p className="font-display text-[15px] font-extrabold">
                      {r.author.name}
                    </p>
                    <p className="tnum text-[13px] text-ink/70">
                      {formatReviewDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="mt-1.5">
                    <Stars rating={r.rating} />
                  </div>
                  {r.comment && (
                    <p className="t-body mt-3.5 max-w-[52ch] whitespace-pre-line">
                      {r.comment}
                    </p>
                  )}
                </article>
              ))}

            {reviews.data && reviews.data.totalPages > 1 && (
              <nav
                aria-label="Değerlendirme sayfaları"
                className="flex flex-wrap items-center gap-3 border-t-2 border-rule pt-7"
              >
                <Button
                  variant="secondary"
                  onClick={() => setPage((n) => Math.max(1, n - 1))}
                  disabled={page === 1 || reviews.loading}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Önceki
                </Button>
                <span className="tnum text-[13px] tracking-[0.08em] text-ink/70 uppercase">
                  Sayfa {reviews.data.page} / {reviews.data.totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPage((n) => n + 1)}
                  disabled={page >= reviews.data.totalPages || reviews.loading}
                >
                  Sonraki
                  <ChevronRight size={16} aria-hidden="true" />
                </Button>
              </nav>
            )}
          </div>

          {/* ── Aside ─────────────────────────────────────────────────── */}
          <aside>
            <Kicker as="h2" className="mb-3.5">
              İstatistikler
            </Kicker>
            <Table caption={`${p.name} istatistikleri`} stack={false}>
              <tbody>
                <tr>
                  <Td>Tamamlanan iş</Td>
                  <Td className="tnum text-right font-display font-extrabold">
                    {p.completedJobs ?? "—"}
                  </Td>
                </tr>
                <tr>
                  <Td>Ortalama puan</Td>
                  <Td className="tnum text-right font-display font-extrabold">
                    {p.rating ? `${p.rating.toFixed(1).replace(".", ",")} / 5` : "—"}
                  </Td>
                </tr>
                <tr>
                  <Td>Üyelik</Td>
                  <Td className="text-right font-display font-extrabold">
                    {p.joinDate ?? "—"}
                  </Td>
                </tr>
              </tbody>
            </Table>

            <FeatureBlock
              title="Güvenli Rezervasyon"
              className="mt-14 border-t-2 border-rule pt-7"
            >
              Değerlendirmeler yalnızca tamamlanmış rezervasyonlardan
              yapılabilir. Bir sorun yaşarsan destek ekibimize ulaşabilirsin.
            </FeatureBlock>
          </aside>
        </div>
      </Shell>

      <BookingModal
        professional={p}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
