import { useMemo } from "react";
import {
  ErrorState,
  Kicker,
  Photo,
  SkeletonRows,
  Stat,
  Table,
  Td,
  TdName,
  Th,
} from "../../components/ds";
import { formatScheduledAt, StatusTag, TR_MONTHS_SHORT } from "./shared";
import type { Booking } from "../../data/bookings";

/* ═══════════════════════════════════════════════════════════════════════════
 * Overview — the four counts, the year's activity, and what's coming up.
 * ═══════════════════════════════════════════════════════════════════════ */

export function OverviewTab({
  bookings,
  loading,
  error,
  onRetry,
  rating,
}: {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  rating?: number;
}) {
  const stats = useMemo(
    () => ({
      total: bookings.length,
      completed: bookings.filter((b) => b.status === "completed").length,
      pending: bookings.filter(
        (b) => b.status === "pending" || b.status === "confirmed",
      ).length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    }),
    [bookings],
  );

  // Real per-month booking counts for the current year, derived from the
  // fetched bookings — never a decorative placeholder series.
  const monthly = useMemo(() => {
    const year = new Date().getFullYear();
    const counts = new Array(12).fill(0) as number[];
    for (const b of bookings) {
      const d = new Date(b.createdAt);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() === year) {
        counts[d.getMonth()] += 1;
      }
    }
    return counts;
  }, [bookings]);

  const activityTotal = monthly.reduce((a, c) => a + c, 0);
  const activityMax = Math.max(1, ...monthly);
  const currentYear = new Date().getFullYear();

  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending",
  );

  return (
    <>
      <h1 className="t-panel">Özet</h1>

      <div className="mt-10 grid grid-cols-2 gap-6 border-t-2 border-rule pt-7 lg:grid-cols-4">
        <Stat value={stats.total} label="Toplam rezervasyon" />
        <Stat value={stats.completed} label="Tamamlandı" />
        <Stat value={stats.pending} label="Beklemede" />
        <Stat value={rating ? String(rating).replace(".", ",") : "—"} label="Ortalama puan" />
      </div>

      {/* ── Activity ─────────────────────────────────────────────────── */}
      <Kicker as="h2" className="mt-14 mb-7">
        {currentYear} Aylık Hareket — {activityTotal} rezervasyon
      </Kicker>

      <div
        role="img"
        aria-label={`${currentYear} yılı aylık rezervasyon dağılımı: ${monthly
          .map((c, i) => `${TR_MONTHS_SHORT[i]} ${c}`)
          .join(", ")}`}
      >
        <div className="grid h-20 grid-cols-12 items-end gap-1.5 border-b-2 border-rule sm:gap-2">
          {monthly.map((count, i) => (
            <div
              key={i}
              className="bg-brand"
              // A 4% floor so an empty month still reads as a column.
              style={{ height: `${Math.max(4, (count / activityMax) * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-12 gap-1.5 sm:gap-2">
          {TR_MONTHS_SHORT.map((m) => (
            <span
              key={m}
              className="text-center text-[10px] tracking-[0.04em] text-ink/60 uppercase sm:text-[11px]"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* ── Upcoming ─────────────────────────────────────────────────── */}
      <Kicker as="h2" className="mt-14 mb-7">
        Yaklaşan Rezervasyonlar
      </Kicker>

      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : upcoming.length === 0 ? (
        <p className="t-body border-y-2 border-rule py-10">
          Yaklaşan rezervasyon yok.
        </p>
      ) : (
        <Table caption="Yaklaşan rezervasyonlar">
          <thead>
            <tr>
              <Th className="w-14">
                <span className="sr-only">Fotoğraf</span>
              </Th>
              <Th>Uzman</Th>
              <Th>Hizmet</Th>
              <Th>Tarih</Th>
              <Th>Saat</Th>
              <Th>Durum</Th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((b) => {
              const when = formatScheduledAt(b.scheduledAt);
              return (
                <tr key={b.id}>
                  <Td cell="media">
                    <Photo
                      src={b.professional.avatar}
                      name={b.professional.name}
                      alt=""
                      size={40}
                    />
                  </Td>
                  <TdName label="Uzman">{b.professional.name}</TdName>
                  <Td label="Hizmet">{b.service}</Td>
                  <Td label="Tarih" className="tnum">
                    {when.date}
                  </Td>
                  <Td label="Saat" className="tnum">
                    {when.time}
                  </Td>
                  <Td label="Durum">
                    <StatusTag status={b.status} />
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
