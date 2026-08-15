import type { ElementType, ReactNode } from "react";
import { cn } from "../ui/utils";

/* ═══════════════════════════════════════════════════════════════════════════
 * Layout — the shell, the rules and the page headers.
 *
 * The grid is what organises this system: a 1200px measure, generous
 * gutters, and 2px rules between every major block. Everything is flush
 * left; nothing is centred.
 * ═════════════════════════════════════════════════════════════════════════ */

/** The 1200px measure every page sits inside. */
export function Shell({
  as: Tag = "div",
  id,
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  id?: string;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <Tag
      id={id}
      className={cn("mx-auto w-full max-w-[1200px] px-6", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** A section inside the shell, with the system's vertical rhythm. */
export function Section({
  as: Tag = "section",
  id,
  className,
  children,
}: {
  as?: ElementType;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag id={id} className={cn("py-14 md:py-[70px]", className)}>
      {children}
    </Tag>
  );
}

/** The strong 2px rule. Never soften it to a hairline. */
export function Rule({ className }: { className?: string }) {
  return <hr className={cn("m-0 h-0.5 border-0 bg-rule", className)} />;
}

/** The uppercase accent label that opens a section. */
export function Kicker({
  children,
  muted,
  className,
  as: Tag = "p",
}: {
  children: ReactNode;
  muted?: boolean;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag className={cn("t-kicker", muted && "t-kicker-muted", className)}>
      {children}
    </Tag>
  );
}

/* ── Page header ───────────────────────────────────────────────────────────
 * Kicker / title / lead — the opening of every routed page that isn't the
 * landing hero. `size` picks the type role so a dashboard tab and a legal
 * page share the same component without sharing a font size.
 * ─────────────────────────────────────────────────────────────────────── */

export function PageHeader({
  kicker,
  title,
  lead,
  size = "title",
  actions,
  className,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  size?: "title" | "panel" | "display";
  actions?: ReactNode;
  className?: string;
}) {
  const titleClass =
    size === "display" ? "t-display" : size === "panel" ? "t-panel" : "t-title";

  return (
    <header className={cn("flex flex-col", className)}>
      {kicker && <Kicker className="mb-3.5">{kicker}</Kicker>}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <h1 className={titleClass}>{title}</h1>
        {actions}
      </div>
      {lead && <p className="t-lead mt-3.5 max-w-[58ch]">{lead}</p>}
    </header>
  );
}

/* ── Section heading ───────────────────────────────────────────────────────
 * An h2 with an optional trailing action, sitting on the same baseline.
 * ─────────────────────────────────────────────────────────────────────── */

export function SectionHeading({
  children,
  action,
  className,
  id,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        "mb-7 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3",
        className,
      )}
    >
      <h2 id={id} className="t-section">
        {children}
      </h2>
      {action}
    </div>
  );
}

/* ── Ruled row ─────────────────────────────────────────────────────────────
 * The numbered editorial row: index / title / body. Used by the services
 * list on the landing page and by every informational page.
 * ─────────────────────────────────────────────────────────────────────── */

export function RuledRow({
  index,
  title,
  children,
  className,
}: {
  index: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ruled-row", className)}>
      <p className="tnum m-0 font-display text-[15px] leading-7 font-extrabold">
        {index}
      </p>
      <h2 className="t-row-title">{title}</h2>
      {children ? <p className="t-body max-w-[52ch]">{children}</p> : <span />}
    </div>
  );
}

/* ── Stat ──────────────────────────────────────────────────────────────────
 * The oversized accent figure over an uppercase label.
 * ─────────────────────────────────────────────────────────────────────── */

export function Stat({
  value,
  label,
  size = "md",
  className,
}: {
  value: ReactNode;
  label: ReactNode;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div className={className}>
      <p
        className={cn(
          "t-figure",
          size === "lg"
            ? "text-[clamp(34px,3.4vw,48px)]"
            : "text-[clamp(30px,3vw,40px)]",
        )}
      >
        {value}
      </p>
      <p className="mt-3.5 text-[13px] leading-tight tracking-[0.08em] text-ink/70 uppercase">
        {label}
      </p>
    </div>
  );
}

/* ── Marker ────────────────────────────────────────────────────────────────
 * The 10px accent square that opens a feature block. The system's only
 * ornament, and it is a rectangle.
 * ─────────────────────────────────────────────────────────────────────── */

export function Marker({ className }: { className?: string }) {
  return <div className={cn("size-2.5 bg-brand", className)} aria-hidden="true" />;
}

/** A feature block: marker, heading, copy. */
export function FeatureBlock({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Marker />
      <h3 className="t-sub mt-4.5">{title}</h3>
      <p className="t-body mt-3.5">{children}</p>
    </div>
  );
}
