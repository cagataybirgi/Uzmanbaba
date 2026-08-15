import type { ReactNode } from "react";
import { LogoTile } from "./ds";

/* ═══════════════════════════════════════════════════════════════════════════
 * AuthLayout — the split used by the sign-in and sign-up routes.
 *
 * The form sits on the ground at the left; the right column is the one
 * place the accent runs as a full field, carrying the brand block and the
 * proof points. The panel is decorative reinforcement, so it drops below
 * `lg` rather than stacking and pushing the form down the page.
 * ═════════════════════════════════════════════════════════════════════════ */

export function AuthLayout({
  children,
  panel,
}: {
  children: ReactNode;
  panel: ReactNode;
}) {
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
      <div className="w-full px-6 py-14 md:py-20 lg:ml-auto lg:max-w-[560px] lg:pr-[clamp(24px,6vw,96px)]">
        {children}
      </div>
      <aside className="hidden bg-brand-700 px-[clamp(24px,4vw,56px)] py-20 text-paper lg:block">
        {panel}
      </aside>
    </div>
  );
}

/** The brand block that opens every auth panel. */
export function AuthPanelBrand() {
  return (
    <>
      <LogoTile size={88} invert />
      <p className="mt-6 font-display text-xl font-extrabold tracking-[-0.02em]">
        UzmanBaba
      </p>
    </>
  );
}

/** A 2×2 grid of proof figures, ruled off from what sits above it. */
export function AuthPanelStats({
  items,
}: {
  items: { value: string; label: string }[];
}) {
  return (
    <div className="mt-14 grid grid-cols-2 gap-7 border-t-2 border-paper pt-7">
      {items.map((s) => (
        <div key={s.label}>
          <p className="font-display text-[32px] leading-none font-extrabold">
            {s.value}
          </p>
          <p className="mt-3.5 text-[13px] tracking-[0.08em] uppercase">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
