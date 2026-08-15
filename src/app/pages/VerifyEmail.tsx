import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Alert, Button, Kicker } from "../components/ds";
import { cn } from "../components/ui/utils";

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
        pasted.split("").forEach((ch, i) => {
          newDigits[i] = ch;
        });
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
    [digits],
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
      if (e.key === "ArrowRight" && index < OTP_LENGTH - 1)
        inputRefs.current[index + 1]?.focus();
    },
    [digits],
  );

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
        setTimeout(() => navigate("/dashboard"), 1600);
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
      setTimeout(() => {
        setResent(false);
        inputRefs.current[0]?.focus();
      }, 3000);
    } catch {
      setError("Kod gönderilemedi. Lütfen sonra tekrar deneyin.");
    } finally {
      setResending(false);
    }
  };

  /* ── Verified ─────────────────────────────────────────────────────────── */

  if (verified) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-6 py-20 md:py-28">
        <Kicker className="mb-3.5">Doğrulama tamamlandı</Kicker>
        <h1 className="t-title">E-postan doğrulandı.</h1>
        <p className="t-lead mt-3.5 max-w-[48ch]" role="status">
          Hesabın aktive edildi. Paneline yönlendiriliyorsun…
        </p>
        <div className="mt-10 h-1.5 w-full max-w-64 bg-brand" />
      </div>
    );
  }

  /* ── Code entry ───────────────────────────────────────────────────────── */

  return (
    <div className="mx-auto w-full max-w-[640px] px-6 py-14 md:py-24">
      <Kicker className="mb-3.5">Doğrulama</Kicker>
      <h1 className="t-title">E-postanı doğrula.</h1>
      <p className="t-lead mt-3.5 max-w-[48ch]">
        <span className="font-semibold">{maskedEmail}</span> adresine 6 haneli
        bir kod gönderdik. Kodu aşağıya gir.
      </p>

      <form onSubmit={handleVerify} noValidate>
        <fieldset className="m-0 mt-10 border-0 p-0">
          <legend className="sr-only">6 haneli doğrulama kodu</legend>
          <div
            key={shakeKey}
            className={cn(
              "flex flex-wrap gap-2 sm:gap-3",
              shakeKey > 0 && error && "animate-shake",
            )}
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={6}
                value={digit}
                aria-label={`${i + 1}. hane`}
                aria-invalid={Boolean(error)}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className={cn(
                  // 44px wide at the smallest width: six boxes plus their
                  // gaps still fit inside a 375px viewport's gutters, and
                  // the box is exactly a minimum touch target.
                  "h-14 w-11 border-2 bg-surface text-center font-display text-2xl font-extrabold text-ink caret-brand sm:h-20 sm:w-16 sm:text-[32px]",
                  "focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand",
                  error ? "border-danger bg-danger-tint" : "border-rule",
                )}
              />
            ))}
          </div>
        </fieldset>

        {error && (
          <Alert tone="error" className="mt-6">
            {error}
          </Alert>
        )}
        {resent && (
          <Alert tone="success" className="mt-6">
            Kod tekrar gönderildi.
          </Alert>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={digits.join("").length < OTP_LENGTH}
            loading={verifying}
            loadingLabel="Doğrulanıyor…"
          >
            Doğrula
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleResend}
            disabled={countdown > 0}
            loading={resending}
            loadingLabel="Gönderiliyor…"
          >
            <RefreshCw size={15} aria-hidden="true" />
            {countdown > 0 ? `Tekrar Gönder (${countdown}s)` : "Tekrar Gönder"}
          </Button>
        </div>
      </form>

      <p className="t-body mt-7">
        Kod ulaşmadı mı? Gelen kutunu ve spam klasörünü kontrol et.
      </p>
    </div>
  );
}
