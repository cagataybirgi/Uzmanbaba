import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { Alert, Button, ButtonLink, Field, Input, Kicker } from "../components/ds";

const RESEND_SECONDS = 60;

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  // Resend countdown timer (only runs after first successful submit)
  useEffect(() => {
    if (countdown === 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const validateEmail = (value: string): string => {
    if (!value.trim()) return "E-posta zorunlu.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return "Geçerli bir e-posta girin.";
    return "";
  };

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1•••$2");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Backend always returns 200 here regardless of whether the email
      // exists, so we never leak account presence — even a "wrong" email
      // shows the success state.
      await api.post(
        "/auth/forgot-password",
        { email: email.trim() },
        { auth: false },
      );
      setSubmitted(true);
      setCountdown(RESEND_SECONDS);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "İstek gönderilemedi.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await api.post(
        "/auth/forgot-password",
        { email: email.trim() },
        { auth: false },
      );
      setCountdown(RESEND_SECONDS);
    } catch {
      /* swallow — the visible UI just shows that resend is available again */
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 py-14 md:py-24">
      <ButtonLink to="/login" variant="ghost" className="mb-7 -ml-4">
        <ArrowLeft size={15} aria-hidden="true" />
        Girişe Dön
      </ButtonLink>

      <Kicker className="mb-3.5">Şifre sıfırlama</Kicker>

      {!submitted ? (
        <>
          <h1 className="t-title">Şifremi unuttum.</h1>
          <p className="t-lead mt-3.5">
            E-posta adresini gir, sıfırlama bağlantısını gönderelim.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-10 flex flex-col gap-6">
            <Field label="E-posta" required error={error || undefined}>
              {(field) => (
                <Input
                  {...field}
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="ornek@email.com"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  required
                />
              )}
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={loading}
              loadingLabel="Gönderiliyor…"
            >
              Bağlantı Gönder
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="t-title">E-posta gönderildi.</h1>
          <p className="t-lead mt-3.5 max-w-[48ch]">
            <span className="font-semibold">{maskedEmail}</span> adresine bir
            sıfırlama bağlantısı gönderdik. Gelen kutunu kontrol et.
          </p>

          <Alert tone="info" className="mt-7">
            E-postayı bulamıyorsan spam klasörünü kontrol etmeyi unutma.
          </Alert>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/login")}
            >
              Girişe Dön
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleResend}
              disabled={countdown > 0}
              loading={resending}
              loadingLabel="Gönderiliyor…"
            >
              {countdown > 0 ? `Tekrar Gönder (${countdown}s)` : "Tekrar Gönder"}
            </Button>
          </div>
        </>
      )}

      <p className="t-lead mt-7">
        Hesabın yok mu?{" "}
        <Link
          to="/register"
          className="font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-700"
        >
          Üye Ol
        </Link>
      </p>
    </div>
  );
}
