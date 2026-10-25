import { useState } from "react";
import { EmptyState, ErrorState, SkeletonRows, Table, Td, TdName, Th } from "../../components/ds";
import { useAdminBookings } from "../../data/admin";
import type { BookingStatus } from "../../data/bookings";
import { formatPrice, PaidTag, RefundTag, STATUS_CONFIG, StatusTag } from "../dashboard/shared";
import { FilterBar, formatDateTime, Pager, SearchBox } from "./shared";

type Filter = "all" | BookingStatus;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Tümü" },
  ...(["pending", "confirmed", "completed", "cancelled"] as const).map((s) => ({
    id: s,
    label: STATUS_CONFIG[s].label,
  })),
];

const PARTY_LABEL = { customer: "Müşteri", professional: "Uzman" } as const;

export function BookingsTab() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const bookings = useAdminBookings({
    page,
    q: q || undefined,
    status: filter === "all" ? undefined : filter,
  });
  const data = bookings.data;

  return (
    <>
      <h1 className="t-panel mb-10">Rezervasyonlar</h1>

      <div className="mb-5">
        <SearchBox
          value={q}
          placeholder="Müşteri, uzman veya hizmet ara"
          onSearch={(next) => {
            setQ(next);
            setPage(1);
          }}
        />
      </div>
      <div className="mb-7 border-b-2 border-rule">
        <FilterBar
          label="Duruma göre filtrele"
          value={filter}
          options={FILTERS}
          onChange={(next) => {
            setFilter(next);
            setPage(1);
          }}
        />
      </div>

      {bookings.error ? (
        <ErrorState message={bookings.error} onRetry={bookings.refetch} />
      ) : !data ? (
        <SkeletonRows rows={5} />
      ) : data.items.length === 0 ? (
        <EmptyState title="Rezervasyon yok" description="Bu filtreyle eşleşen rezervasyon bulunamadı." />
      ) : (
        <>
          <Table caption="Rezervasyonlar">
            <thead>
              <tr>
                <Th>Müşteri</Th>
                <Th>Uzman</Th>
                <Th>Hizmet</Th>
                <Th>Randevu</Th>
                <Th>Tutar</Th>
                <Th>Durum</Th>
                <Th>Oluşturuldu</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((b) => (
                <tr key={b.id}>
                  <TdName label="Müşteri">
                    {b.customer.name}
                    <span className="block font-sans text-xs font-normal text-ink/60">
                      {b.customer.email}
                    </span>
                  </TdName>
                  <Td label="Uzman">
                    {b.professional.name}
                    <span className="block text-xs text-ink/60">{b.professional.email}</span>
                  </Td>
                  <Td label="Hizmet">{b.service}</Td>
                  <Td label="Randevu" className="tnum">
                    {formatDateTime(b.scheduledAt)}
                  </Td>
                  <Td label="Tutar" className="tnum">
                    {formatPrice(b.priceCents)}
                  </Td>
                  <Td label="Durum">
                    <span className="inline-flex flex-wrap gap-1.5">
                      <StatusTag status={b.status} />
                      {b.refund ? <RefundTag state={b.refund} /> : b.paidAt && <PaidTag />}
                    </span>
                    {b.cancelledBy && (
                      <span className="mt-1 block text-xs text-ink/60">
                        İptal eden: {PARTY_LABEL[b.cancelledBy]}
                      </span>
                    )}
                  </Td>
                  <Td label="Oluşturuldu" className="tnum">
                    {formatDateTime(b.createdAt)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}
