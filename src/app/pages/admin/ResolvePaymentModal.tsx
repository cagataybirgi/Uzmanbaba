import { useEffect, useState } from "react";
import { Alert, Button, Field, Modal, ModalActions, Textarea } from "../../components/ds";
import {
  resolvePayment,
  type AdminPayment,
  type ResolveAction,
  type ResolveResult,
} from "../../data/admin";
import { ApiError } from "../../lib/api";
import { formatPrice } from "../dashboard/shared";
import { ATTENTION_LABEL, formatDateTime } from "./shared";

/** Matches STUCK_AFTER_MS in backend/src/modules/admin/admin.service.ts. */
const STUCK_AFTER_MS = 5 * 60_000;

/**
 * Walks the admin through settling one payment from the attention list.
 * The decision always comes from what the iyzico panel shows, so the modal
 * puts the ids to search for front and centre, then offers the two moves.
 */
export function ResolvePaymentModal({
  payment,
  onClose,
  onResolved,
}: {
  payment: AdminPayment | null;
  onClose: () => void;
  onResolved: (result: ResolveResult) => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<ResolveAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payment) {
      setNote("");
      setBusy(null);
      setError(null);
    }
  }, [payment]);

  if (!payment || !payment.attention) return null;

  const unknown = payment.attention === "refund_unknown";
  const maybeInFlight =
    unknown && Date.now() - new Date(payment.updatedAt).getTime() < STUCK_AFTER_MS;

  const run = async (action: ResolveAction) => {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      onResolved(await resolvePayment(payment.id, action, note.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İşlem tamamlanamadı.");
      setBusy(null);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Ödemeyi çöz"
      description={`${payment.booking.customer.name} adlı müşterinin ödemesi için işlem seçin.`}
    >
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 border-y-2 border-rule py-4 text-sm">
        <dt className="text-ink/60">Sorun</dt>
        <dd className="font-semibold">{ATTENTION_LABEL[payment.attention]}</dd>
        <dt className="text-ink/60">Tutar</dt>
        <dd className="tnum">{formatPrice(payment.amountCents)}</dd>
        <dt className="text-ink/60">Müşteri</dt>
        <dd className="break-words">
          {payment.booking.customer.name} · {payment.booking.customer.email}
        </dd>
        <dt className="text-ink/60">Uzman</dt>
        <dd className="break-words">{payment.booking.professional.name}</dd>
        <dt className="text-ink/60">iyzico Ödeme ID</dt>
        <dd className="font-mono break-all select-all">{payment.providerPaymentId ?? "—"}</dd>
        <dt className="text-ink/60">iyzico İşlem ID</dt>
        <dd className="font-mono break-all select-all">
          {payment.providerTransactionId ?? "—"}
        </dd>
        <dt className="text-ink/60">Son güncelleme</dt>
        <dd className="tnum">{formatDateTime(payment.updatedAt)}</dd>
        {payment.errorMessage && (
          <>
            <dt className="text-ink/60">Hata</dt>
            <dd className="break-words">
              {payment.errorMessage}
              {payment.errorCode && <span className="text-ink/60"> ({payment.errorCode})</span>}
            </dd>
          </>
        )}
      </dl>

      <div className="t-body mt-5 flex flex-col gap-3 text-[15px]">
        {unknown ? (
          <>
            <p>
              İade isteği iyzico'ya giderken bağlantı koptu. Paranın iade edilip
              edilmediğini bilmiyoruz. iyzico panelinde bu ödemeyi Ödeme ID ile açıp
              iade durumuna bakın.
            </p>
            <ul className="list-disc pl-5">
              <li>
                Panelde iade/iptal <strong>görünüyorsa</strong>: “İade edildi olarak
                işaretle”.
              </li>
              <li>
                Panelde iade <strong>görünmüyorsa</strong>: “İadeyi tekrar dene”.
              </li>
            </ul>
          </>
        ) : (
          <>
            <p>
              Rezervasyon iptal edildi ama para hâlâ bizde: iyzico iadeyi reddetti ya
              da iade hiç denenmedi.
            </p>
            <ul className="list-disc pl-5">
              <li>“İadeyi tekrar dene” iadeyi iyzico'ya yeniden gönderir.</li>
              <li>
                Parayı iyzico panelinden elle iade ettiyseniz: “İade edildi olarak
                işaretle”.
              </li>
            </ul>
          </>
        )}
      </div>

      {maybeInFlight && (
        <Alert tone="info" className="mt-5">
          Bu iade birkaç dakika önce başladı ve hâlâ sürüyor olabilir. Çift iadeyi
          önlemek için 5 dakika dolmadan işlem yapılamaz.
        </Alert>
      )}

      <Field label="Not (isteğe bağlı)" hint="Kayda geçer; müşteriye gösterilmez." className="mt-5">
        {(p) => (
          <Textarea
            {...p}
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Örn. Panelde 25 Ekim iadesi görünüyor."
          />
        )}
      </Field>

      {error && (
        <Alert tone="error" className="mt-5">
          {error}
        </Alert>
      )}

      <ModalActions>
        <Button
          variant="primary"
          loading={busy === "retry_refund"}
          disabled={Boolean(busy) || maybeInFlight}
          onClick={() => run("retry_refund")}
        >
          İadeyi tekrar dene
        </Button>
        <Button
          variant="secondary"
          loading={busy === "mark_refunded"}
          disabled={Boolean(busy) || maybeInFlight}
          onClick={() => run("mark_refunded")}
        >
          İade edildi olarak işaretle
        </Button>
        <Button variant="ghost" disabled={Boolean(busy)} onClick={onClose}>
          Vazgeç
        </Button>
      </ModalActions>
    </Modal>
  );
}
