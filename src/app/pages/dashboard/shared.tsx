import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { Tag, type TagTone } from "../../components/ds";
import type { BookingStatus } from "../../data/bookings";

/* ═══════════════════════════════════════════════════════════════════════════
 * Pieces every dashboard tab shares: the date/price formatters and the
 * booking-status vocabulary.
 * ═══════════════════════════════════════════════════════════════════════ */

export const TR_MONTHS_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

/** ISO → "14 May 2026" / "10:00" pair, in the user's local time. */
export function formatScheduledAt(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  const date = `${d.getDate()} ${TR_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return { date, time: `${hh}:${mm}` };
}

export function formatPrice(cents: number | null): string {
  if (cents === null) return "—";
  return `₺${(cents / 100).toLocaleString("tr-TR")}`;
}

export const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; tone: TagTone; Icon: typeof CheckCircle2 }
> = {
  confirmed: { label: "Onaylandı", tone: "accent", Icon: CheckCircle2 },
  completed: { label: "Tamamlandı", tone: "success", Icon: CheckCircle2 },
  pending: { label: "Beklemede", tone: "neutral", Icon: Clock },
  cancelled: { label: "İptal", tone: "danger", Icon: XCircle },
};

/** The status of a booking — an icon and a word, never colour alone. */
export function StatusTag({ status }: { status: BookingStatus }) {
  const { label, tone, Icon } = STATUS_CONFIG[status] ?? {
    label: status,
    tone: "neutral" as TagTone,
    Icon: Circle,
  };
  return (
    <Tag tone={tone} className="gap-1.5">
      <Icon size={12} aria-hidden="true" />
      {label}
    </Tag>
  );
}

/* ── Status filter row ─────────────────────────────────────────────────────
 * A ruled row of toggles over a booking list. Rendered as a tablist so a
 * keyboard user can arrow between filters.
 * ─────────────────────────────────────────────────────────────────────── */

export type StatusFilter = BookingStatus | "all";

export function StatusFilterBar({
  value,
  onChange,
  counts,
  order,
}: {
  value: StatusFilter;
  onChange: (next: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
  order: StatusFilter[];
}) {
  return (
    <div
      role="group"
      aria-label="Duruma göre filtrele"
      className="-mx-6 flex gap-x-6 gap-y-1 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {order.map((f) => {
        const active = value === f;
        const label = f === "all" ? "Tümü" : STATUS_CONFIG[f].label;
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            aria-pressed={active}
            className={
              "flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-b-2 text-sm whitespace-nowrap transition-colors " +
              (active
                ? "border-brand font-display font-extrabold text-brand-800"
                : "border-transparent text-ink/70 hover:text-ink")
            }
          >
            {label}
            <span className="tnum text-xs text-ink/50">{counts[f] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
