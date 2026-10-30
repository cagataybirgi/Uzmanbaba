import { useMemo, useState } from "react";
import { Link } from "react-router";
import { CreditCard, LifeBuoy, Star } from "lucide-react";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Photo,
  SkeletonRows,
  Table,
  Tag,
  Td,
  TdName,
  Th,
} from "../../components/ds";
import {
  formatPrice,
  formatScheduledAt,
  PaidTag,
  RefundTag,
  StatusFilterBar,
  StatusTag,
  type StatusFilter,
} from "./shared";
import type { Booking } from "../../data/bookings";

/* ═══════════════════════════════════════════════════════════════════════════
 * Rezervasyonlarım — the bookings the signed-in user is receiving.
 * ═══════════════════════════════════════════════════════════════════════ */

const FILTER_ORDER: StatusFilter[] = [
  "all",
  "confirmed",
  "pending",
  "completed",
  "cancelled",
];

export function BookingsTab({
  bookings,
  loading,
  error,
  onRetry,
  onCancel,
  cancellingId,
  onReview,
  onPay,
  payingId,
}: {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onCancel: (id: string) => void;
  cancellingId: string | null;
  onReview: (booking: Booking) => void;
  /** Starts checkout; the page then leaves for iyzico's hosted form. */
  onPay: (booking: Booking) => void;
  payingId: string | null;
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
      <h1 className="t-panel mb-10">Rezervasyonlarım</h1>

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
            filter === "all"
              ? "Henüz rezervasyonun yok"
              : "Bu durumda rezervasyon yok"
          }
          description={
            filter === "all"
              ? "Bir uzman bul, tarihini seç ve ilk rezervasyonunu oluştur."
              : "Farklı bir durum filtresi seçebilirsin."
          }
          action={
            filter === "all" ? (
              <ButtonLink to="/search" variant="primary">
                Uzman Ara
              </ButtonLink>
            ) : (
              <Button variant="secondary" onClick={() => setFilter("all")}>
                Tümünü Göster
              </Button>
            )
          }
        />
      ) : (
        <Table caption="Rezervasyonlarım">
          <thead>
            <tr>
              <Th className="w-14">
                <span className="sr-only">Fotoğraf</span>
              </Th>
              <Th>Uzman</Th>
              <Th>Hizmet</Th>
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
              // Refund policy: once the appointment time has passed on a
              // paid booking, the customer goes through support instead.
              const pastPaid =
                b.paidAt !== null && new Date(b.scheduledAt).getTime() <= Date.now();
              const open = b.status === "confirmed" || b.status === "pending";
              const canCancel = open && !pastPaid;
              // Payable once the professional has confirmed (or already
              // finished the job) and quoted.
              const canPay =
                (b.status === "confirmed" || b.status === "completed") &&
                b.priceCents !== null &&
                b.paidAt === null;
              const awaitingQuote = b.priceCents === null && b.status !== "cancelled";
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
                  <Td label="Tutar" className="tnum">
                    {awaitingQuote ? (
                      <span className="text-ink/50">Fiyat bekleniyor</span>
                    ) : (
                      formatPrice(b.priceCents)
                    )}
                  </Td>
                  <Td label="Durum">
                    <StatusTag status={b.status} />
                  </Td>
                  <Td cell="actions">
                    <span className="inline-flex flex-wrap gap-2">
                      {b.refund ? <RefundTag state={b.refund} /> : b.paidAt && <PaidTag />}
                      {canPay && (
                        <Button
                          variant="primary"
                          onClick={() => onPay(b)}
                          loading={payingId === b.id}
                          loadingLabel="Ödeme sayfasına gidiliyor…"
                          disabled={payingId !== null && payingId !== b.id}
                          aria-label={`${b.professional.name} için ${formatPrice(b.priceCents)} öde`}
                        >
                          <CreditCard size={13} aria-hidden="true" />
                          Öde
                        </Button>
                      )}
                      {b.status === "completed" && b.review && (
                        <Tag tone="success" className="gap-1.5">
                          <Star size={12} aria-hidden="true" />
                          Değerlendirildi ({b.review.rating}/5)
                        </Tag>
                      )}
                      {b.status === "completed" && !b.review && (
                        <Button
                          variant="secondary"
                          onClick={() => onReview(b)}
                          aria-label={`${b.professional.name} hizmetini değerlendir`}
                        >
                          <Star size={13} aria-hidden="true" />
                          Değerlendir
                        </Button>
                      )}
                      {open && pastPaid && (
                        <ButtonLink
                          to="/destek"
                          variant="secondary"
                          aria-label={`${b.professional.name} rezervasyonu için destek al`}
                        >
                          <LifeBuoy size={13} aria-hidden="true" />
                          Sorun Bildir
                        </ButtonLink>
                      )}
                      {canCancel && (
                        <Button
                          variant="danger"
                          onClick={() => onCancel(b.id)}
                          loading={cancellingId === b.id}
                          loadingLabel="İptal ediliyor…"
                          aria-label={`${b.professional.name} rezervasyonunu iptal et`}
                        >
                          İptal Et
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

      {!error && !loading && bookings.length > 0 && (
        <p className="t-meta mt-7">
          Ödeme yaparak{" "}
          <Link
            to="/iade-politikasi"
            className="font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-700"
          >
            İade Politikası
          </Link>
          'nı kabul etmiş olursun. Randevu saatine kadar yapılan iptallerde
          ödemenin tamamı iade edilir.
        </p>
      )}
    </>
  );
}
