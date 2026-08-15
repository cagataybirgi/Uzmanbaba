import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { api, ApiError } from "../lib/api";
import {
  Alert,
  Button,
  ButtonLink,
  ErrorState,
  Field,
  Input,
  Kicker,
} from "../components/ds";

/**
 * Reset-password page consumed by the link in the forgot-password email.
 *
 * The token comes from `?token=...`. The user enters a new password and a
 * confirmation, the page POSTs to /auth/reset-password, and on success
 * shows a confirmation panel that links back to /login.
 */
export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const localError = useMemo(() => {
    if (!password) return "";
    if (password.length < 8) return "Şifre en az 8 karakter olmalı.";
    if (confirm && password !== confirm) return "Şifreler eşleşmiyor.";
    return "";
  }, [password, confirm]);

  const submittable =
    Boolean(token) && password.length >= 8 && password === confirm && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittable) return;
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password }, { auth: false });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "Şifre güncellenemedi.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Bad / missing token → don't even render the form ─────────────────── */

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-6 py-14 md:py-24">
        <Kicker className="mb-3.5">Şifre sıfırlama</Kicker>
        <ErrorState
          title="Geçersiz bağlantı"
          message="Bu sıfırlama bağlantısı eksik ya da hatalı görünüyor. Lütfen yeni bir sıfırlama bağlantısı isteyin."
        />
        <div className="mt-7">
          <ButtonLink to="/forgot-password" variant="primary" size="lg">
            Yeni Bağlantı İste
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 py-14 md:py-24">
      <ButtonLink to="/login" variant="ghost" className="mb-7 -ml-4">
        <ArrowLeft size={15} aria-hidden="true" />
        Girişe Dön
      </ButtonLink>

      <Kicker className="mb-3.5">Şifre sıfırlama</Kicker>

      {done ? (
        <>
          <h1 className="t-title">Şifren güncellendi.</h1>
          <p className="t-lead mt-3.5 max-w-[48ch]" role="status">
            Yeni şifrenle giriş yapabilirsin. Birazdan otomatik olarak
            yönlendirileceksin.
          </p>
          <div className="mt-10">
            <ButtonLink to="/login" variant="primary" size="lg">
              Şimdi Giriş Yap
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <h1 className="t-title">Yeni şifre belirle.</h1>
          <p className="t-lead mt-3.5">
            En az 8 karakter. Bir büyük harf ve bir rakam kullanmanı öneririz.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-10 flex flex-col gap-6">
            <Field label="Yeni Şifre" required error={localError || undefined}>
              {(field) => (
                <div className="relative">
                  <Input
                    {...field}
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? "Şifreyi gizle" : "Şifreyi göster"}
                    aria-pressed={showPwd}
                    className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-ink/55 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                  >
                    {showPwd ? (
                      <EyeOff size={17} aria-hidden="true" />
                    ) : (
                      <Eye size={17} aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}
            </Field>

            <Field label="Şifreyi Tekrarla" required>
              {(field) => (
                <Input
                  {...field}
                  type={showPwd ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              )}
            </Field>

            {error && <Alert tone="error">{error}</Alert>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              disabled={!submittable && !loading}
              loading={loading}
              loadingLabel="Güncelleniyor…"
            >
              Şifreyi Güncelle
            </Button>
          </form>
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
