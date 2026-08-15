import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "../ui/utils";
import { Button } from "./Button";

/* ═══════════════════════════════════════════════════════════════════════════
 * Feedback — loading, empty, error and status surfaces.
 *
 * All four speak the same structural language as the rest of the system:
 * ruled blocks on the ground, no cards, no rounded corners, colour never
 * carrying meaning on its own.
 * ═════════════════════════════════════════════════════════════════════════ */

/* ── Spinner ───────────────────────────────────────────────────────────── */

export function Spinner({
  size = 16,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("animate-spin shrink-0", className)}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V1C5.9 1 1 5.9 1 12h3z"
      />
    </svg>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────────
 * Rectangular blocks on the surface tone — the system has no rounded
 * placeholders. Always paired with an aria-busy region by the caller.
 * ─────────────────────────────────────────────────────────────────────── */

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("bg-ink/8 animate-pulse-rule", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

/** A ruled placeholder record, matching the shape of a table row. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="border-t-2 border-rule">
      <span className="sr-only">Yükleniyor…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-rule-soft py-4"
        >
          <Skeleton className="size-10 shrink-0" />
          <Skeleton className="h-4 w-2/5 max-w-48" />
          <Skeleton className="ml-auto hidden h-4 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="border-y-2 border-rule px-0 py-14">
      {icon && <div className="text-brand mb-6">{icon}</div>}
      <h2 className="t-row-title">{title}</h2>
      {description && (
        <p className="t-body mt-3.5 max-w-[48ch]">{description}</p>
      )}
      {action && <div className="mt-7 flex flex-wrap gap-3">{action}</div>}
    </div>
  );
}

/* ── Error state ───────────────────────────────────────────────────────── */

export function ErrorState({
  title = "Bir şeyler ters gitti",
  message,
  onRetry,
  retryLabel = "Tekrar dene",
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div role="alert" className="border-y-2 border-rule py-14">
      <p className="t-kicker flex items-center gap-2 text-danger">
        <AlertTriangle size={14} aria-hidden="true" />
        Hata
      </p>
      <h2 className="t-row-title mt-3.5">{title}</h2>
      {message && <p className="t-body mt-3.5 max-w-[48ch]">{message}</p>}
      {onRetry && (
        <Button variant="primary" className="mt-7" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/* ── Inline alert ──────────────────────────────────────────────────────────
 * For form-level messages. `error` announces assertively; the others are
 * polite. An icon always accompanies the tint so colour is never the only
 * signal.
 * ─────────────────────────────────────────────────────────────────────── */

export type AlertTone = "error" | "success" | "info";

const ALERT_TONE: Record<
  AlertTone,
  { className: string; Icon: typeof Info; role: "alert" | "status" }
> = {
  error: {
    className: "border-danger/50 bg-danger-tint text-danger",
    Icon: AlertTriangle,
    role: "alert",
  },
  success: {
    className: "border-success/50 bg-success-tint text-success",
    Icon: CheckCircle2,
    role: "status",
  },
  info: {
    className: "border-rule bg-surface text-ink",
    Icon: Info,
    role: "status",
  },
};

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}) {
  const { className: toneClass, Icon, role } = ALERT_TONE[tone];
  return (
    <p
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-2.5 border px-3.5 py-3 text-sm leading-relaxed",
        toneClass,
        className,
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/* ── Status tag ────────────────────────────────────────────────────────────
 * Booking / availability states. Square, tinted from the ramps, and always
 * carrying its own word — never a bare colour swatch.
 * ─────────────────────────────────────────────────────────────────────── */

export type TagTone = "accent" | "neutral" | "outline" | "danger" | "success";

const TAG_TONE: Record<TagTone, string> = {
  accent: "bg-brand-100 text-brand-800",
  neutral: "bg-ink/8 text-ink/75",
  outline: "border border-brand text-brand-800",
  danger: "bg-danger-tint text-danger",
  success: "bg-success-tint text-success",
};

export function Tag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: TagTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-[11px] leading-none font-semibold tracking-[0.02em] whitespace-nowrap",
        TAG_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
