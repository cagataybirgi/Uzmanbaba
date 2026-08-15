import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ButtonLink, Logo, Photo } from "./ds";
import { cn } from "./ui/utils";

/* ═══════════════════════════════════════════════════════════════════════════
 * Navbar — the header bar.
 *
 * A 56px rule-bottomed bar holding the lock-up, the primary links and the
 * account actions. Below `md` the links collapse into a panel under the
 * bar; the account menu is a plain popover, closed by outside click, by
 * Escape and by any navigation.
 * ═════════════════════════════════════════════════════════════════════════ */

const NAV_LINKS = [
  { label: "Hizmetler", to: "/search" },
  { label: "Nasıl Çalışır", to: "/#how-it-works" },
] as const;

const ACCOUNT_LINKS = [
  { label: "Panelim", to: "/dashboard", icon: LayoutDashboard },
  { label: "Profilim", to: "/dashboard?tab=profile", icon: User },
  { label: "Ayarlar", to: "/dashboard?tab=settings", icon: Settings },
] as const;

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (to: string) => location.pathname === to.split("#")[0];

  // Any navigation closes both panels — otherwise the mobile menu stays
  // open on top of the page the user just asked for.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [accountOpen]);

  useEffect(() => {
    if (!menuOpen && !accountOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, accountOpen]);

  const handleLogout = () => {
    logout();
    setAccountOpen(false);
    setMenuOpen(false);
    navigate("/");
  };

  const linkClass = (to: string) =>
    cn(
      "flex items-center text-sm transition-colors hover:text-brand-800",
      isActive(to) ? "text-brand-800 font-semibold" : "text-ink",
    );

  return (
    <header className="sticky top-0 z-50 border-b-2 border-rule bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-paper"
      >
        İçeriğe geç
      </a>

      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-4 px-6">
        <Link
          to="/"
          className="mr-auto text-ink no-underline"
          aria-label="UzmanBaba ana sayfa"
        >
          <Logo size={26} />
        </Link>

        {/* ── Desktop links ─────────────────────────────────────────── */}
        <nav aria-label="Ana menü" className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className={linkClass(to)}
              aria-current={isActive(to) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Desktop account area ──────────────────────────────────── */}
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated && user ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="flex min-h-11 cursor-pointer items-center gap-2.5 border border-rule px-2.5 text-sm transition-colors hover:bg-ink/7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Photo src={user.avatar} name={user.name} alt="" size={26} />
                <span className="max-w-28 truncate font-display font-extrabold">
                  {user.name.split(" ")[0]}
                </span>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={cn(
                    "text-ink/50 transition-transform",
                    accountOpen && "rotate-180",
                  )}
                />
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  aria-label="Hesap menüsü"
                  className="animate-slide-down absolute top-full right-0 z-50 mt-0.5 w-60 border-2 border-rule bg-surface shadow-md"
                >
                  <div className="border-b border-rule-soft px-4 py-3">
                    <p className="truncate font-display text-sm font-extrabold">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-ink/60">{user.email}</p>
                  </div>

                  {ACCOUNT_LINKS.map(({ label, to, icon: Icon }) => (
                    <Link
                      key={label}
                      to={to}
                      role="menuitem"
                      className="flex min-h-11 items-center gap-3 px-4 text-sm text-ink no-underline transition-colors hover:bg-brand/10 hover:text-brand-800"
                    >
                      <Icon size={15} aria-hidden="true" className="text-ink/50" />
                      {label}
                    </Link>
                  ))}

                  <div className="border-t border-rule-soft">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 text-left text-sm text-danger transition-colors hover:bg-danger/8"
                    >
                      <LogOut size={15} aria-hidden="true" />
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <ButtonLink to="/login" variant="secondary">
                Giriş Yap
              </ButtonLink>
              <ButtonLink to="/register" variant="primary">
                Üye Ol
              </ButtonLink>
            </>
          )}
        </div>

        {/* ── Mobile trigger ────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
          className="-mr-2 flex size-11 cursor-pointer items-center justify-center text-ink transition-colors hover:bg-ink/7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:hidden"
        >
          {menuOpen ? (
            <X size={22} aria-hidden="true" />
          ) : (
            <Menu size={22} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* ── Mobile panel ────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="animate-slide-down border-t-2 border-rule bg-paper md:hidden"
        >
          <nav aria-label="Ana menü" className="mx-auto max-w-[1200px] px-6 py-2">
            {NAV_LINKS.map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="flex min-h-12 items-center border-b border-rule-soft text-[15px] text-ink no-underline"
              >
                {label}
              </Link>
            ))}

            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-3 border-b border-rule-soft py-3">
                  <Photo src={user.avatar} name={user.name} alt="" size={36} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-extrabold">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-ink/60">{user.email}</p>
                  </div>
                </div>
                {ACCOUNT_LINKS.map(({ label, to, icon: Icon }) => (
                  <Link
                    key={label}
                    to={to}
                    className="flex min-h-12 items-center gap-3 border-b border-rule-soft text-[15px] text-ink no-underline"
                  >
                    <Icon size={16} aria-hidden="true" className="text-ink/50" />
                    {label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex min-h-12 w-full cursor-pointer items-center gap-3 text-left text-[15px] font-semibold text-danger"
                >
                  <LogOut size={16} aria-hidden="true" />
                  Çıkış Yap
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 py-4">
                <ButtonLink to="/login" variant="secondary" fullWidth>
                  Giriş Yap
                </ButtonLink>
                <ButtonLink to="/register" variant="primary" fullWidth>
                  Üye Ol
                </ButtonLink>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
