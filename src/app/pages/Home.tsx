import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight } from "lucide-react";
import { ProfessionalTable } from "../components/ProfessionalTable";
import { ALL_CITIES_VALUE, SearchForm } from "../components/SearchForm";
import { BookingModal } from "../components/BookingModal";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  FeatureBlock,
  Kicker,
  Rule,
  RuledRow,
  SectionHeading,
  Shell,
  SkeletonRows,
  Stat,
} from "../components/ds";
import {
  useFeaturedProfessionals,
  useProfessionalStats,
  type Professional,
} from "../data/professionals";
import { buildSearchPath } from "../lib/searchQuery";

const FEATURED_LIMIT = 3;

const SERVICES = [
  { n: "01", title: "Temizlik", desc: "Konut ve ticari temizlik hizmetleri." },
  { n: "02", title: "Nakliyat", desc: "Yerel ve uzun mesafeli taşımacılık." },
  { n: "03", title: "Tesisat", desc: "Onarım, kurulum ve bakım." },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Ara", desc: "İhtiyacınız olan hizmeti bulun." },
  { step: "2", title: "Rezerve Et", desc: "Uygun tarihi seç, randevunu oluştur." },
  { step: "3", title: "Tamamlandı", desc: "Uzman işi tamamlar, siz rahatlarsınız." },
];

const WHY_US = [
  {
    title: "E-posta Doğrulaması",
    desc: "Uzman hesapları platformda listelenmeden önce e-posta doğrulamasından geçer.",
  },
  {
    title: "Doğrudan İletişim",
    desc: "Uzman seni arar, detayları birlikte netleştirirsiniz.",
  },
  {
    title: "Gerçek Değerlendirmeler",
    desc: "Puanlar yalnızca tamamlanmış işlerden gelir.",
  },
];

const POPULAR = ["Temizlik", "Tesisat", "Nakliyat", "Elektrik"];

const integerFormatter = new Intl.NumberFormat("tr-TR");
const ratingFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function Home() {
  const [selectedCity, setSelectedCity] = useState(ALL_CITIES_VALUE);
  const [serviceQuery, setServiceQuery] = useState("");
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const featured = useFeaturedProfessionals(FEATURED_LIMIT);
  const platformStats = useProfessionalStats();

  const statItems = platformStats.data?.emailVerifiedProfessionals
    ? [
        {
          value: integerFormatter.format(
            platformStats.data.emailVerifiedProfessionals,
          ),
          label: "E-posta doğrulamalı uzman",
        },
        {
          value: integerFormatter.format(platformStats.data.citiesServed),
          label: "Hizmet verilen şehir",
        },
        ...(platformStats.data.averageRating === null
          ? []
          : [
              {
                value: ratingFormatter.format(
                  platformStats.data.averageRating,
                ),
                label: "Ortalama uzman puanı",
              },
            ]),
        {
          value: integerFormatter.format(platformStats.data.completedJobs),
          label: "Tamamlanan iş",
        },
      ]
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(buildSearchPath({ query: serviceQuery, city: selectedCity }));
  };

  const handleBook = (pro: Professional) => {
    setSelectedPro(pro);
    setModalOpen(true);
  };

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <Shell as="section" className="pt-16 pb-14 md:pt-28 md:pb-20">
        <Kicker className="mb-3.5">
          Yerel hizmet ağı
          {platformStats.data && platformStats.data.citiesServed > 0
            ? ` — ${integerFormatter.format(platformStats.data.citiesServed)} şehir`
            : ""}
        </Kicker>
        <h1 className="t-display">
          <span className="block">Yerel Hizmetleri</span>
          <span className="block text-brand">Anında Bul.</span>
        </h1>
        <p className="t-lead mt-7 max-w-[58ch]">
          Kapınıza kadar güvenilir uzmanlar. Temizlikten tesisata, nakliyattan
          elektriğe — baba halleder.
        </p>

        <SearchForm
          className="mt-10"
          query={serviceQuery}
          city={selectedCity}
          onQueryChange={setServiceQuery}
          onCityChange={setSelectedCity}
          onSubmit={handleSearch}
        />

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink/70">Popüler:</span>
          {POPULAR.map((label) => (
            <Link
              key={label}
              to={buildSearchPath({ query: label })}
              className="inline-flex min-h-11 items-center border border-brand px-3 text-[13px] text-brand-800 no-underline transition-colors hover:bg-brand hover:text-paper"
            >
              {label}
            </Link>
          ))}
        </div>
      </Shell>

      {/* ── Stats band ───────────────────────────────────────────────── */}
      {statItems.length > 0 && (
        <Shell
          as="section"
          aria-label="Platform istatistikleri"
          className="pb-14 md:pb-[70px]"
        >
          <div
            className={`grid grid-cols-2 gap-x-7 gap-y-10 ${
              statItems.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"
            }`}
          >
            {statItems.map((item) => (
              <Stat
                key={item.label}
                value={item.value}
                label={item.label}
                size="lg"
              />
            ))}
          </div>
        </Shell>
      )}

      <Shell>
        <Rule />
      </Shell>

      {/* ── Services ─────────────────────────────────────────────────── */}
      <Shell as="section" id="hizmetler" className="pt-14 pb-14 md:pt-20">
        <Kicker className="mb-6">Popüler Hizmetler</Kicker>
        {SERVICES.map((svc, i) => (
          <Link
            key={svc.title}
            to={buildSearchPath({ query: svc.title })}
            className="group block text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <RuledRow
              index={svc.n}
              title={
                <span className="transition-colors group-hover:text-brand-800 group-focus-visible:text-brand-800">
                  {svc.title}
                </span>
              }
              className={`transition-colors group-hover:bg-brand-100 group-focus-visible:bg-brand-100 ${
                i === 0 ? "border-t-0 md:border-t-2" : ""
              }`}
            >
              {svc.desc}
            </RuledRow>
          </Link>
        ))}
      </Shell>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-surface">
        <Shell className="py-16 md:py-20">
          <Kicker as="h2" className="mb-10">
            Nasıl Çalışır?
          </Kicker>
          <div className="grid gap-10 md:grid-cols-3 md:gap-x-[clamp(24px,4vw,72px)]">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="border-t-2 border-rule pt-7">
                <p className="t-figure text-5xl">{item.step}</p>
                <h3 className="t-row-title mt-7">{item.title}</h3>
                <p className="t-body mt-3.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </Shell>
      </section>

      {/* ── Featured professionals ───────────────────────────────────── */}
      <Shell as="section" id="uzmanlar" className="py-16 md:py-20">
        <SectionHeading
          action={
            <ButtonLink to="/search" variant="ghost">
              Tümünü Gör
              <ArrowRight size={15} aria-hidden="true" />
            </ButtonLink>
          }
        >
          Öne Çıkan Uzmanlar
        </SectionHeading>

        {featured.loading && !featured.data ? (
          <SkeletonRows rows={FEATURED_LIMIT} />
        ) : featured.error ? (
          <ErrorState
            title="Öne çıkan uzmanlar yüklenemedi"
            message={featured.error}
            onRetry={featured.refetch}
          />
        ) : (featured.data ?? []).length === 0 ? (
          <EmptyState
            title="Henüz uzman yok"
            description="Listelenecek uzman bulunamadı. Kısa süre içinde tekrar dene."
            action={
              <ButtonLink to="/search" variant="primary">
                Uzman Ara
              </ButtonLink>
            }
          />
        ) : (
          <ProfessionalTable
            professionals={featured.data ?? []}
            onBook={handleBook}
            caption="Öne çıkan uzmanlar"
          />
        )}
      </Shell>

      {/* ── Why us ───────────────────────────────────────────────────── */}
      <Shell as="section" className="pb-16 md:pb-20">
        <Rule className="mb-10" />
        <Kicker as="h2" className="mb-10">
          Neden UzmanBaba?
        </Kicker>
        <div className="grid gap-10 md:grid-cols-3 md:gap-x-[clamp(24px,4vw,72px)]">
          {WHY_US.map((item) => (
            <FeatureBlock key={item.title} title={item.title}>
              {item.desc}
            </FeatureBlock>
          ))}
        </div>
      </Shell>

      {/* ── Closing banner ───────────────────────────────────────────── */}
      <section className="bg-brand-700 text-paper">
        <Shell className="py-16 md:py-20">
          <h2 className="font-display text-[clamp(34px,4.2vw,56px)] leading-[1.06] font-extrabold tracking-[-0.015em] -ml-[0.058em]">
            <span className="block">Uzman mısın?</span>
            <span className="block">İşler seni bulsun.</span>
          </h2>
          <p className="t-lead mt-7 max-w-[48ch]">
            Yeni müşterilere ulaş, rezervasyonlarını tek yerden yönet. Baba
            sorunu çözer!
          </p>
          <div className="mt-10">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate("/register")}
              className="border-paper text-paper hover:bg-paper/15 active:bg-paper/25"
            >
              Uzman Olarak Kaydol
            </Button>
          </div>
        </Shell>
      </section>

      <BookingModal
        professional={selectedPro}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
