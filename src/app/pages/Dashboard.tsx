import { useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  LayoutDashboard, CalendarCheck, User, Settings, LogOut,
  Star, CheckCircle, Clock, XCircle, ChevronRight, Bell,
  MapPin, Phone, Mail, Edit3, Camera, Shield, Wrench,
  TrendingUp, Menu, AlertCircle, X, Inbox, PlayCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  useMyBookings,
  useProfessionalBookings,
  type Booking,
  type BookingStatus,
} from "../data/bookings";
import { ReviewModal } from "../components/ReviewModal";
import { ApiError } from "../lib/api";
import { toast } from "../lib/toast";

type Tab = "overview" | "bookings" | "incoming" | "profile" | "settings";

const TR_MONTHS_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

/** ISO → "14 May 2026" / "10:00" pair, in the user's local time. */
function formatScheduledAt(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  const date = `${d.getDate()} ${TR_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return { date, time: `${hh}:${mm}` };
}

function formatPrice(cents: number | null): string {
  if (cents === null) return "—";
  return `₺${(cents / 100).toLocaleString("tr-TR")}`;
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  confirmed: { label: "Onaylandı", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  completed: { label: "Tamamlandı", color: "bg-green-100 text-green-700", icon: CheckCircle },
  pending:   { label: "Beklemede", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  cancelled: { label: "İptal",     color: "bg-red-100 text-red-600", icon: XCircle },
};

interface NavItem {
  id: Tab;
  label: string;
  icon: typeof LayoutDashboard;
  proOnly?: boolean;
}
const NAV_ITEMS: NavItem[] = [
  { id: "overview",  label: "Özet",             icon: LayoutDashboard },
  { id: "bookings",  label: "Rezervasyonlarım", icon: CalendarCheck },
  { id: "incoming",  label: "Gelen Talepler",   icon: Inbox, proOnly: true },
  { id: "profile",   label: "Profil",           icon: User },
  { id: "settings",  label: "Ayarlar",          icon: Settings },
];

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-gray-500 text-xs mb-0.5">{label}</p>
        <p className="text-gray-900 text-2xl font-extrabold">{value}</p>
        <p className="text-gray-400 text-xs mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [bookingFilter, setBookingFilter] = useState<BookingStatus | "all">("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);

  // Professional-side actions share a "currently-mutating" id so the row
  // buttons disable themselves while a PATCH is in flight. Errors surface
  // via toast, not an inline banner — the row context is already obvious.
  const [incomingFilter, setIncomingFilter] = useState<BookingStatus | "all">("all");
  const [incomingMutatingId, setIncomingMutatingId] = useState<string | null>(null);

  // Avatar upload — hidden <input type="file"> triggered by the Camera icon.
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Notifications: toggle reads from user.notifications and writes through
  // updateProfile. Pessimistic — the switch waits for the PATCH to land
  // (disabled in the meantime) so it never shows a state the backend
  // doesn't actually have.
  const [notifsBusy, setNotifsBusy] = useState<null | "email" | "sms" | "push">(null);

  // Change-password panel state. Errors stay inline (they point at the
  // form); success becomes a toast since the form is then closed.
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Delete-account modal
  const [delOpen, setDelOpen] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delSubmitting, setDelSubmitting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const navigate = useNavigate();
  const {
    user,
    logout,
    updateProfile,
    uploadAvatar,
    changePassword,
    deleteAccount,
  } = useAuth();
  const bookings = useMyBookings();
  const allBookings: Booking[] = bookings.data?.items ?? [];

  const isPro = user?.accountType === "professional";
  // Incoming-bookings hook fires for everyone but the tab only renders for
  // professionals. The fetch itself is cheap (one query, scoped by userId)
  // and re-renders settle quickly.
  const incoming = useProfessionalBookings();
  const incomingAll: Booking[] = incoming.data?.items ?? [];
  const filteredIncoming = useMemo(
    () => incomingFilter === "all"
      ? incomingAll
      : incomingAll.filter((b) => b.status === incomingFilter),
    [incomingAll, incomingFilter],
  );
  const incomingStats = useMemo(() => ({
    total:     incomingAll.length,
    completed: incomingAll.filter((b) => b.status === "completed").length,
    pending:   incomingAll.filter((b) => b.status === "pending" || b.status === "confirmed").length,
    cancelled: incomingAll.filter((b) => b.status === "cancelled").length,
  }), [incomingAll]);

  const visibleNavItems = NAV_ITEMS.filter((n) => !n.proOnly || isPro);

  // Profile edit fields
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editLocation, setEditLocation] = useState(user?.location || "");
  const [editBio, setEditBio] = useState(user?.bio || "");

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Bu sayfayı görmek için giriş yapmalısın.</p>
          <Link to="/login" className="bg-orange-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  const handleLogout = () => { logout(); navigate("/"); };

  const filteredBookings = bookingFilter === "all"
    ? allBookings
    : allBookings.filter((b) => b.status === bookingFilter);

  const stats = {
    total:     allBookings.length,
    completed: allBookings.filter((b) => b.status === "completed").length,
    pending:   allBookings.filter((b) => b.status === "pending" || b.status === "confirmed").length,
    cancelled: allBookings.filter((b) => b.status === "cancelled").length,
  };

  const handleSaveProfile = async () => {
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      await updateProfile({
        name: editName,
        phone: editPhone,
        location: editLocation,
        bio: editBio,
      });
      setEditProfile(false);
      toast.success("Profil güncellendi.");
    } catch (err: unknown) {
      // Stays inline — the user is still in the form and the error points
      // at it (e.g. "Telefon zorunlu"). A toast would scroll away too fast.
      const message =
        err instanceof ApiError ? err.message : "Profil kaydedilemedi.";
      setProfileError(message);
    } finally {
      setProfileSaving(false);
    }
  };

  const resetPwdForm = () => {
    setPwdCurrent("");
    setPwdNew("");
    setPwdConfirm("");
    setPwdError(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdSubmitting) return;
    setPwdError(null);
    if (pwdNew.length < 8) {
      setPwdError("Yeni şifre en az 8 karakter olmalı.");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError("Yeni şifreler eşleşmiyor.");
      return;
    }
    setPwdSubmitting(true);
    try {
      await changePassword({ currentPassword: pwdCurrent, newPassword: pwdNew });
      resetPwdForm();
      setPwdOpen(false);
      toast.success("Şifren güncellendi.");
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "Şifre güncellenemedi.";
      setPwdError(message);
    } finally {
      setPwdSubmitting(false);
    }
  };

  const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // keep in sync with backend
  const ALLOWED_AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so re-selecting the same file still triggers `change`.
    e.target.value = "";
    if (!file || avatarUploading) return;

    // Client-side gate: matches the server's checks but saves a round-trip
    // when the user picks something obviously wrong.
    if (!ALLOWED_AVATAR_MIME.has(file.type)) {
      toast.error("Yalnızca JPEG, PNG veya WebP yükleyebilirsiniz.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Dosya çok büyük (en fazla 2 MB).");
      return;
    }

    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
      toast.success("Avatar güncellendi.");
    } catch (err) {
      toast.apiError(err, "Avatar yüklenemedi.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleToggleNotification = async (key: "email" | "sms" | "push") => {
    if (!user || notifsBusy) return;
    const next = { ...user.notifications, [key]: !user.notifications[key] };
    setNotifsBusy(key);
    try {
      await updateProfile({ notifications: next });
    } catch (err) {
      toast.apiError(err, "Tercih kaydedilemedi.");
    } finally {
      setNotifsBusy(null);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delSubmitting || !delPassword) return;
    setDelSubmitting(true);
    setDelError(null);
    try {
      await deleteAccount(delPassword);
      // deleteAccount clears local auth; bounce to the home page.
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "Hesap silinemedi.";
      setDelError(message);
    } finally {
      setDelSubmitting(false);
    }
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
   * error on failure. The action enum keeps the call sites tiny.
   */
  const runIncomingAction = async (
    id: string,
    action: "confirm" | "complete" | "cancel",
  ) => {
    if (incomingMutatingId) return;
    setIncomingMutatingId(id);
    try {
      if (action === "confirm")       await confirmBooking(id);
      else if (action === "complete") await completeBooking(id);
      else                            await cancelBooking(id);
      incoming.refetch();
      const okMsg =
        action === "confirm"  ? "Rezervasyon onaylandı."
        : action === "complete" ? "Rezervasyon tamamlandı."
        :                         "Rezervasyon iptal edildi.";
      toast.success(okMsg);
    } catch (err) {
      toast.apiError(err, "İşlem tamamlanamadı.");
    } finally {
      setIncomingMutatingId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 lg:transform-none
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `} style={{ top: 64 }}>
        {/* Profile Card */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-400 flex-shrink-0">
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover object-top" />
              </div>
              {user.emailVerified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-green-500 rounded-full flex items-center justify-center border border-white">
                  <CheckCircle size={9} className="text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
              <p className="text-gray-400 text-xs truncate">{user.email}</p>
              <span className="inline-block bg-orange-100 text-orange-600 text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5">
                {user.accountType === "customer" ? "Hizmet Alan" : "Uzman"}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {visibleNavItems.map(({ id, label, icon: Icon }) => {
            const badge =
              id === "bookings" ? stats.pending
                : id === "incoming" ? incomingStats.pending
                : 0;
            return (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${
                  activeTab === id
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={17} />
                {label}
                {badge > 0 && (
                  <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? "bg-white/25 text-white" : "bg-orange-100 text-orange-600"}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full">
            <LogOut size={17} /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-16 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-gray-900 font-extrabold text-lg">
                {visibleNavItems.find((n) => n.id === activeTab)?.label}
              </h1>
              <p className="text-gray-400 text-xs hidden sm:block">
                Hoş geldin, {user.name.split(" ")[0]}! 👋
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-orange-500 hover:border-orange-300 transition-colors">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
            </button>
            <Link to="/search"
              className="hidden sm:flex bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors items-center gap-1">
              <Wrench size={13} /> Uzman Bul
            </Link>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-w-5xl mx-auto">

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<CalendarCheck size={22} className="text-orange-500" />} label="Toplam" value={String(stats.total)} sub="rezervasyon" color="bg-orange-50" />
                <StatCard icon={<CheckCircle size={22} className="text-green-500" />} label="Tamamlanan" value={String(stats.completed)} sub="başarılı" color="bg-green-50" />
                <StatCard icon={<Clock size={22} className="text-blue-500" />} label="Aktif" value={String(stats.pending)} sub="devam ediyor" color="bg-blue-50" />
                <StatCard icon={<Star size={22} className="text-yellow-500" />} label="Puan" value={user.rating ? String(user.rating) : "—"} sub="ortalama" color="bg-yellow-50" />
              </div>

              {/* Upcoming */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Yaklaşan Rezervasyonlar</h2>
                  <button onClick={() => setActiveTab("bookings")} className="text-orange-500 hover:text-orange-600 text-xs font-medium flex items-center gap-1">
                    Tümünü Gör <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {bookings.loading && !bookings.data && (
                    <p className="text-gray-400 text-sm text-center py-4">Yükleniyor…</p>
                  )}
                  {bookings.error && (
                    <p className="text-red-500 text-sm text-center py-4 flex items-center justify-center gap-2">
                      <AlertCircle size={14} /> {bookings.error}
                    </p>
                  )}
                  {!bookings.loading && !bookings.error && allBookings
                    .filter((b) => b.status === "confirmed" || b.status === "pending")
                    .map((b) => {
                      const when = formatScheduledAt(b.scheduledAt);
                      return (
                        <div key={b.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-orange-50 transition-colors">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                            <img src={b.professional.avatar} alt={b.professional.name} className="w-full h-full object-cover object-top" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{b.professional.name}</p>
                            <p className="text-gray-500 text-xs">{b.service}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-semibold text-gray-700">{when.date}</p>
                            <p className="text-xs text-gray-400">{when.time}</p>
                          </div>
                          <StatusBadge status={b.status} />
                        </div>
                      );
                    })}
                  {!bookings.loading && !bookings.error && allBookings.filter((b) => b.status === "confirmed" || b.status === "pending").length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">Yaklaşan rezervasyon yok.</p>
                  )}
                </div>
              </div>

              {/* Activity Chart (simplified) */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-gray-900">Bu Ay Aktivite</h2>
                  <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                    <TrendingUp size={14} /> +12%
                  </div>
                </div>
                <div className="flex items-end gap-2 h-24">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 100].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-md transition-all ${i === 11 ? "bg-orange-500" : "bg-orange-200"}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>Oca</span><span>Şub</span><span>Mar</span><span>Nis</span>
                  <span>May</span><span>Haz</span><span>Tem</span><span>Ağu</span>
                  <span>Eyl</span><span>Eki</span><span>Kas</span><span>Ara</span>
                </div>
              </div>
            </div>
          )}

          {/* ── BOOKINGS TAB ── */}
          {activeTab === "bookings" && (
            <div className="flex flex-col gap-5">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {(["all", "confirmed", "pending", "completed", "cancelled"] as const).map((f) => (
                  <button key={f} onClick={() => setBookingFilter(f)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      bookingFilter === f ? "bg-orange-500 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300"
                    }`}>
                    {f === "all" ? "Tümü" : STATUS_CONFIG[f].label}
                    <span className="ml-1.5 text-xs opacity-70">
                      ({f === "all" ? allBookings.length : allBookings.filter((b) => b.status === f).length})
                    </span>
                  </button>
                ))}
              </div>

              {/* Booking Cards */}
              <div className="flex flex-col gap-3">
                {bookings.loading && !bookings.data && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <p className="text-gray-400 text-sm">Yükleniyor…</p>
                  </div>
                )}
                {bookings.error && (
                  <div className="bg-white rounded-2xl border border-red-100 p-10 flex flex-col items-center text-center gap-3">
                    <AlertCircle size={22} className="text-red-500" />
                    <p className="text-gray-800 font-semibold">{bookings.error}</p>
                    <button
                      onClick={bookings.refetch}
                      className="text-orange-500 hover:text-orange-600 text-sm font-semibold"
                    >
                      Tekrar dene
                    </button>
                  </div>
                )}
                {!bookings.loading && !bookings.error && filteredBookings.map((b) => {
                  const when = formatScheduledAt(b.scheduledAt);
                  const canCancel = b.status === "confirmed" || b.status === "pending";
                  return (
                    <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow animate-fade-in-up">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <img src={b.professional.avatar} alt={b.professional.name} className="w-full h-full object-cover object-top" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-bold text-gray-900">{b.professional.name}</p>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="text-gray-500 text-sm">{b.service}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{when.date} · {when.time}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <p className="font-extrabold text-gray-900">{formatPrice(b.priceCents)}</p>
                        {b.status === "completed" && b.review && (
                          <span
                            className="flex items-center gap-1 text-xs text-green-600 font-semibold border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg"
                            title={`${b.review.rating}/5`}
                          >
                            <CheckCircle size={12} /> Değerlendirildi
                          </span>
                        )}
                        {b.status === "completed" && !b.review && (
                          <button
                            onClick={() => setReviewingBooking(b)}
                            className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-semibold border border-orange-300 hover:border-orange-500 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Star size={12} /> Değerlendir
                          </button>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={cancellingId === b.id}
                            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {cancellingId === b.id ? "İptal ediliyor…" : "İptal Et"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!bookings.loading && !bookings.error && filteredBookings.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <p className="text-gray-400 text-sm">Bu kategoride rezervasyon bulunamadı.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── INCOMING (pro) TAB ── */}
          {activeTab === "incoming" && isPro && (
            <div className="flex flex-col gap-5">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setIncomingFilter(f)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      incomingFilter === f
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300"
                    }`}
                  >
                    {f === "all" ? "Tümü" : STATUS_CONFIG[f].label}
                    <span className="ml-1.5 text-xs opacity-70">
                      ({f === "all" ? incomingAll.length : incomingAll.filter((b) => b.status === f).length})
                    </span>
                  </button>
                ))}
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3">
                {incoming.loading && !incoming.data && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <p className="text-gray-400 text-sm">Yükleniyor…</p>
                  </div>
                )}
                {incoming.error && (
                  <div className="bg-white rounded-2xl border border-red-100 p-10 flex flex-col items-center text-center gap-3">
                    <AlertCircle size={22} className="text-red-500" />
                    <p className="text-gray-800 font-semibold">{incoming.error}</p>
                    <button
                      onClick={incoming.refetch}
                      className="text-orange-500 hover:text-orange-600 text-sm font-semibold"
                    >
                      Tekrar dene
                    </button>
                  </div>
                )}
                {!incoming.loading && !incoming.error && filteredIncoming.map((b) => {
                  const when = formatScheduledAt(b.scheduledAt);
                  const busy = incomingMutatingId === b.id;
                  return (
                    <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow animate-fade-in-up">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <img src={b.customer.avatar} alt={b.customer.name} className="w-full h-full object-cover object-top" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-bold text-gray-900">{b.customer.name}</p>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="text-gray-500 text-sm">{b.service}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{when.date} · {when.time}</p>
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                          <span className="text-gray-400">Adres:</span> {b.address}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        <p className="font-extrabold text-gray-900">{formatPrice(b.priceCents)}</p>
                        {b.status === "pending" && (
                          <button
                            onClick={() => runIncomingAction(b.id, "confirm")}
                            disabled={busy}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle size={12} /> Onayla
                          </button>
                        )}
                        {(b.status === "pending" || b.status === "confirmed") && (
                          <button
                            onClick={() => runIncomingAction(b.id, "complete")}
                            disabled={busy}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-semibold border border-green-200 hover:border-green-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <PlayCircle size={12} /> Tamamla
                          </button>
                        )}
                        {(b.status === "pending" || b.status === "confirmed") && (
                          <button
                            onClick={() => runIncomingAction(b.id, "cancel")}
                            disabled={busy}
                            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            İptal
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!incoming.loading && !incoming.error && filteredIncoming.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <p className="text-gray-400 text-sm">Bu kategoride talep bulunamadı.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="flex flex-col gap-5">
              {/* Avatar Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-orange-200">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover object-top" />
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    aria-label="Avatar değiştir"
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl flex items-center justify-center shadow-md transition-colors"
                  >
                    {avatarUploading ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <Camera size={14} />
                    )}
                  </button>
                </div>
                <div className="text-center sm:text-left flex-1">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h2 className="font-extrabold text-gray-900 text-xl">{user.name}</h2>
                    {user.emailVerified && (
                      <div className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        <Shield size={11} /> Doğrulandı
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-1">{user.accountType === "customer" ? "Hizmet Alan" : "Uzman"}</p>
                  <p className="text-gray-400 text-xs mt-0.5">Üyelik: {user.joinDate}</p>
                </div>
                <button onClick={() => setEditProfile(!editProfile)}
                  className="flex items-center gap-2 border border-gray-300 hover:border-orange-400 text-gray-700 hover:text-orange-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all self-start sm:self-auto">
                  <Edit3 size={15} /> {editProfile ? "Vazgeç" : "Düzenle"}
                </button>
              </div>

              {/* Info / Edit Form */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-5">Kişisel Bilgiler</h3>
                {editProfile ? (
                  <div className="flex flex-col gap-4">
                    {[
                      { label: "Ad Soyad", value: editName, setter: setEditName, icon: User, type: "text" },
                      { label: "Telefon", value: editPhone, setter: setEditPhone, icon: Phone, type: "tel" },
                      { label: "Konum", value: editLocation, setter: setEditLocation, icon: MapPin, type: "text" },
                    ].map(({ label, value, setter, icon: Icon, type }) => (
                      <div key={label} className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700">{label}</label>
                        <div className="relative">
                          <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type={type} value={value} onChange={(e) => setter(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all" />
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-700">Hakkımda</label>
                      <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3}
                        placeholder="Kendinizi tanıtın..."
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 resize-none transition-all" />
                    </div>
                    {profileError && (
                      <p className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <AlertCircle size={14} /> {profileError}
                      </p>
                    )}
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => { setEditProfile(false); setProfileError(null); }}
                        disabled={profileSaving}
                        className="flex-none border border-gray-300 hover:border-gray-400 disabled:opacity-50 text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                        Vazgeç
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={profileSaving}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-all">
                        {profileSaving ? "Kaydediliyor…" : "Kaydet"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Ad Soyad", value: user.name, icon: User },
                      { label: "E-posta", value: user.email, icon: Mail },
                      { label: "Telefon", value: user.phone || "—", icon: Phone },
                      { label: "Konum", value: user.location || "—", icon: MapPin },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Icon size={15} className="text-orange-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
                        </div>
                      </div>
                    ))}
                    {(user.bio || user.specialty) && (
                      <div className="sm:col-span-2 flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Edit3 size={15} className="text-orange-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Hakkımda</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{user.bio || user.specialty || "Henüz eklenmedi."}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-5">
              {/* Notifications */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Bell size={18} className="text-orange-500" /> Bildirim Ayarları
                </h3>
                <div className="flex flex-col gap-4">
                  {[
                    { key: "email" as const, label: "E-posta Bildirimleri", desc: "Rezervasyon güncellemeleri e-posta ile gelsin." },
                    { key: "sms" as const, label: "SMS Bildirimleri", desc: "Önemli güncellemeler SMS ile gelsin." },
                    { key: "push" as const, label: "Push Bildirimleri", desc: "Tarayıcı bildirimleri açık olsun." },
                  ].map(({ key, label, desc }) => {
                    const on = user.notifications[key];
                    const busy = notifsBusy === key;
                    return (
                      <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{label}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                        </div>
                        <button
                          onClick={() => handleToggleNotification(key)}
                          disabled={busy}
                          aria-pressed={on}
                          aria-label={`${label} ${on ? "açık" : "kapalı"}`}
                          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${on ? "bg-orange-500" : "bg-gray-300"}`}
                        >
                          <div
                            className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all"
                            style={{ left: on ? "22px" : "2px" }}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Security */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Shield size={18} className="text-orange-500" /> Güvenlik
                </h3>


                <div className="flex flex-col gap-3">
                  {/* Change password — collapsible */}
                  <div className="rounded-xl bg-gray-50">
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">Şifre Değiştir</p>
                        <p className="text-gray-400 text-xs mt-0.5">Düzenli olarak güncellemen önerilir.</p>
                      </div>
                      <button
                        onClick={() => { setPwdOpen((v) => !v); resetPwdForm(); }}
                        className="text-orange-500 hover:text-orange-600 text-xs font-semibold border border-orange-300 hover:border-orange-500 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {pwdOpen ? "Vazgeç" : "Değiştir"}
                      </button>
                    </div>

                    {pwdOpen && (
                      <form
                        onSubmit={handleChangePassword}
                        className="px-4 pb-4 flex flex-col gap-3 border-t border-gray-200 pt-4"
                      >
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-gray-600">Mevcut Şifre</label>
                          <input
                            type="password"
                            value={pwdCurrent}
                            onChange={(e) => setPwdCurrent(e.target.value)}
                            autoComplete="current-password"
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-gray-600">Yeni Şifre</label>
                            <input
                              type="password"
                              value={pwdNew}
                              onChange={(e) => setPwdNew(e.target.value)}
                              autoComplete="new-password"
                              required
                              minLength={8}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-gray-600">Yeni Şifre (Tekrar)</label>
                            <input
                              type="password"
                              value={pwdConfirm}
                              onChange={(e) => setPwdConfirm(e.target.value)}
                              autoComplete="new-password"
                              required
                              minLength={8}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                          </div>
                        </div>
                        {pwdError && (
                          <p className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            <AlertCircle size={12} /> {pwdError}
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={pwdSubmitting || !pwdCurrent || !pwdNew || !pwdConfirm}
                          className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                        >
                          {pwdSubmitting ? "Güncelleniyor…" : "Şifreyi Güncelle"}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Placeholder rows — UI present, not wired yet */}
                  {[
                    { label: "İki Faktörlü Doğrulama", desc: "Ek güvenlik katmanı ekle", action: "Yakında" },
                    { label: "Aktif Oturumlar", desc: "1 aktif oturum", action: "Yakında" },
                  ].map(({ label, desc, action }) => (
                    <div key={label} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{label}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                      </div>
                      <span className="text-gray-400 text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg">
                        {action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
                <h3 className="font-bold text-red-500 mb-4">Tehlikeli Alan</h3>
                <div className="flex items-center justify-between p-4 rounded-xl bg-red-50">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Hesabı Sil</p>
                    <p className="text-gray-400 text-xs mt-0.5">Bu işlem geri alınamaz.</p>
                  </div>
                  <button
                    onClick={() => { setDelOpen(true); setDelPassword(""); setDelError(null); }}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold border border-red-300 hover:border-red-500 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Hesabı Sil
                  </button>
                </div>
              </div>
            </div>
          )}

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

      {/* ── Delete-account confirmation modal ───────────────────────────── */}
      {delOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-title"
          onClick={(e) => { if (e.target === e.currentTarget && !delSubmitting) setDelOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 id="del-title" className="font-bold text-gray-900 text-lg">
                Hesabı Sil
              </h2>
              <button
                onClick={() => setDelOpen(false)}
                disabled={delSubmitting}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDeleteAccount} className="px-6 py-5 flex flex-col gap-4">
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 text-sm">
                  <span className="font-semibold">Bu işlem geri alınamaz.</span>{" "}
                  Hesabınla birlikte tüm rezervasyonların, değerlendirmelerin ve
                  profil bilgilerin kalıcı olarak silinir.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Devam etmek için şifreni gir
                </label>
                <input
                  type="password"
                  value={delPassword}
                  onChange={(e) => setDelPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              {delError && (
                <p className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle size={14} /> {delError}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDelOpen(false)}
                  disabled={delSubmitting}
                  className="flex-1 border border-gray-300 hover:border-gray-400 disabled:opacity-50 text-gray-700 font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={delSubmitting || !delPassword}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {delSubmitting ? "Siliniyor…" : "Hesabımı Kalıcı Olarak Sil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
