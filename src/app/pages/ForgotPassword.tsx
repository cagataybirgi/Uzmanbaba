import { useState, useEffect, useId } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, ArrowRight, CheckCircle, AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";

const RESEND_SECONDS = 60;

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  const emailId = useId();
  const errorId = `${emailId}-error`;

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
    // Mock backend call
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
    setCountdown(RESEND_SECONDS);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    await new Promise((r) => setTimeout(r, 900));
    setResending(false);
    setCountdown(RESEND_SECONDS);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm flex flex-col gap-6 animate-fade-in-up">
          {/* Back to login */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-orange-500 text-sm font-medium w-fit transition-colors"
          >
            <ArrowLeft size={14} />
            Girişe Dön
          </Link>

          {!submitted ? (
            <>
              <div className="flex flex-col gap-1">
                <h1 className="text-gray-900 text-2xl font-extrabold">
                  Şifreni mi Unuttun?
                </h1>
                <p className="text-gray-500 text-sm">
                  E-posta adresini gir, sana sıfırlama bağlantısı gönderelim.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={emailId}
                    className="text-sm font-medium text-gray-700"
                  >
                    E-posta
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
                      aria-hidden="true"
                    />
                    <input
                      id={emailId}
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="ornek@email.com"
                      autoComplete="email"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? errorId : undefined}
                      className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                        error
                          ? "border-red-400 bg-red-50 focus:ring-red-200"
                          : "border-gray-300 focus:ring-orange-300 focus:border-orange-400"
                      }`}
                    />
                  </div>
                  {error && (
                    <p
                      id={errorId}
                      className="text-red-500 text-xs flex items-center gap-1 animate-slide-down"
                    >
                      <AlertCircle size={12} />
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl text-sm transition-all"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <span>Gönderiliyor...</span>
                    </>
                  ) : (
                    <>
                      Sıfırlama Bağlantısı Gönder <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success state */
            <div className="flex flex-col items-center gap-4 text-center animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h1 className="text-gray-900 text-2xl font-extrabold">
                E-posta Gönderildi
              </h1>
              <p className="text-gray-500 text-sm max-w-xs">
                <span className="font-semibold text-gray-700">{maskedEmail}</span>{" "}
                adresine bir sıfırlama bağlantısı gönderdik. Gelen kutunu kontrol
                et.
              </p>

              <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-xs text-gray-600 w-full">
                E-postayı bulamıyorsan spam klasörünü kontrol etmeyi unutma.
              </div>

              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || resending}
                className="text-orange-500 hover:text-orange-600 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-semibold flex items-center gap-1 transition-colors"
              >
                {resending
                  ? "Tekrar gönderiliyor..."
                  : countdown > 0
                  ? `Tekrar gönder (${countdown}s)`
                  : "E-postayı tekrar gönder"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors w-full"
              >
                Girişe Dön
              </button>
            </div>
          )}

          <p className="text-center text-sm text-gray-500">
            Hesabın yok mu?{" "}
            <Link
              to="/register"
              className="text-orange-500 hover:text-orange-600 font-semibold"
            >
              Üye Ol
            </Link>
          </p>
        </div>
      </div>

      {/* Right — Visual Panel (matches Login layout) */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-orange-500 px-12 py-14 text-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-orange-400 opacity-40" />
        <div className="absolute bottom-10 -left-10 w-56 h-56 rounded-full bg-orange-600 opacity-30" />
        <div className="relative z-10">
          <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 inline-block mb-8">
            <span className="font-extrabold text-lg tracking-tight">
              Uzman<span className="text-orange-200">Baba</span>
            </span>
          </div>
          <h2 className="text-3xl font-extrabold leading-snug mb-4">
            Güvenliğin önemli.
          </h2>
          <p className="text-orange-100 text-sm leading-relaxed">
            Hesabını güvende tutmak için sıfırlama bağlantısı yalnızca senin
            e-posta adresine gönderilir.
          </p>
        </div>
        <div className="relative z-10 bg-white/15 backdrop-blur rounded-xl p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} className="text-orange-100" />
            <p className="text-xs text-white/90 leading-relaxed">
              Şifre değişikliklerinden anında haberdar olursun.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
