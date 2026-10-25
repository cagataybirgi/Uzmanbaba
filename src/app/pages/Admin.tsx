import { useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useAdminSummary } from "../data/admin";
import { Kicker, Shell, Stat } from "../components/ds";
import { cn } from "../components/ui/utils";
import { NotFound } from "./NotFound";
import { PaymentsTab } from "./admin/PaymentsTab";
import { BookingsTab } from "./admin/BookingsTab";
import { UsersTab } from "./admin/UsersTab";

/* ═══════════════════════════════════════════════════════════════════════════
 * Yönetim — the staff panel.
 *
 * Same shell as the dashboard: ruled tab column beside the active panel,
 * tab in the URL. Non-admins get the 404 page rather than a "forbidden"
 * one, so the panel's existence isn't advertised. The real guard is the
 * API (requireAdmin); this only decides what to render.
 * ═════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "payments", label: "Ödemeler" },
  { id: "bookings", label: "Rezervasyonlar" },
  { id: "users", label: "Kullanıcılar" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function Admin() {
  const { user } = useAuth();
  if (!user?.isAdmin) return <NotFound />;
  return <AdminPanel />;
}

function AdminPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const summary = useAdminSummary();

  const raw = searchParams.get("tab");
  const activeTab: Tab = TABS.some((t) => t.id === raw) ? (raw as Tab) : "payments";

  const setTab = (tab: Tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "payments") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next);
  };

  const s = summary.data;
  const attention = s ? s.attention.refund_unknown + s.attention.refund_failed : 0;

  return (
    <Shell className="py-10 md:py-14">
      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <section aria-label="Özet" className="mb-12 border-b-2 border-rule pb-10">
        <Kicker className="mb-7">Yönetim</Kicker>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <Stat value={s ? attention : "—"} label="Müdahale gereken ödeme" />
          <Stat value={s ? s.bookings.pending + s.bookings.confirmed : "—"} label="Açık rezervasyon" />
          <Stat value={s ? s.users.total : "—"} label="Kullanıcı" />
          <Stat value={s ? s.users.professionals : "—"} label="Uzman" />
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] md:gap-x-[clamp(24px,4vw,64px)]">
        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <aside className="border-b-2 border-rule pb-2 md:border-r-2 md:border-b-0 md:pr-6 md:pb-0">
          <nav
            aria-label="Yönetim bölümleri"
            className="-mx-6 flex gap-6 overflow-x-auto px-6 md:mx-0 md:flex-col md:items-start md:gap-3.5 md:overflow-visible md:px-0"
          >
            {TABS.map(({ id, label }) => {
              const active = activeTab === id;
              const badge = id === "payments" ? attention : 0;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-b-2 text-left font-display text-[15px] whitespace-nowrap transition-colors md:min-h-0 md:border-b-0 md:py-1",
                    active
                      ? "border-brand font-extrabold text-brand-800"
                      : "border-transparent font-normal text-ink hover:text-brand-800",
                  )}
                >
                  {label}
                  {badge > 0 && (
                    <span className="tnum bg-danger-tint px-1.5 py-0.5 text-[11px] font-semibold text-danger">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Panel ────────────────────────────────────────────────────── */}
        <div className="min-w-0">
          {activeTab === "payments" && <PaymentsTab onChanged={summary.refetch} />}
          {activeTab === "bookings" && <BookingsTab />}
          {activeTab === "users" && <UsersTab />}
        </div>
      </div>
    </Shell>
  );
}
