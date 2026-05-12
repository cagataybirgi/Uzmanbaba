import { useState, useId } from "react";
import { Link } from "react-router";
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const FOOTER_LINKS = [
  { label: "Kategoriler", to: "/search" },
  { label: "Hakkımızda", to: "/hakkimizda" },
  { label: "Destek", to: "/destek" },
  { label: "İletişim", to: "/iletisim" },
  { label: "Şartlar", to: "/sartlar" },
  { label: "Gizlilik", to: "/gizlilik" },
];

const SOCIAL_LINKS = [
  {
    Icon: Facebook,
    href: "https://facebook.com/uzmanbaba",
    label: "UzmanBaba'yı Facebook'ta takip et",
  },
  {
    Icon: Twitter,
    href: "https://twitter.com/uzmanbaba",
    label: "UzmanBaba'yı Twitter'da takip et",
  },
  {
    Icon: Instagram,
    href: "https://instagram.com/uzmanbaba",
    label: "UzmanBaba'yı Instagram'da takip et",
  },
  {
    Icon: Linkedin,
    href: "https://linkedin.com/company/uzmanbaba",
    label: "UzmanBaba'yı LinkedIn'de takip et",
  },
];

type SubmitState = "idle" | "loading" | "success" | "error";

export function Footer() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  const emailId = useId();
  const helperId = `${emailId}-helper`;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      setState("error");
      setMessage("E-posta adresi zorunlu.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setState("error");
      setMessage("Geçerli bir e-posta girin.");
      return;
    }

    setState("loading");
    setMessage("");
    // Mock subscription request
    await new Promise((r) => setTimeout(r, 900));
    setState("success");
    setMessage("Teşekkürler! Bültenimize kaydoldun.");
    setEmail("");
  };

  const isSuccess = state === "success";
  const isError = state === "error";
  const isLoading = state === "loading";

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <Link to="/" className="w-fit">
              <div className="bg-orange-500 text-white font-extrabold text-lg px-3 py-1 rounded-lg tracking-tight">
                Uzman<span className="text-orange-200">Baba</span>
              </div>
            </Link>
            <p className="text-gray-500 text-sm mt-1">Baba sorunu çözer.</p>
          </div>

          {/* Links */}
          <nav aria-label="Alt menü">
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-600 list-none p-0 m-0">
              {FOOTER_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="hover:text-orange-500 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Newsletter + Socials */}
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col gap-2"
              noValidate
            >
              <label
                htmlFor={emailId}
                className="text-sm font-medium text-gray-700"
              >
                Bülten Kaydı
              </label>
              <div className="flex gap-2">
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state === "error" || state === "success") {
                      setState("idle");
                      setMessage("");
                    }
                  }}
                  placeholder="E-posta adresiniz"
                  autoComplete="email"
                  aria-invalid={isError}
                  aria-describedby={message ? helperId : undefined}
                  disabled={isLoading}
                  className={`border rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 transition-colors ${
                    isError
                      ? "border-red-400 bg-red-50 focus:ring-red-200"
                      : "border-gray-300 focus:ring-orange-400"
                  }`}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center min-w-[64px] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                >
                  {isLoading ? (
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
                  ) : (
                    "Gönder"
                  )}
                </button>
              </div>

              {/* Status message (live region announces to screen readers) */}
              {message && (
                <p
                  id={helperId}
                  role={isError ? "alert" : "status"}
                  aria-live={isError ? "assertive" : "polite"}
                  className={`text-xs flex items-center gap-1 ${
                    isSuccess ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {isSuccess ? (
                    <CheckCircle size={12} aria-hidden="true" />
                  ) : (
                    <AlertCircle size={12} aria-hidden="true" />
                  )}
                  {message}
                </p>
              )}
            </form>

            {/* Social links */}
            <div className="flex gap-3 mt-1">
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                >
                  <Icon size={14} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} UzmanBaba — Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
