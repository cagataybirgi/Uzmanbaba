/**
 * Initial route-loading surface used while React Router resolves a lazy page.
 * It is intentionally dependency-free so it stays in the small entry bundle.
 */
export function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh items-center justify-center bg-paper px-6 text-ink"
    >
      <div className="w-full max-w-sm border-y-2 border-rule py-7">
        <p className="text-[13px] font-semibold tracking-[0.12em] text-brand-800 uppercase">
          UzmanBaba
        </p>
        <p className="mt-3 font-display text-2xl font-extrabold">
          Sayfa yükleniyor…
        </p>
        <div
          aria-hidden="true"
          className="mt-7 h-0.5 w-full origin-left animate-pulse bg-brand"
        />
      </div>
    </div>
  );
}
