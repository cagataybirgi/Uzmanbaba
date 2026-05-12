import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type FieldState = "idle" | "valid" | "error";

function FieldIcon({ state }: { state: FieldState }) {
  if (state === "valid")
    return <CheckCircle size={16} className="text-green-500 animate-pop-in" />;
  if (state === "error")
    return <AlertCircle size={16} className="text-red-400 animate-pop-in" />;
  return null;
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-red-500 text-xs flex items-center gap-1 animate-slide-down">
      <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
      {msg}
    </p>
  );
}

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
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateField = useCallback(
    (name: string, value: string): string => {
      if (name === "email") {
        if (!value.trim()) return "E-posta zorunlu.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Geçerli bir e-posta girin.";
      }
      if (name === "password") {
        if (!value) return "Şifre zorunlu.";
        if (value.length < 6) return "Şifre çok kısa.";
      }
      return "";
    },
    []
  );

  const getFieldState = (name: string, value: string): FieldState => {
    if (!touched[name]) return "idle";
    const err = validateField(name, value);
    return err ? "error" : "valid";
  };

  const handleBlur = (name: string, value: string) => {
    setTouched((t) => ({ ...t, [name]: true }));
    const err = validateField(name, value);
    setErrors((e) => ({ ...e, [name]: err }));
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
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setGlobalError("E-posta veya şifre hatalı.");
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const emailState = getFieldState("email", email);
  const passwordState = getFieldState("password", password);

  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm flex flex-col gap-6 animate-fade-in-up">
          <div className="flex flex-col gap-1">
            <h1 className="text-gray-900 text-2xl font-extrabold">Tekrar Hoş Geldin 👋</h1>
            <p className="text-gray-500 text-sm">Hesabına giriş yap, babalar hazır!</p>
          </div>

          {/* Social Logins */}
          <div className="flex flex-col gap-3">
            <button className="flex items-center justify-center gap-3 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-700 transition-all w-full">
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google ile Giriş Yap
            </button>
            <button className="flex items-center justify-center gap-3 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-700 transition-all w-full">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook ile Giriş Yap
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs">veya e-posta ile</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Global Error */}
          {globalError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2 animate-slide-down">
              <AlertCircle size={16} />
              {globalError}
            </div>
          )}

          {/* Form */}
          <form
            key={shakeKey}
            ref={formRef}
            onSubmit={handleSubmit}
            className={`flex flex-col gap-4 ${shakeKey > 0 && (errors.email || errors.password || globalError) ? "animate-shake" : ""}`}
          >
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">E-posta</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) {
                      const err = validateField("email", e.target.value);
                      setErrors((prev) => ({ ...prev, email: err }));
                    }
                  }}
                  onBlur={() => handleBlur("email", email)}
                  placeholder="ornek@email.com"
                  className={`w-full border rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                    emailState === "error"
                      ? "border-red-400 bg-red-50 focus:ring-red-200"
                      : emailState === "valid"
                      ? "border-green-400 bg-green-50 focus:ring-green-200"
                      : "border-gray-300 focus:ring-orange-300 focus:border-orange-400"
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <FieldIcon state={emailState} />
                </div>
              </div>
              {touched.email && errors.email && <ErrorMsg msg={errors.email} />}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Şifre</label>
                <Link
                  to="/forgot-password"
                  className="text-orange-500 hover:text-orange-600 text-xs font-medium rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                >
                  Şifremi Unuttum?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) {
                      const err = validateField("password", e.target.value);
                      setErrors((prev) => ({ ...prev, password: err }));
                    }
                  }}
                  onBlur={() => handleBlur("password", password)}
                  placeholder="••••••••"
                  className={`w-full border rounded-xl pl-9 pr-16 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                    passwordState === "error"
                      ? "border-red-400 bg-red-50 focus:ring-red-200"
                      : passwordState === "valid"
                      ? "border-green-400 bg-green-50 focus:ring-green-200"
                      : "border-gray-300 focus:ring-orange-300 focus:border-orange-400"
                  }`}
                />
                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                  <FieldIcon state={passwordState} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {touched.password && errors.password && <ErrorMsg msg={errors.password} />}
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-orange-500"
              />
              <span className="text-sm text-gray-600">Beni Hatırla</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl text-sm transition-all mt-1"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <>Giriş Yap <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Hesabın yok mu?{" "}
            <Link to="/register" className="text-orange-500 hover:text-orange-600 font-semibold">
              Üye Ol
            </Link>
          </p>
        </div>
      </div>

      {/* Right — Visual Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-orange-500 px-12 py-14 text-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-orange-400 opacity-40" />
        <div className="absolute bottom-10 -left-10 w-56 h-56 rounded-full bg-orange-600 opacity-30" />
        <div className="relative z-10">
          <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 inline-block mb-8">
            <span className="font-extrabold text-lg tracking-tight">Uzman<span className="text-orange-200">Baba</span></span>
          </div>
          <h2 className="text-3xl font-extrabold leading-snug mb-4">Baba sorunu çözer.</h2>
          <p className="text-orange-100 text-sm leading-relaxed">Binlerce doğrulanmış uzman, bir tık uzağında. Güvenli ödeme, garantili memnuniyet.</p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[{ value: "12.000+", label: "Uzman" }, { value: "98%", label: "Memnuniyet" }, { value: "50.000+", label: "Tamamlanan İş" }, { value: "81 İl", label: "Hizmet Alanı" }].map((s) => (
            <div key={s.label} className="bg-white/15 backdrop-blur rounded-xl px-4 py-4">
              <p className="font-extrabold text-xl">{s.value}</p>
              <p className="text-orange-100 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="relative z-10 bg-white/15 backdrop-blur rounded-xl p-4 mt-4">
          <p className="text-sm text-white/90 italic leading-relaxed">"Tesisatçıyı dakikalar içinde buldum. Çok hızlı ve güvenilir!"</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-7 h-7 rounded-full bg-orange-300 flex items-center justify-center text-xs font-bold text-orange-800">A</div>
            <div><p className="text-xs font-semibold">Ayşe K.</p><p className="text-orange-200 text-[10px]">İstanbul</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
