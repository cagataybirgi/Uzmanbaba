import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Check, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { toast } from "../lib/toast";
import {
  Button,
  Checkbox,
  Field,
  FieldError,
  Input,
  Kicker,
  Select,
  Table,
  Td,
  Textarea,
} from "../components/ds";
import { cn } from "../components/ui/utils";

type AccountType = "customer" | "professional";

const SPECIALTIES = [
  "Tesisat", "Elektrik", "Temizlik", "Nakliyat", "Boya & Badana",
  "Marangozluk", "Klima", "Bahçe", "Güvenlik Sistemleri", "Diğer",
];

const ACCOUNT_TYPES: {
  value: AccountType;
  title: string;
  desc: string;
}[] = [
  {
    value: "customer",
    title: "Hizmet Alan",
    desc: "İş yaptırmak istiyorum",
  },
  {
    value: "professional",
    title: "Uzman / Usta",
    desc: "İş almak istiyorum",
  },
];

const STRENGTH_LABELS = ["Çok zayıf", "Zayıf", "Orta", "Güçlü", "Çok güçlü"];

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

  const validateField = useCallback(
    (name: string, value: string): string => {
      if (name === "fullName")
        return value.trim().length < 2 ? "Ad Soyad en az 2 karakter." : "";
      if (name === "email") {
        if (!value.trim()) return "E-posta zorunlu.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Geçerli bir e-posta girin.";
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
      if (name === "specialty" && accountType === "professional")
        return !value ? "Uzmanlık alanı seçin." : "";
      if (name === "city" && accountType === "professional")
        return !value.trim() ? "Şehir zorunlu." : "";
      return "";
    },
    [password, accountType],
  );

  const handleBlur = (name: string, value: string) => {
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((e) => ({ ...e, [name]: validateField(name, value) }));
  };

  const handleChange = (name: string, value: string) => {
    if (touched[name]) {
      setErrors((e) => ({ ...e, [name]: validateField(name, value) }));
    }
  };

  const passwordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return { score, label: STRENGTH_LABELS[score] ?? "Zayıf" };
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
      window.scrollTo({ top: 0, behavior: "smooth" });
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
      await register({
        name: fullName,
        email,
        phone,
        password,
        accountType,
        specialty,
        city,
        bio,
      });
      navigate("/verify-email");
    } catch (err) {
      // Surface the failure instead of silently re-enabling the button.
      // The most common case is a 409 "this email already exists" — if we
      // swallow it the user just sees nothing happen and never gets a code.
      if (err instanceof ApiError && err.code === "conflict") {
        // Pull the user back to step 1 and flag the email field.
        setStep(1);
        setTouched((t) => ({ ...t, email: true }));
        setErrors((prev) => ({
          ...prev,
          email: "Bu e-posta ile kayıtlı bir hesap zaten var.",
        }));
        setShakeKey((k) => k + 1);
      }
      toast.apiError(err, "Kayıt başarısız. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  const strength = passwordStrength();
  const summary = [
    { label: "Ad Soyad", value: fullName },
    { label: "E-posta", value: email },
    { label: "Telefon", value: phone },
  ];

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 py-14 md:py-20">
      <Kicker className="mb-3.5">Adım {step} / 2</Kicker>
      <h1 className="t-title">Hesap oluştur.</h1>
      <p className="t-lead mt-3.5">
        Bilgilerini doldur, dakikalar içinde hazırsın.
      </p>

      {/* Progress — two bars, the second filling on step 2. */}
      <div
        className="mt-7 flex gap-2"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={2}
        aria-label={`Kayıt adımı ${step} / 2`}
      >
        <div className="h-1.5 flex-1 bg-brand" />
        <div className={cn("h-1.5 flex-1", step === 2 ? "bg-brand" : "bg-ink/20")} />
      </div>

      {step === 1 ? (
        <div
          key={`step1-${shakeKey}`}
          className={cn("mt-10 flex flex-col gap-6", shakeKey > 0 && "animate-shake")}
        >
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-3 text-xs font-semibold tracking-wide text-ink/70">
              Hesap türü
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {ACCOUNT_TYPES.map((type) => {
                const active = accountType === type.value;
                return (
                  <label
                    key={type.value}
                    className={cn(
                      "relative flex cursor-pointer flex-col border-2 p-6 transition-colors",
                      // The input itself is visually hidden, so the card
                      // carries the focus ring on its behalf.
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                      active
                        ? "border-brand bg-brand-100"
                        : "border-rule hover:bg-ink/4",
                    )}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value={type.value}
                      checked={active}
                      onChange={() => setAccountType(type.value)}
                      className="peer sr-only"
                    />
                    <span className="font-display text-xl font-extrabold">
                      {type.title}
                    </span>
                    <span className="mt-1.5 text-[15px] leading-7 text-ink/70">
                      {type.desc}
                    </span>
                    {active && (
                      <Check
                        size={20}
                        aria-hidden="true"
                        className="absolute top-5 right-5 text-brand-800"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Field
            label="Ad Soyad"
            required
            error={touched.fullName ? errors.fullName : undefined}
          >
            {(field) => (
              <Input
                {...field}
                type="text"
                value={fullName}
                autoComplete="name"
                placeholder="Adın ve Soyadın"
                onChange={(e) => {
                  setFullName(e.target.value);
                  handleChange("fullName", e.target.value);
                }}
                onBlur={() => handleBlur("fullName", fullName)}
              />
            )}
          </Field>

          <Field
            label="E-posta"
            required
            error={touched.email ? errors.email : undefined}
          >
            {(field) => (
              <Input
                {...field}
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
            label="Telefon"
            required
            error={touched.phone ? errors.phone : undefined}
          >
            {(field) => (
              <Input
                {...field}
                type="tel"
                value={phone}
                autoComplete="tel"
                placeholder="+90 5__ ___ __ __"
                onChange={(e) => {
                  setPhone(e.target.value);
                  handleChange("phone", e.target.value);
                }}
                onBlur={() => handleBlur("phone", phone)}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Şifre"
              required
              error={touched.password ? errors.password : undefined}
            >
              {(field) => (
                <div className="relative">
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="new-password"
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
                    className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-ink/55 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
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

            <Field
              label="Tekrar"
              required
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
            >
              {(field) => (
                <div className="relative">
                  <Input
                    {...field}
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="pr-12"
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      handleChange("confirmPassword", e.target.value);
                    }}
                    onBlur={() => handleBlur("confirmPassword", confirmPassword)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Şifreyi gizle" : "Şifreyi göster"}
                    aria-pressed={showConfirm}
                    className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-ink/55 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                  >
                    {showConfirm ? (
                      <EyeOff size={17} aria-hidden="true" />
                    ) : (
                      <Eye size={17} aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}
            </Field>
          </div>

          {password.length > 0 && (
            <div className="animate-slide-down">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 transition-colors",
                      i < strength.score ? "bg-brand" : "bg-ink/20",
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-ink/70" aria-live="polite">
                Şifre gücü:{" "}
                <span className="font-semibold text-ink">{strength.label}</span>
              </p>
            </div>
          )}

          <Button variant="primary" size="lg" block onClick={handleNextStep}>
            Devam Et
          </Button>
        </div>
      ) : (
        <form
          key={`step2-${shakeKey}`}
          onSubmit={handleSubmit}
          noValidate
          className={cn("mt-10 flex flex-col gap-6", shakeKey > 0 && "animate-shake")}
        >
          {accountType === "professional" && (
            <>
              <Field
                label="Uzmanlık Alanı"
                required
                error={touched.specialty ? errors.specialty : undefined}
              >
                {(field) => (
                  <Select
                    {...field}
                    value={specialty}
                    onChange={(e) => {
                      setSpecialty(e.target.value);
                      handleChange("specialty", e.target.value);
                    }}
                    onBlur={() => handleBlur("specialty", specialty)}
                  >
                    <option value="">Seçiniz…</option>
                    {SPECIALTIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field
                label="Hizmet Şehri"
                required
                error={touched.city ? errors.city : undefined}
              >
                {(field) => (
                  <Input
                    {...field}
                    type="text"
                    value={city}
                    autoComplete="address-level2"
                    placeholder="Örn: Ankara"
                    onChange={(e) => {
                      setCity(e.target.value);
                      handleChange("city", e.target.value);
                    }}
                    onBlur={() => handleBlur("city", city)}
                  />
                )}
              </Field>

              <Field label="Kısa Tanıtım" hint="İsteğe bağlı.">
                {(field) => (
                  <Textarea
                    {...field}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Kendinizi kısaca tanıtın…"
                  />
                )}
              </Field>
            </>
          )}

          <div className="border-y-2 border-rule py-6">
            <Kicker className="mb-3.5">Hesap Özeti</Kicker>
            <Table caption="Girdiğin bilgilerin özeti" stack={false}>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.label}>
                    <Td>{row.label}</Td>
                    <Td className="max-w-0 truncate text-right">
                      {row.value || "—"}
                    </Td>
                  </tr>
                ))}
                <tr>
                  <Td>Hesap Türü</Td>
                  <Td className="text-right font-display font-extrabold">
                    {accountType === "customer" ? "Hizmet Alan" : "Uzman / Usta"}
                  </Td>
                </tr>
              </tbody>
            </Table>
          </div>

          <div>
            <Checkbox
              checked={terms}
              onChange={(e) => {
                setTerms(e.target.checked);
                if (e.target.checked) {
                  setErrors((prev) => ({ ...prev, terms: "" }));
                }
              }}
            >
              <Link
                to="/sartlar"
                className="font-semibold text-brand-800 underline underline-offset-4"
              >
                Kullanım Şartları
              </Link>
              'nı ve{" "}
              <Link
                to="/gizlilik"
                className="font-semibold text-brand-800 underline underline-offset-4"
              >
                Gizlilik Politikası
              </Link>
              'nı okudum, kabul ediyorum.
            </Checkbox>
            {touched.terms && errors.terms && (
              <FieldError>{errors.terms}</FieldError>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Geri
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={loading}
              loadingLabel="Kaydediliyor…"
            >
              Üye Ol
            </Button>
          </div>
        </form>
      )}

      <p className="t-lead mt-7">
        Zaten hesabın var mı?{" "}
        <Link
          to="/login"
          className="font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-700"
        >
          Giriş Yap
        </Link>
      </p>
    </div>
  );
}
