import { useId, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Lock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { api, ApiError } from "../lib/api";

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

  const pwdId = useId();
  const confirmId = useId();

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
      await api.post(
        "/auth/reset-password",
        { token, password },
        { auth: false },
      );
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

  // Bad / missing token → don't even render the form.
  if (!token) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12 bg-white">
        <div className="max-w-sm w-full flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h1 className="text-gray-900 text-2xl font-extrabold">
            Geçersiz Bağlantı
          </h1>
          <p className="text-gray-500 text-sm">
            Bu sıfırlama bağlantısı eksik ya da hatalı görünüyor. Lütfen yeni bir
            sıfırlama bağlantısı isteyin.
          </p>
          <Link
            to="/forgot-password"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
          >
            Yeni Bağlantı İste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm flex flex-col gap-6 animate-fade-in-up">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-orange-500 text-sm font-medium w-fit transition-colors"
          >
            <ArrowLeft size={14} />
            Girişe Dön
          </Link>

          {done ? (
            <div className="flex flex-col items-center gap-4 text-center animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h1 className="text-gray-900 text-2xl font-extrabold">
                Şifre Güncellendi
              </h1>
              <p className="text-gray-500 text-sm max-w-xs">
                Yeni şifrenizle giriş yapabilirsiniz. Birazdan otomatik olarak
                yönlendirileceksiniz.
              </p>
              <Link
                to="/login"
                className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors w-full text-center"
              >
                Şimdi Giriş Yap
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h1 className="text-gray-900 text-2xl font-extrabold">
                  Yeni Şifre Belirle
                </h1>
                <p className="text-gray-500 text-sm">
                  Hesabın için yeni bir şifre seç. En az 8 karakter olmalı.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={pwdId}
                    className="text-sm font-medium text-gray-700"
                  >
                    Yeni Şifre
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
                      aria-hidden="true"
                    />
                    <input
                      id={pwdId}
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      className="w-full border border-gray-300 rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPwd ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={confirmId}
                    className="text-sm font-medium text-gray-700"
                  >
                    Şifreyi Tekrarla
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
                      aria-hidden="true"
                    />
                    <input
                      id={confirmId}
                      type={showPwd ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
                    />
                  </div>
                </div>

                {(localError || error) && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle size={12} />
                    {localError || error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!submittable}
                  className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all"
                >
                  {loading ? (
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      Şifreyi Güncelle <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </>
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

      {/* Right — Visual Panel (matches ForgotPassword layout) */}
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
            Sıfırlama bağlantısı tek kullanımlıktır ve 1 saat sonra geçerliliğini
            yitirir.
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
