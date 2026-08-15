import { Link, isRouteErrorResponse, useNavigate, useRouteError } from "react-router";
import { Home, RefreshCw } from "lucide-react";
import { Button, ButtonLink, Kicker, Logo, Shell } from "../components/ds";

/**
 * Route-level error surface. Catches anything thrown in Root or its
 * descendants — render errors, loader/action errors, thrown Responses —
 * and gives the user a way forward instead of a blank page.
 */
export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  // Extract a user-friendly title + message based on error type
  let title = "Bir şeyler ters gitti";
  let message =
    "Beklenmedik bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin.";
  let statusCode: number | null = null;

  if (isRouteErrorResponse(error)) {
    // Thrown Response (e.g. from a loader/action)
    statusCode = error.status;
    if (error.status === 404) {
      title = "Sayfa bulunamadı";
      message = "Aradığınız sayfa mevcut değil.";
    } else if (error.status === 401 || error.status === 403) {
      title = "Yetkisiz erişim";
      message = "Bu sayfayı görüntüleme izniniz yok.";
    } else if (error.status >= 500) {
      title = "Sunucu hatası";
      message = "Sunucularımızda bir sorun var. Birazdan tekrar deneyin.";
    } else {
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  // Log to console in dev so developers can see the stack
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.error("Route error:", error);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      {/* The boundary replaces the whole Root layout, so it carries its own
          minimal header — the page should never look unbranded. */}
      <header className="border-b-2 border-rule">
        <Shell className="flex h-14 items-center">
          <Link to="/" className="text-ink no-underline" aria-label="Ana sayfa">
            <Logo size={26} />
          </Link>
        </Shell>
      </header>

      <Shell className="flex-1 py-16 md:py-28" as="main">
      <Kicker className="mb-3.5">
        {statusCode ? `Hata ${statusCode}` : "Hata"}
      </Kicker>

      {statusCode && (
        <p className="t-figure text-[clamp(72px,12vw,180px)] leading-[0.9]">
          {statusCode}
        </p>
      )}

      <h1 className="t-title mt-10">{title}</h1>
      <p className="t-lead mt-3.5 max-w-[48ch]" role="alert">
        {message}
      </p>

      {import.meta.env?.DEV && error instanceof Error && error.stack && (
        <details className="mt-10 border-2 border-rule bg-surface p-4">
          <summary className="cursor-pointer text-xs font-semibold tracking-wide text-ink/70 uppercase">
            Geliştirici Detayları
          </summary>
          <pre className="mt-3 overflow-x-auto text-[11px] leading-relaxed break-all whitespace-pre-wrap text-ink/70">
            {error.stack}
          </pre>
        </details>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Button
          variant="primary"
          size="lg"
          // A soft refresh re-runs the route; if the failure is in render
          // itself the user still gets a clean second attempt.
          onClick={() => navigate(0)}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Sayfayı Yenile
        </Button>
        <ButtonLink to="/" variant="secondary" size="lg">
          <Home size={16} aria-hidden="true" />
          Ana Sayfa
        </ButtonLink>
        </div>
      </Shell>
    </div>
  );
}
