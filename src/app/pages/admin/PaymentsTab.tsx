import { useState } from "react";
import { Wrench } from "lucide-react";
import {
  Button,
  EmptyState,
  ErrorState,
  SkeletonRows,
  Table,
  Td,
  TdName,
  Th,
} from "../../components/ds";
import { useAdminPayments, type AdminPayment, type ResolveResult } from "../../data/admin";
import type { PaymentStatus } from "../../data/payments";
import { toast } from "../../lib/toast";
import { formatPrice, StatusTag } from "../dashboard/shared";
import { ResolvePaymentModal } from "./ResolvePaymentModal";
import {
  AttentionTag,
  FilterBar,
  formatDateTime,
  Pager,
  PAYMENT_STATUS,
  PaymentStatusTag,
} from "./shared";

type Filter = "attention" | "all" | PaymentStatus;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "attention", label: "Müdahale gerekli" },
  { id: "all", label: "Tümü" },
  ...(["succeeded", "refunding", "refunded", "pending", "failed"] as const).map((s) => ({
    id: s,
    label: PAYMENT_STATUS[s].label,
  })),
];

const OUTCOME_MESSAGE: Record<NonNullable<ResolveResult["refund"]>["outcome"], string> = {
  refunded: "İade iyzico'ya gönderildi.",
  already_refunded: "Ödeme zaten iade edilmiş.",
  failed: "iyzico iadeyi yine reddetti.",
  unknown: "İade sonucu yine doğrulanamadı. Birkaç dakika sonra panelden kontrol edin.",
  not_refundable: "Bu ödeme otomatik iade edilemiyor; iyzico panelinden elle iade edin.",
};

export function PaymentsTab({ onChanged }: { onChanged: () => void }) {
  const [filter, setFilter] = useState<Filter>("attention");
  const [page, setPage] = useState(1);
  const [resolving, setResolving] = useState<AdminPayment | null>(null);

  const payments = useAdminPayments({
    page,
    attention: filter === "attention" || undefined,
    status: filter === "attention" || filter === "all" ? undefined : filter,
  });

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  const handleResolved = (result: ResolveResult) => {
    setResolving(null);
    payments.refetch();
    onChanged();
    if (!result.refund) {
      toast.success("Ödeme iade edildi olarak kaydedildi.");
      return;
    }
    const message = OUTCOME_MESSAGE[result.refund.outcome];
    if (result.refund.outcome === "refunded") toast.success(message);
    else toast.error(result.refund.errorMessage ? `${message} ${result.refund.errorMessage}` : message);
  };

  const data = payments.data;

  return (
    <>
      <h1 className="t-panel mb-10">Ödemeler</h1>

      <div className="mb-7 border-b-2 border-rule">
        <FilterBar label="Ödemeleri filtrele" value={filter} onChange={changeFilter} options={FILTERS} />
      </div>

      {payments.error ? (
        <ErrorState message={payments.error} onRetry={payments.refetch} />
      ) : !data ? (
        <SkeletonRows rows={4} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={filter === "attention" ? "Bekleyen iş yok" : "Ödeme yok"}
          description={
            filter === "attention"
              ? "Takılan ya da iade edilemeyen ödeme yok. Bir iade sorun çıkarırsa burada görünecek."
              : "Bu filtreyle eşleşen ödeme bulunamadı."
          }
        />
      ) : (
        <>
          <Table caption="Ödemeler">
            <thead>
              <tr>
                <Th>Müşteri</Th>
                <Th>Uzman</Th>
                <Th>Tutar</Th>
                <Th>Ödeme</Th>
                <Th>Rezervasyon</Th>
                <Th>Güncellendi</Th>
                <Th className="w-px">
                  <span className="sr-only">İşlem</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
                  <TdName label="Müşteri">
                    {p.booking.customer.name}
                    <span className="block font-sans text-xs font-normal text-ink/60">
                      {p.booking.customer.email}
                    </span>
                  </TdName>
                  <Td label="Uzman">{p.booking.professional.name}</Td>
                  <Td label="Tutar" className="tnum">
                    {formatPrice(p.amountCents)}
                  </Td>
                  <Td label="Ödeme">
                    <span className="inline-flex flex-wrap gap-1.5">
                      <PaymentStatusTag status={p.status} />
                      {p.attention && <AttentionTag reason={p.attention} />}
                    </span>
                  </Td>
                  <Td label="Rezervasyon">
                    <StatusTag status={p.booking.status} />
                  </Td>
                  <Td label="Güncellendi" className="tnum">
                    {formatDateTime(p.updatedAt)}
                  </Td>
                  <Td cell="actions">
                    {p.attention && (
                      <Button
                        variant="primary"
                        onClick={() => setResolving(p)}
                        aria-label={`${p.booking.customer.name} ödemesini çöz`}
                      >
                        <Wrench size={14} aria-hidden="true" />
                        Çöz
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
        </>
      )}

      <ResolvePaymentModal
        payment={resolving}
        onClose={() => setResolving(null)}
        onResolved={handleResolved}
      />
    </>
  );
}
