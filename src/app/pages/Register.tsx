import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type AccountType = "customer" | "professional";
type FieldState = "idle" | "valid" | "error";

const SPECIALTIES = [
  "Tesisat", "Elektrik", "Temizlik", "Nakliyat", "Boya & Badana",
  "Marangozluk", "Klima", "Bahçe", "Güvenlik Sistemleri", "Diğer",
];

function FieldIcon({ state }: { state: FieldState }) {
  if (state === "valid") return <CheckCircle size={14} className="text-green-500 animate-pop-in" />;
  if (state === "error") return <AlertCircle size={14} className="text-red-400 animate-pop-in" />;
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

export function Register() {
  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [shakeKey, setShakeKey] = useState(0);
  const navigate = useNavigate();
  const { register } = useAuth();

  const validateField = useCallback((name: string, value: string): string => {
    if (name === "fullName") return value.trim().length < 2 ? "Ad Soyad en az 2 karakter." : "";
    if (name === "email") {
      if (!value.trim()) return "E-posta zorunlu.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Geçerli bir e-posta girin.";
    }
    if (name === "phone") {
      if (!value.trim()) return "Telefon zorunlu.";
      if (value.replace(/\D/g, "").length < 10) return "Geçerli telefon girin.";
    }
    if (name === "password") {
      if (!value) return "Şifre zorunlu.";
      if (value.length < 8) return "En az 8 karakter olmalı.";
    }
    if (name === "confirmPassword") {
      if (!value) return "Şifreyi tekrar girin.";
      if (value !== password) return "Şifreler eşleşmiyor.";
    }
    if (name === "specialty" && accountType === "professional") return !value ? "Uzmanlık alanı seçin." : "";
    if (name === "city" && accountType === "professional") return !value.trim() ? "Şehir zorunlu." : "";
    return "";
  }, [password, accountType]);

  const getFieldState = (name: string, value: string): FieldState => {
    if (!touched[name]) return "idle";
    return validateField(name, value) ? "error" : "valid";
  };

  const handleBlur = (name: string, value: string) => {
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((e) => ({ ...e, [name]: validateField(name, value) }));
  };

  const handleChange = (name: string, value: string) => {
    if (touched[name]) {
      setErrors((e) => ({ ...e, [name]: validateField(name, value) }));
    }
  };

  const passwordStrength = (): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const labels = ["Çok zayıf", "Zayıf", "Orta", "Güçlü", "Çok güçlü"];
    const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"];
    return { score, label: labels[score] || "Zayıf", color: colors[score] || "bg-red-400" };
  };

  const validateStep1 = (): boolean => {
    const fields = { fullName, email, phone, password, confirmPassword };
    const newErrors: Record<string, string> = {};
    Object.entries(fields).forEach(([k, v]) => {
      newErrors[k] = validateField(k, v);
    });
    setErrors(newErrors);
    setTouched(Object.fromEntries(Object.keys(fields).map((k) => [k, true])));
    return Object.values(newErrors).every((e) => !e);
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (accountType === "professional") {
      newErrors.specialty = validateField("specialty", specialty);
      newErrors.city = validateField("city", city);
    }
    if (!terms) newErrors.terms = "Şartları kabul etmelisiniz.";
    setErrors((e) => ({ ...e, ...newErrors }));
    setTouched((t) => ({ ...t, specialty: true, city: true, terms: true }));
    return Object.values(newErrors).every((e) => !e);
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    } else {
      setShakeKey((k) => k + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) {
      setShakeKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      await register({ name: fullName, email, phone, password, accountType, specialty, city, bio });
      navigate("/verify-email");
    } catch {
      setLoading(false);
    }
  };

  const str = passwordStrength();

  // Input class helper
  const inputCls = (state: FieldState, extra = "") =>
    `w-full border rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${extra} ${
      state === "error"
        ? "border-red-400 bg-red-50 focus:ring-red-200"
        : state === "valid"
        ? "border-green-400 bg-green-50 focus:ring-green-200"
        : "border-gray-300 focus:ring-orange-300 focus:border-orange-400"
    }`;

  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      {/* Left — Visual Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-orange-500 px-10 py-14 text-white relative overflow-hidden flex-shrink-0">
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-orange-400 opacity-40" />
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-orange-600 opacity-30" />
        <div className="relative z-10">
          <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 inline-block mb-8">
            <span className="font-extrabold text-lg tracking-tight">Uzman<span className="text-orange-200">Baba</span></span>
          </div>
          <h2 className="text-3xl font-extrabold leading-snug mb-4">Topluluğumuza Katıl!</h2>
          <p className="text-orange-100 text-sm leading-relaxed">İster hizmet al, ister uzman olarak kazan.</p>
        </div>
        <div className="relative z-10 flex flex-col gap-4">
          {[
            { title: "Ücretsiz Kayıt", desc: "Hiçbir kurulum ücreti ödemeden başla." },
            { title: "Güvenli Ödeme", desc: "Para işin bitiminde aktarılır." },
            { title: "7/24 Destek", desc: "Her an yanındayız." },
            { title: "Doğrulanmış Profil", desc: "Güven rozeti ile öne çık." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <CheckCircle size={18} className="text-orange-200 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-orange-200 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="relative z-10 flex items-center gap-3 mt-6">
          <div className="flex -space-x-2">
            {["A","B","C","D"].map((l, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-orange-500 flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: ["#f97316","#fb923c","#fdba74","#fed7aa"][i], color: "#7c2d12" }}>
                {l}
              </div>
            ))}
          </div>
          <p className="text-orange-100 text-xs"><span className="font-bold text-white">+12.000</span> uzman zaten aramızda</p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md flex flex-col gap-5 animate-fade-in-up">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-gray-900 text-2xl font-extrabold">
              {step === 1 ? "Hesap Oluştur" : "Neredeyse bitti!"}
            </h1>
            <p className="text-gray-500 text-sm">
              {step === 1 ? "Bilgilerini doldur, dakikalar içinde hazırsın." : "Son birkaç detay kaldı."}
            </p>
          </div>

          {/* Progress */}
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-orange-500 transition-all" />
              <div className={`flex-1 h-1.5 rounded-full transition-all ${step === 2 ? "bg-orange-500" : "bg-gray-200"}`} />
            </div>
            <p className="text-xs text-gray-400">Adım {step} / 2</p>
          </div>

          {step === 1 ? (
            <div key={`step1-${shakeKey}`} className={`flex flex-col gap-4 ${shakeKey > 0 ? "animate-shake" : ""}`}>
              {/* Account Type */}
              <div className="grid grid-cols-2 gap-3">
                {(["customer", "professional"] as AccountType[]).map((type) => (
                  <button key={type} type="button" onClick={() => setAccountType(type)}
                    className={`flex flex-col items-center gap-2 border-2 rounded-xl py-4 px-3 transition-all ${
                      accountType === type ? "border-orange-500 bg-orange-50 scale-[1.02]" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <span className="text-2xl">{type === "customer" ? "🏠" : "🔧"}</span>
                    <div className="text-center">
                      <p className={`text-sm font-semibold ${accountType === type ? "text-orange-600" : "text-gray-700"}`}>
                        {type === "customer" ? "Hizmet Alan" : "Uzman / Usta"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {type === "customer" ? "İş yaptırmak istiyorum" : "İş almak istiyorum"}
                      </p>
                    </div>
                    {accountType === type && (
                      <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center animate-pop-in">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Google */}
              <button className="flex items-center justify-center gap-3 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-700 transition-all w-full">
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google ile Kaydol
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-gray-400 text-xs">veya e-posta ile</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={fullName}
                    onChange={(e) => { setFullName(e.target.value); handleChange("fullName", e.target.value); }}
                    onBlur={() => handleBlur("fullName", fullName)}
                    placeholder="Adın ve Soyadın"
                    className={inputCls(getFieldState("fullName", fullName), "pl-9 pr-10")} />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2"><FieldIcon state={getFieldState("fullName", fullName)} /></div>
                </div>
                {touched.fullName && errors.fullName && <ErrorMsg msg={errors.fullName} />}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">E-posta</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); handleChange("email", e.target.value); }}
                    onBlur={() => handleBlur("email", email)}
                    placeholder="ornek@email.com"
                    className={inputCls(getFieldState("email", email), "pl-9 pr-10")} />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2"><FieldIcon state={getFieldState("email", email)} /></div>
                </div>
                {touched.email && errors.email && <ErrorMsg msg={errors.email} />}
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Telefon</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="tel" value={phone}
                    onChange={(e) => { setPhone(e.target.value); handleChange("phone", e.target.value); }}
                    onBlur={() => handleBlur("phone", phone)}
                    placeholder="+90 5__ ___ __ __"
                    className={inputCls(getFieldState("phone", phone), "pl-9 pr-10")} />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2"><FieldIcon state={getFieldState("phone", phone)} /></div>
                </div>
                {touched.phone && errors.phone && <ErrorMsg msg={errors.phone} />}
              </div>

              {/* Password Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Şifre</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => { setPassword(e.target.value); handleChange("password", e.target.value); }}
                      onBlur={() => handleBlur("password", password)}
                      placeholder="••••••••"
                      className={inputCls(getFieldState("password", password), "pl-9 pr-9")} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  {touched.password && errors.password && <ErrorMsg msg={errors.password} />}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Tekrar</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showConfirm ? "text" : "password"} value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); handleChange("confirmPassword", e.target.value); }}
                      onBlur={() => handleBlur("confirmPassword", confirmPassword)}
                      placeholder="••••••••"
                      className={inputCls(getFieldState("confirmPassword", confirmPassword), "pl-9 pr-9")} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && <ErrorMsg msg={errors.confirmPassword} />}
                </div>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div className="flex flex-col gap-1 animate-slide-down">
                  <div className="flex gap-1">
                    {[0,1,2,3].map((i) => (
                      <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < str.score ? str.color : "bg-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Şifre gücü: <span className="font-medium">{str.label}</span></p>
                </div>
              )}

              <button type="button" onClick={handleNextStep}
                className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold py-3 rounded-xl text-sm transition-all mt-1">
                Devam Et <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <form key={`step2-${shakeKey}`} onSubmit={handleSubmit}
              className={`flex flex-col gap-5 ${shakeKey > 0 ? "animate-shake" : ""}`}>
              {accountType === "professional" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">Uzmanlık Alanı</label>
                    <select value={specialty}
                      onChange={(e) => { setSpecialty(e.target.value); handleChange("specialty", e.target.value); }}
                      onBlur={() => handleBlur("specialty", specialty)}
                      className={inputCls(getFieldState("specialty", specialty), "px-4")}>
                      <option value="">Seçiniz...</option>
                      {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {touched.specialty && errors.specialty && <ErrorMsg msg={errors.specialty} />}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">Hizmet Şehri</label>
                    <input type="text" value={city}
                      onChange={(e) => { setCity(e.target.value); handleChange("city", e.target.value); }}
                      onBlur={() => handleBlur("city", city)}
                      placeholder="Örn: Ankara"
                      className={inputCls(getFieldState("city", city), "px-4")} />
                    {touched.city && errors.city && <ErrorMsg msg={errors.city} />}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">Kısa Tanıtım <span className="text-gray-400 font-normal">(İsteğe bağlı)</span></label>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                      placeholder="Kendinizi kısaca tanıtın..."
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 resize-none transition-all" />
                  </div>
                </>
              )}

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-1.5 border border-gray-100 animate-scale-in">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Hesap Özeti</p>
                {[{ label: "Ad Soyad", val: fullName }, { label: "E-posta", val: email }, { label: "Telefon", val: phone }].map((row) => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-medium text-gray-800 truncate max-w-[180px]">{row.val || "—"}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Hesap Türü</span>
                  <span className="font-medium text-orange-600">{accountType === "customer" ? "Hizmet Alan" : "Uzman / Usta"}</span>
                </div>
              </div>

              {/* Terms */}
              <div className="flex flex-col gap-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 accent-orange-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    <Link to="/sartlar" className="text-orange-500 hover:underline font-medium">Kullanım Şartları</Link>'nı ve{" "}
                    <Link to="/gizlilik" className="text-orange-500 hover:underline font-medium">Gizlilik Politikası</Link>'nı okudum, kabul ediyorum.
                  </span>
                </label>
                {errors.terms && touched.terms && <ErrorMsg msg={errors.terms} />}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-none border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 px-5 rounded-xl text-sm transition-colors">
                  Geri
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl text-sm transition-all">
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (<>Üye Ol <ArrowRight size={15} /></>)}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500">
            Zaten hesabın var mı?{" "}
            <Link to="/login" className="text-orange-500 hover:text-orange-600 font-semibold">Giriş Yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
