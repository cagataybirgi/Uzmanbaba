import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { getPayment, type Payment } from "../data/payments";
import { ApiError } from "../lib/api";
import {
  Button,
  ButtonLink,
  ErrorState,
  Kicker,
  Spinner,
} from "../components/ds";
import { formatPrice } from "./dashboard/shared";

/**
 * Where iyzico sends the customer after the hosted form closes.
 *
 * The URL carries only a payment id (or `status=error` when the backend
 * couldn't even match the callback). The outcome itself is read from our
 * API — never from the query string — so a customer can't land on a
 * "success" page by editing the address bar, and a lost callback still
 * resolves because the API reconciles against iyzico on read.
 */
export function PaymentResult() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("payment");
  const urlStatus = searchParams.get("status");

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(Boolean(paymentId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!paymentId) return;
    setLoading(true);
    setError(null);
    getPayment(paymentId)
      .then((p) => {
        setPayment(p);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : "Ödeme sonucu alınamadı.",
        );
        setLoading(false);
      });
  }, [paymentId]);

  useEffect(load, [load]);

  const wrap = (children: React.ReactNode) => (
    <div className="mx-auto w-full max-w-[560px] px-6 py-14 md:py-24">
      <Kicker className="mb-3.5">Ödeme</Kicker>
      {children}
    </div>
  );

  /* ── No usable id: the callback couldn't be matched ──────────────────── */
  if (!paymentId || urlStatus === "error") {
    return wrap(
      <>
        <ErrorState
          title="Ödeme sonucu doğrulanamadı"
          message="Ödeme sayfasından beklenmedik bir şekilde döndün. Kartından para çekildiyse rezervasyon listende birkaç dakika içinde 'Ödendi' olarak görünecek; görünmezse destek ile iletişime geç."
        />
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink to="/dashboard?tab=bookings" variant="primary" size="lg">
            Rezervasyonlarıma Git
          </ButtonLink>
          <ButtonLink to="/destek" variant="secondary" size="lg">
            Destek
          </ButtonLink>
        </div>
      </>,
    );
  }

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return wrap(
      <div className="flex items-center gap-3 py-10" role="status">
        <Spinner />
        <span className="t-lead">Ödeme sonucu doğrulanıyor…</span>
      </div>,
    );
  }

  /* ── Couldn't read the outcome ───────────────────────────────────────── */
  if (error || !payment) {
    return wrap(
      <>
        <ErrorState
          title="Ödeme sonucu alınamadı"
          message={error ?? "Beklenmedik bir hata oluştu."}
          onRetry={load}
        />
        <div className="mt-7">
          <ButtonLink to="/dashboard?tab=bookings" variant="secondary" size="lg">
            Rezervasyonlarıma Git
          </ButtonLink>
        </div>
      </>,
    );
  }

  const amount = formatPrice(payment.amountCents);

  /* ── Paid ────────────────────────────────────────────────────────────── */
  if (payment.status === "succeeded") {
    return wrap(
      <>
        <div className="mb-5 flex size-14 items-center justify-center bg-success-tint text-success">
          <CheckCircle2 size={30} aria-hidden="true" />
        </div>
        <h1 className="t-title">Ödemen alındı.</h1>
        <p className="t-lead mt-3.5 max-w-[48ch]" role="status">
          <span className="tnum font-semibold text-ink">{amount}</span> tutarındaki
          ödeme başarıyla tamamlandı. Rezervasyonun artık hem senin hem de
          uzmanının panelinde "Ödendi" olarak görünüyor.
        </p>
        <div className="mt-10">
          <ButtonLink to="/dashboard?tab=bookings" variant="primary" size="lg">
            Rezervasyonlarıma Git
          </ButtonLink>
        </div>
      </>,
    );
  }

  /* ── Still pending (rare: iyzico hasn't settled yet) ─────────────────── */
  if (payment.status === "pending") {
    return wrap(
      <>
        <h1 className="t-title">Ödeme henüz sonuçlanmadı.</h1>
        <p className="t-lead mt-3.5 max-w-[48ch]" role="status">
          Bankadan yanıt bekleniyor. Birkaç saniye sonra tekrar kontrol et;
          sonuç kesinleşince rezervasyonunda görünecek.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button variant="primary" size="lg" onClick={load}>
            Tekrar Kontrol Et
          </Button>
          <ButtonLink to="/dashboard?tab=bookings" variant="secondary" size="lg">
            Rezervasyonlarıma Git
          </ButtonLink>
        </div>
      </>,
    );
  }

  /* ── Failed / refunded ───────────────────────────────────────────────── */
  const refund = payment.status === "refunded" || payment.status === "refunding";
  return wrap(
    <>
      <div className="mb-5 flex size-14 items-center justify-center bg-danger-tint text-danger">
        <XCircle size={30} aria-hidden="true" />
      </div>
      <h1 className="t-title">
        {payment.status === "refunded"
          ? "Bu ödeme iade edildi."
          : payment.status === "refunding"
            ? "Bu ödemenin iadesi işleniyor."
            : "Ödeme tamamlanamadı."}
      </h1>
      <p className="t-lead mt-3.5 max-w-[48ch]" role="status">
        {payment.status === "refunded"
          ? `${amount} tutarındaki ödeme kartına iade edildi.`
          : payment.status === "refunding"
            ? `${amount} tutarındaki ödeme kartına iade ediliyor.`
            : payment.errorMessage
            ? `${payment.errorMessage} Kartından para çekilmedi; rezervasyonundan tekrar deneyebilirsin.`
            : "Kartından para çekilmedi. Rezervasyonundan tekrar deneyebilirsin."}
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to="/dashboard?tab=bookings" variant="primary" size="lg">
          {refund ? "Rezervasyonlarıma Git" : "Tekrar Dene"}
        </ButtonLink>
        <ButtonLink to="/destek" variant="secondary" size="lg">
          Destek
        </ButtonLink>
      </div>
    </>,
  );
}
