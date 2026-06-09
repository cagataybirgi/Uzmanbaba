import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Mail, RefreshCw, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export function VerifyEmail() {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { verifyEmail, resendVerification, user, pendingEmail } = useAuth();

  const displayEmail = pendingEmail || user?.email || "ornek@email.com";
  const maskedEmail = displayEmail.replace(/(.{2}).+(@.+)/, "$1•••$2");

  // Countdown timer
  useEffect(() => {
    if (countdown === 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Auto focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      setError("");
      // Handle paste
      if (value.length > 1) {
        const pasted = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
        const newDigits = Array(OTP_LENGTH).fill("");
        pasted.split("").forEach((ch, i) => { newDigits[i] = ch; });
        setDigits(newDigits);
        const nextIdx = Math.min(pasted.length, OTP_LENGTH - 1);
        inputRefs.current[nextIdx]?.focus();
        return;
      }
      const digit = value.replace(/\D/g, "").slice(-1);
      const newDigits = [...digits];
      newDigits[index] = digit;
      setDigits(newDigits);
      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace") {
        if (digits[index]) {
          const newDigits = [...digits];
          newDigits[index] = "";
          setDigits(newDigits);
        } else if (index > 0) {
          inputRefs.current[index - 1]?.focus();
          const newDigits = [...digits];
          newDigits[index - 1] = "";
          setDigits(newDigits);
        }
      }
      if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
      if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    },
    [digits]
  );

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length < OTP_LENGTH) {
      setError("Lütfen 6 haneli kodu girin.");
      setShakeKey((k) => k + 1);
      return;
    }
    setVerifying(true);
    try {
      const success = await verifyEmail(code);
      if (success) {
        setVerified(true);
        setTimeout(() => navigate("/dashboard"), 1800);
      } else {
        setError("Hatalı kod. Tekrar deneyin.");
        setShakeKey((k) => k + 1);
        setDigits(Array(OTP_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } catch {
      setError("Bağlantı kurulamadı. Tekrar deneyin.");
      setShakeKey((k) => k + 1);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await resendVerification();
      setResent(true);
      setCountdown(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      setError("");
      setTimeout(() => { setResent(false); inputRefs.current[0]?.focus(); }, 3000);
    } catch {
      setError("Kod gönderilemedi. Lütfen sonra tekrar deneyin.");
    } finally {
      setResending(false);
    }
  };

  const progress = ((RESEND_SECONDS - countdown) / RESEND_SECONDS) * 100;
  const circumference = 2 * Math.PI * 24;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 px-4 py-12">
      <div className="w-full max-w-md">
        {verified ? (
          /* ── Success State ── */
          <div className="bg-white rounded-3xl shadow-xl p-10 text-center flex flex-col items-center gap-5 animate-scale-in">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-success-pulse">
              <ShieldCheck size={44} className="text-green-500 animate-pop-in" />
            </div>
            <div>
              <h2 className="text-gray-900 text-2xl font-extrabold">E-posta Doğrulandı!</h2>
              <p className="text-gray-500 text-sm mt-2">Hesabın başarıyla aktive edildi. Paneline yönlendiriliyorsun...</p>
            </div>
            <div className="flex gap-1 mt-2">
              {[0,1,2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : (
          /* ── Verification Form ── */
          <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 flex flex-col gap-7 animate-fade-in-up">
            {/* Icon + Header */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
                <Mail size={30} className="text-orange-500" />
              </div>
              <div>
                <h1 className="text-gray-900 text-2xl font-extrabold">E-postanı Doğrula</h1>
                <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                  <span className="font-semibold text-gray-700">{maskedEmail}</span> adresine
                  6 haneli doğrulama kodu gönderdik.
                </p>
              </div>
            </div>

            {/* OTP Inputs */}
            <div className="flex flex-col items-center gap-3">
              <div
                key={shakeKey}
                className={`flex gap-3 ${shakeKey > 0 && error ? "animate-shake" : ""}`}
              >
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-all ${
                      digit
                        ? "border-orange-400 bg-orange-50 text-orange-600"
                        : "border-gray-300 text-gray-800 focus:border-orange-400 focus:bg-orange-50"
                    } ${error ? "border-red-400 bg-red-50" : ""}`}
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-500 text-sm flex items-center gap-1.5 animate-slide-down">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                  {error}
                </p>
              )}

              {/* Resent message */}
              {resent && (
                <p className="text-green-600 text-sm flex items-center gap-1.5 animate-slide-down">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Kod tekrar gönderildi!
                </p>
              )}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={verifying || digits.join("").length < OTP_LENGTH}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:bg-orange-300 text-white font-semibold py-3.5 rounded-xl text-sm transition-all"
            >
              {verifying ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <>Doğrula <ArrowRight size={16} /></>
              )}
            </button>

            {/* Resend + Countdown */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                {/* Circular countdown */}
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                    <circle
                      cx="28" cy="28" r="24" fill="none"
                      stroke={countdown > 0 ? "#f97316" : "#d1d5db"}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (circumference * progress) / 100}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-sm font-bold ${countdown > 0 ? "text-orange-500" : "text-gray-400"}`}>
                      {countdown > 0 ? countdown : "✓"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-gray-500 text-sm">
                    {countdown > 0 ? `Kodu tekrar gönder (${countdown}s)` : "Kod ulaşmadı mı?"}
                  </p>
                  <button
                    onClick={handleResend}
                    disabled={countdown > 0 || resending}
                    className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                      countdown > 0 ? "text-gray-400 cursor-not-allowed" : "text-orange-500 hover:text-orange-600"
                    }`}
                  >
                    <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
                    {resending ? "Gönderiliyor..." : "Tekrar Gönder"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
