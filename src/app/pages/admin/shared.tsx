import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button, Input, Tag, type TagTone } from "../../components/ds";
import type { PaymentStatus } from "../../data/payments";
import type { AttentionReason } from "../../data/admin";
import { formatScheduledAt } from "../dashboard/shared";

/* ═══════════════════════════════════════════════════════════════════════════
 * Pieces the admin tabs share: filter row, search box, pager and the
 * payment vocabulary.
 * ═══════════════════════════════════════════════════════════════════════ */

/** ISO → "14 May 2026 10:00". */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const { date, time } = formatScheduledAt(iso);
  return `${date} ${time}`;
}

/** A row of mutually exclusive filters, styled like the dashboard's status bar. */
export function FilterBar<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ id: T; label: string }>;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-6 flex gap-x-6 gap-y-1 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={
              "flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-b-2 text-sm whitespace-nowrap transition-colors " +
              (active
                ? "border-brand font-display font-extrabold text-brand-800"
                : "border-transparent text-ink/70 hover:text-ink")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Search applied on submit, so every keystroke isn't a request. */
export function SearchBox({
  value,
  onSearch,
  placeholder,
}: {
  value: string;
  onSearch: (q: string) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(draft.trim());
  };

  return (
    <form role="search" onSubmit={submit} className="flex max-w-md gap-2">
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1"
      />
      <Button type="submit" variant="secondary" aria-label="Ara">
        <Search size={15} aria-hidden="true" />
      </Button>
    </form>
  );
}

export function Pager({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-ink/70">
      <span className="tnum">
        {total} kayıt · Sayfa {page} / {totalPages}
      </span>
      <span className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={15} aria-hidden="true" />
          Önceki
        </Button>
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Sonraki
          <ChevronRight size={15} aria-hidden="true" />
        </Button>
      </span>
    </div>
  );
}

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: TagTone }> = {
  pending: { label: "Bekliyor", tone: "neutral" },
  succeeded: { label: "Ödendi", tone: "success" },
  failed: { label: "Başarısız", tone: "danger" },
  refunding: { label: "İade işleniyor", tone: "accent" },
  refunded: { label: "İade edildi", tone: "neutral" },
};

export function PaymentStatusTag({ status }: { status: PaymentStatus }) {
  const { label, tone } = PAYMENT_STATUS[status] ?? { label: status, tone: "neutral" };
  return <Tag tone={tone}>{label}</Tag>;
}

export const ATTENTION_LABEL: Record<AttentionReason, string> = {
  refund_unknown: "İade sonucu bilinmiyor",
  refund_failed: "İptal edildi, para iade edilmedi",
};

export function AttentionTag({ reason }: { reason: AttentionReason }) {
  return (
    <Tag tone="danger" className="gap-1.5">
      <AlertTriangle size={12} aria-hidden="true" />
      {ATTENTION_LABEL[reason]}
    </Tag>
  );
}
