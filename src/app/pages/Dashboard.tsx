import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  useMyBookings,
  useProfessionalBookings,
  type Booking,
} from "../data/bookings";
import { ReviewModal } from "../components/ReviewModal";
import { Button, ButtonLink, Kicker, Shell } from "../components/ds";
import { toast } from "../lib/toast";
import { cn } from "../components/ui/utils";
import { OverviewTab } from "./dashboard/OverviewTab";
import { BookingsTab } from "./dashboard/BookingsTab";
import { IncomingTab, type IncomingAction } from "./dashboard/IncomingTab";
import { ProfileTab } from "./dashboard/ProfileTab";
import { SettingsTab } from "./dashboard/SettingsTab";

/* ═══════════════════════════════════════════════════════════════════════════
 * Dashboard — the account shell.
 *
 * A ruled sidebar of tabs beside the active panel. The tab lives in the URL
 * (`?tab=…`) so a panel can be linked to, bookmarked and returned to with
 * the back button; anything unrecognised falls back to the overview.
 *
 * Below `md` the sidebar becomes a scrollable row of tabs above the panel.
 * ═════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "overview", label: "Özet" },
  { id: "bookings", label: "Rezervasyonlarım" },
  { id: "incoming", label: "Gelen Talepler", proOnly: true },
  { id: "profile", label: "Profil" },
  { id: "settings", label: "Ayarlar" },
] as const;

type Tab = (typeof TABS)[number]["id"];

const TAB_IDS = TABS.map((t) => t.id) as readonly string[];

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    user,
    logout,
    updateProfile,
    uploadAvatar,
    changePassword,
    deleteAccount,
  } = useAuth();

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [incomingMutatingId, setIncomingMutatingId] = useState<string | null>(
    null,
  );
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);

  const bookings = useMyBookings();
  // The incoming hook fires for everyone but the tab only renders for
  // professionals. The fetch is cheap (one query, scoped by userId).
  const incoming = useProfessionalBookings();

  const isPro = user?.accountType === "professional";
  const visibleTabs = TABS.filter((t) => !("proOnly" in t && t.proOnly) || isPro);

  const rawTab = searchParams.get("tab") ?? "overview";
  const requestedTab = (TAB_IDS.includes(rawTab) ? rawTab : "overview") as Tab;
  // A customer landing on ?tab=incoming (an old link, a shared URL) gets the
  // overview rather than an empty panel they have no data for.
  const activeTab: Tab = visibleTabs.some((t) => t.id === requestedTab)
    ? requestedTab
    : "overview";

  const setTab = (tab: Tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next);
  };

  // ProtectedRoute already guarantees a session, so this only fires in the
  // instant between a sign-out and the redirect landing.
  if (!user) {
    return (
      <Shell className="py-20">
        <Kicker className="mb-3.5">Panel</Kicker>
        <h1 className="t-title">Giriş yapman gerekiyor.</h1>
        <p className="t-lead mt-3.5">
          Bu sayfayı görmek için hesabınla giriş yap.
        </p>
        <div className="mt-10">
          <ButtonLink to="/login" variant="primary" size="lg">
            Giriş Yap
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  const allBookings: Booking[] = bookings.data?.items ?? [];
  const incomingAll: Booking[] = incoming.data?.items ?? [];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleCancelBooking = async (id: string) => {
    if (cancellingId) return;
    setCancellingId(id);
    try {
      await cancelBooking(id);
      bookings.refetch();
      toast.success("Rezervasyon iptal edildi.");
    } catch (err) {
      toast.apiError(err, "İptal edilemedi.");
    } finally {
      setCancellingId(null);
    }
  };

  /**
   * Shared driver for the professional-side row actions. Disables the row
   * while the PATCH is in flight, refetches on success, surfaces a friendly
   * error on failure.
   */
  const runIncomingAction = async (id: string, action: IncomingAction) => {
    if (incomingMutatingId) return;
    setIncomingMutatingId(id);
    try {
      if (action === "confirm") await confirmBooking(id);
      else if (action === "complete") await completeBooking(id);
      else await cancelBooking(id);
      incoming.refetch();
      toast.success(
        action === "confirm"
          ? "Rezervasyon onaylandı."
          : action === "complete"
            ? "Rezervasyon tamamlandı."
            : "Rezervasyon iptal edildi.",
      );
    } catch (err) {
      toast.apiError(err, "İşlem tamamlanamadı.");
    } finally {
      setIncomingMutatingId(null);
    }
  };

  const pendingBadge = (id: Tab): number => {
    if (id === "bookings")
      return allBookings.filter(
        (b) => b.status === "pending" || b.status === "confirmed",
      ).length;
    if (id === "incoming")
      return incomingAll.filter((b) => b.status === "pending").length;
    return 0;
  };

  return (
    <Shell className="py-10 md:py-14">
      <div className="grid gap-8 md:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] md:gap-x-[clamp(24px,4vw,64px)]">
        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <aside className="border-b-2 border-rule pb-2 md:border-r-2 md:border-b-0 md:pr-6 md:pb-0">
          <Kicker className="mb-3 hidden md:mb-7 md:block">Panelim</Kicker>

          <nav
            aria-label="Panel bölümleri"
            className="-mx-6 flex gap-6 overflow-x-auto px-6 md:mx-0 md:flex-col md:items-start md:gap-3.5 md:overflow-visible md:px-0"
          >
            {visibleTabs.map(({ id, label }) => {
              const active = activeTab === id;
              const badge = pendingBadge(id);
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
                    <span className="tnum bg-brand-100 px-1.5 py-0.5 text-[11px] font-semibold text-brand-800">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-7 hidden border-t-2 border-rule pt-7 md:block">
            <Button variant="ghost" className="-ml-4" onClick={handleLogout}>
              Çıkış Yap
            </Button>
          </div>
        </aside>

        {/* ── Panel ────────────────────────────────────────────────────── */}
        <div className="min-w-0">
          {activeTab === "overview" && (
            <OverviewTab
              bookings={allBookings}
              loading={bookings.loading && !bookings.data}
              error={bookings.error}
              onRetry={bookings.refetch}
              rating={user.rating}
            />
          )}

          {activeTab === "bookings" && (
            <BookingsTab
              bookings={allBookings}
              loading={bookings.loading && !bookings.data}
              error={bookings.error}
              onRetry={bookings.refetch}
              onCancel={handleCancelBooking}
              cancellingId={cancellingId}
              onReview={setReviewingBooking}
            />
          )}

          {activeTab === "incoming" && isPro && (
            <IncomingTab
              bookings={incomingAll}
              loading={incoming.loading && !incoming.data}
              error={incoming.error}
              onRetry={incoming.refetch}
              onAction={runIncomingAction}
              mutatingId={incomingMutatingId}
            />
          )}

          {activeTab === "profile" && (
            <ProfileTab
              user={user}
              updateProfile={updateProfile}
              uploadAvatar={uploadAvatar}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              user={user}
              updateProfile={updateProfile}
              changePassword={changePassword}
              deleteAccount={deleteAccount}
              onDeleted={() => navigate("/", { replace: true })}
            />
          )}

          {/* Sign-out lives at the foot of the panel on small screens, where
              the tab row has no room for it. */}
          <div className="mt-14 border-t-2 border-rule pt-7 md:hidden">
            <Button variant="ghost" className="-ml-4" onClick={handleLogout}>
              Çıkış Yap
            </Button>
          </div>
        </div>
      </div>

      <ReviewModal
        booking={reviewingBooking}
        isOpen={Boolean(reviewingBooking)}
        onClose={() => setReviewingBooking(null)}
        onReviewed={() => {
          setReviewingBooking(null);
          bookings.refetch();
        }}
      />
    </Shell>
  );
}
