import { useMemo, useState } from "react";
import { Check, CheckCheck } from "lucide-react";
import {
  Button,
  EmptyState,
  ErrorState,
  Photo,
  SkeletonRows,
  Table,
  Td,
  TdName,
  Th,
} from "../../components/ds";
import {
  formatPrice,
  formatScheduledAt,
  StatusFilterBar,
  StatusTag,
  type StatusFilter,
} from "./shared";
import type { Booking } from "../../data/bookings";

/* ═══════════════════════════════════════════════════════════════════════════
 * Gelen Talepler — the bookings a professional has been asked to take.
 * ═══════════════════════════════════════════════════════════════════════ */

const FILTER_ORDER: StatusFilter[] = [
  "all",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

export type IncomingAction = "confirm" | "complete" | "cancel";

export function IncomingTab({
  bookings,
  loading,
  error,
  onRetry,
  onAction,
  mutatingId,
}: {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAction: (id: string, action: IncomingAction) => void;
  mutatingId: string | null;
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      all: bookings.length,
      confirmed: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const b of bookings) base[b.status] += 1;
    return base;
  }, [bookings]);

  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <>
      <h1 className="t-panel mb-10">Gelen Talepler</h1>

      <div className="mb-7 border-b-2 border-rule">
        <StatusFilterBar
          value={filter}
          onChange={setFilter}
          counts={counts}
          order={FILTER_ORDER}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        <SkeletonRows rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            filter === "all" ? "Henüz talep yok" : "Bu durumda talep yok"
          }
          description={
            filter === "all"
              ? "Profilin yayında. Yeni bir talep geldiğinde burada görünecek."
              : "Farklı bir durum filtresi seçebilirsin."
          }
          action={
            filter !== "all" ? (
              <Button variant="secondary" onClick={() => setFilter("all")}>
                Tümünü Göster
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table caption="Gelen rezervasyon talepleri">
          <thead>
            <tr>
              <Th className="w-14">
                <span className="sr-only">Fotoğraf</span>
              </Th>
              <Th>Müşteri</Th>
              <Th>Hizmet</Th>
              <Th>Adres</Th>
              <Th>Tarih</Th>
              <Th>Saat</Th>
              <Th>Tutar</Th>
              <Th>Durum</Th>
              <Th className="w-px">
                <span className="sr-only">İşlem</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const when = formatScheduledAt(b.scheduledAt);
              const busy = mutatingId === b.id;
              const open = b.status === "pending" || b.status === "confirmed";
              return (
                <tr key={b.id}>
                  <Td cell="media">
                    <Photo
                      src={b.customer.avatar}
                      name={b.customer.name}
                      alt=""
                      size={40}
                    />
                  </Td>
                  <TdName label="Müşteri">{b.customer.name}</TdName>
                  <Td label="Hizmet">{b.service}</Td>
                  <Td label="Adres" className="max-w-56 text-ink/70">
                    {b.address}
                  </Td>
                  <Td label="Tarih" className="tnum">
                    {when.date}
                  </Td>
                  <Td label="Saat" className="tnum">
                    {when.time}
                  </Td>
                  <Td label="Tutar" className="tnum">
                    {formatPrice(b.priceCents)}
                  </Td>
                  <Td label="Durum">
                    <StatusTag status={b.status} />
                  </Td>
                  <Td cell="actions">
                    <span className="inline-flex flex-wrap gap-2">
                      {b.status === "pending" && (
                        <Button
                          variant="primary"
                          disabled={busy}
                          onClick={() => onAction(b.id, "confirm")}
                          aria-label={`${b.customer.name} talebini onayla`}
                        >
                          <Check size={14} aria-hidden="true" />
                          Onayla
                        </Button>
                      )}
                      {open && (
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => onAction(b.id, "complete")}
                          aria-label={`${b.customer.name} işini tamamlandı olarak işaretle`}
                        >
                          <CheckCheck size={14} aria-hidden="true" />
                          Tamamla
                        </Button>
                      )}
                      {open && (
                        <Button
                          variant="danger"
                          disabled={busy}
                          onClick={() => onAction(b.id, "cancel")}
                          aria-label={`${b.customer.name} talebini iptal et`}
                        >
                          İptal
                        </Button>
                      )}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
