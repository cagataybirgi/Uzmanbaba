import { useCallback, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import {
  AuthLayout,
  AuthPanelBrand,
} from "../components/AuthLayout";
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  Kicker,
} from "../components/ds";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [shakeKey, setShakeKey] = useState(0);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // ProtectedRoute stashes the page the user was trying to reach in
  // location.state.from; send them back there after login, defaulting to
  // the dashboard.
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const validateField = useCallback((name: string, value: string): string => {
    if (name === "email") {
      if (!value.trim()) return "E-posta zorunlu.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return "Geçerli bir e-posta girin.";
    }
    if (name === "password") {
      if (!value) return "Şifre zorunlu.";
      if (value.length < 6) return "Şifre çok kısa.";
    }
    return "";
  }, []);

  const handleBlur = (name: string, value: string) => {
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((e) => ({ ...e, [name]: validateField(name, value) }));
  };

  const handleChange = (name: string, value: string) => {
    if (touched[name]) {
      setErrors((e) => ({ ...e, [name]: validateField(name, value) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    const emailErr = validateField("email", email);
    const passErr = validateField("password", password);
    setTouched({ email: true, password: true });
    setErrors({ email: emailErr, password: passErr });

    if (emailErr || passErr) {
      setShakeKey((k) => k + 1);
      const firstInvalidInput = emailErr ? emailInputRef : passwordInputRef;
      window.requestAnimationFrame(() => firstInvalidInput.current?.focus());
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      // Use the server's message when we have one (e.g. rate-limit 429,
      // network failure) and fall back to the generic credentials message
      // for the common 401.
      const message =
        err instanceof ApiError && err.code !== "invalid_credentials"
          ? err.message
          : "E-posta veya şifre hatalı.";
      setGlobalError(message);
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const shouldShake = shakeKey > 0 && (errors.email || errors.password || globalError);

  return (
    <AuthLayout
      panel={
        <>
          <AuthPanelBrand />
          <h2 className="mt-14 font-display text-[clamp(28px,3vw,40px)] leading-[1.06] font-extrabold tracking-[-0.015em] -ml-[0.058em]">
            Baba sorunu çözer.
          </h2>
          <p className="t-lead mt-7 max-w-[34ch]">
            Yerel uzmanlara kolayca ulaş. Gerçek değerlendirmeleri incele,
            doğrudan iletişim kur.
          </p>
          <blockquote className="mt-14 max-w-[30ch] font-display text-xl leading-7 font-extrabold">
            “Tesisatçıyı dakikalar içinde buldum. Çok hızlı ve güvenilir!”
          </blockquote>
          <p className="mt-3.5 text-[13px] tracking-[0.08em] uppercase">
            Ayşe K. — İstanbul
          </p>
        </>
      }
    >
      <Kicker className="mb-3.5">Giriş</Kicker>
      <h1 className="t-title">Tekrar hoş geldin.</h1>
      <p className="t-lead mt-3.5">Hesabına giriş yap, babalar hazır!</p>

      {globalError && (
        <Alert tone="error" className="mt-7">
          {globalError}
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className={`mt-10 flex flex-col gap-6 ${shouldShake ? "animate-shake" : ""}`}
      >
        <Field
          label="E-posta"
          error={touched.email ? errors.email : undefined}
          required
        >
          {(field) => (
            <Input
              {...field}
              ref={emailInputRef}
              type="email"
              value={email}
              autoComplete="email"
              placeholder="ornek@email.com"
              onChange={(e) => {
                setEmail(e.target.value);
                handleChange("email", e.target.value);
              }}
              onBlur={() => handleBlur("email", email)}
            />
          )}
        </Field>

        <Field
          label="Şifre"
          required
          error={touched.password ? errors.password : undefined}
          labelAside={
            <Link
              to="/forgot-password"
              className="text-[13px] text-brand-800 underline underline-offset-4 hover:text-brand-700"
            >
              Şifremi Unuttum?
            </Link>
          }
        >
          {(field) => (
            <div className="relative">
              <Input
                {...field}
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-12"
                onChange={(e) => {
                  setPassword(e.target.value);
                  handleChange("password", e.target.value);
                }}
                onBlur={() => handleBlur("password", password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-ink/55 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
              >
                {showPassword ? (
                  <EyeOff size={17} aria-hidden="true" />
                ) : (
                  <Eye size={17} aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </Field>

        <Checkbox
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        >
          Beni Hatırla
        </Checkbox>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          loading={loading}
          loadingLabel="Giriş yapılıyor…"
        >
          Giriş Yap
        </Button>
      </form>

      <p className="t-lead mt-7">
        Hesabın yok mu?{" "}
        <Link
          to="/register"
          className="font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-700"
        >
          Üye Ol
        </Link>
      </p>
    </AuthLayout>
  );
}
