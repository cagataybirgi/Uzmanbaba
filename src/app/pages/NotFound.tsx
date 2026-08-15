import { ArrowLeft } from "lucide-react";
import { Button, ButtonLink, Kicker, Shell } from "../components/ds";

/**
 * 404 — the oversized accent figure is the page. Three ways back out: home,
 * search (what most people who land here actually want), and the browser's
 * own history.
 */
export function NotFound() {
  return (
    <Shell className="py-16 md:py-28">
      <Kicker className="mb-3.5">Sayfa bulunamadı</Kicker>

      <p className="t-figure text-[clamp(96px,16vw,220px)] leading-[0.9]">404</p>

      <h1 className="t-panel mt-10">Aradığın sayfa burada değil.</h1>
      <p className="t-lead mt-3.5 max-w-[48ch]">
        Bağlantı taşınmış veya hiç var olmamış olabilir. Aramaya dönüp uzman
        bulmaya devam edebilirsin.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to="/" variant="primary" size="lg">
          Ana Sayfa
        </ButtonLink>
        <ButtonLink to="/search" variant="secondary" size="lg">
          Uzman Ara
        </ButtonLink>
      </div>

      <Button
        variant="ghost"
        className="mt-7 -ml-4"
        onClick={() => window.history.back()}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Önceki sayfaya dön
      </Button>
    </Shell>
  );
}
