import { Link } from "react-router";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Logo } from "./ds";

/* ═══════════════════════════════════════════════════════════════════════════
 * Footer — the closing rule of every page.
 *
 * Brand block and the site index, laid out flush left under a 2px rule.
 * A newsletter form belongs here only after it has a real subscription
 * endpoint and consent lifecycle; the footer must never simulate success.
 * ═════════════════════════════════════════════════════════════════════════ */

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

export function Footer() {
  return (
    <footer className="mt-auto border-t-2 border-rule">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1.2fr)] md:gap-14">
          {/* Brand */}
          <div>
            <Link to="/" className="text-ink no-underline">
              <Logo size={26} textClassName="text-xl" />
            </Link>
            <p className="t-meta mt-2">Baba sorunu çözer.</p>

            <ul className="mt-6 flex list-none gap-2 p-0">
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex size-11 items-center justify-center border border-rule text-ink transition-colors hover:bg-brand hover:border-brand hover:text-paper"
                  >
                    <Icon size={16} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Index */}
          <nav aria-label="Alt menü">
            <p className="t-kicker mb-4">Site haritası</p>
            <ul className="m-0 grid list-none grid-cols-2 gap-x-8 p-0 sm:grid-cols-3">
              {FOOTER_LINKS.map(({ label, to }) => (
                <li key={label} className="border-b border-rule-soft">
                  <Link
                    to={to}
                    className="flex min-h-11 items-center text-sm text-ink no-underline transition-colors hover:text-brand-800"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

        </div>

        <p className="t-meta mt-12 border-t-2 border-rule pt-6">
          © {new Date().getFullYear()} UzmanBaba — Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
