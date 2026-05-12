import { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  LayoutDashboard, CalendarCheck, User, Settings, LogOut,
  Star, CheckCircle, Clock, XCircle, ChevronRight, Bell,
  MapPin, Phone, Mail, Edit3, Camera, Shield, Wrench,
  TrendingUp, Menu, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

type Tab = "overview" | "bookings" | "profile" | "settings";
type BookingStatus = "confirmed" | "completed" | "pending" | "cancelled";

interface Booking {
  id: number;
  professional: string;
  service: string;
  date: string;
  time: string;
  status: BookingStatus;
  price: string;
  avatar: string;
}

const MOCK_BOOKINGS: Booking[] = [
  { id: 1, professional: "Ahmet Yılmaz", service: "Tesisat Tamiri", date: "14 May 2026", time: "10:00", status: "confirmed", price: "₺450", avatar: "https://images.unsplash.com/photo-1649769069590-268b0b994462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=100" },
  { id: 2, professional: "Elif Kaya", service: "Ev Temizliği", date: "12 May 2026", time: "14:00", status: "completed", price: "₺320", avatar: "https://images.unsplash.com/photo-1574320200624-96b6e093f695?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=100" },
  { id: 3, professional: "Mehmet Demir", service: "Elektrik Tesisatı", date: "8 May 2026", time: "09:00", status: "completed", price: "₺600", avatar: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=100" },
  { id: 4, professional: "Selin Arslan", service: "Boya Badana", date: "3 May 2026", time: "11:00", status: "cancelled", price: "₺750", avatar: "https://images.unsplash.com/photo-1576323200687-e210fe495315?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=100" },
  { id: 5, professional: "Kerem Çelik", service: "Marangoz İşi", date: "18 May 2026", time: "15:00", status: "pending", price: "₺520", avatar: "https://images.unsplash.com/photo-1661447133325-a4a73386b9e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=100" },
  { id: 6, professional: "Ayşe Polat", service: "Klima Bakımı", date: "20 May 2026", time: "13:00", status: "confirmed", price: "₺380", avatar: "https://images.unsplash.com/photo-1685475896056-8f5c6fb7e8a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=100" },
];

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  confirmed: { label: "Onaylandı", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  completed: { label: "Tamamlandı", color: "bg-green-100 text-green-700", icon: CheckCircle },
  pending:   { label: "Beklemede", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  cancelled: { label: "İptal",     color: "bg-red-100 text-red-600", icon: XCircle },
};

const NAV_ITEMS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview",  label: "Özet",           icon: LayoutDashboard },
  { id: "bookings",  label: "Rezervasyonlarım", icon: CalendarCheck },
  { id: "profile",   label: "Profil",          icon: User },
  { id: "settings",  label: "Ayarlar",         icon: Settings },
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
  const [notifications, setNotifications] = useState({ email: true, sms: true, push: false });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();

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
    ? MOCK_BOOKINGS
    : MOCK_BOOKINGS.filter((b) => b.status === bookingFilter);

  const stats = {
    total:     MOCK_BOOKINGS.length,
    completed: MOCK_BOOKINGS.filter((b) => b.status === "completed").length,
    pending:   MOCK_BOOKINGS.filter((b) => b.status === "pending" || b.status === "confirmed").length,
    cancelled: MOCK_BOOKINGS.filter((b) => b.status === "cancelled").length,
  };

  const handleSaveProfile = () => {
    updateProfile({ name: editName, phone: editPhone, location: editLocation, bio: editBio });
    setEditProfile(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
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
              {id === "bookings" && stats.pending > 0 && (
                <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? "bg-white/25 text-white" : "bg-orange-100 text-orange-600"}`}>
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
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
                {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
              </h1>
              <p className="text-gray-400 text-xs hidden sm:block">
                Hoş geldin, {user.name.split(" ")[0]}! 👋
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-green-600 text-xs font-medium flex items-center gap-1 animate-slide-down">
                <CheckCircle size={13} /> Kaydedildi
              </span>
            )}
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
                  {MOCK_BOOKINGS.filter((b) => b.status === "confirmed" || b.status === "pending").map((b) => (
                    <div key={b.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-orange-50 transition-colors">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <img src={b.avatar} alt={b.professional} className="w-full h-full object-cover object-top" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{b.professional}</p>
                        <p className="text-gray-500 text-xs">{b.service}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-700">{b.date}</p>
                        <p className="text-xs text-gray-400">{b.time}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                  {MOCK_BOOKINGS.filter((b) => b.status === "confirmed" || b.status === "pending").length === 0 && (
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
                      ({f === "all" ? MOCK_BOOKINGS.length : MOCK_BOOKINGS.filter((b) => b.status === f).length})
                    </span>
                  </button>
                ))}
              </div>

              {/* Booking Cards */}
              <div className="flex flex-col gap-3">
                {filteredBookings.map((b) => (
                  <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow animate-fade-in-up">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      <img src={b.avatar} alt={b.professional} className="w-full h-full object-cover object-top" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{b.professional}</p>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="text-gray-500 text-sm">{b.service}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{b.date} · {b.time}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="font-extrabold text-gray-900">{b.price}</p>
                      {b.status === "completed" && (
                        <button className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-semibold border border-orange-300 hover:border-orange-500 px-3 py-1.5 rounded-lg transition-colors">
                          <Star size={12} /> Değerlendir
                        </button>
                      )}
                      {(b.status === "confirmed" || b.status === "pending") && (
                        <button className="text-xs text-red-400 hover:text-red-600 font-semibold border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">
                          İptal Et
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredBookings.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <p className="text-gray-400 text-sm">Bu kategoride rezervasyon bulunamadı.</p>
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
                  <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-md transition-colors">
                    <Camera size={14} />
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
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => setEditProfile(false)}
                        className="flex-none border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                        Vazgeç
                      </button>
                      <button onClick={handleSaveProfile}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold py-2.5 rounded-xl text-sm transition-all">
                        Kaydet
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
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{label}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifications((n) => ({ ...n, [key]: !n[key] }))}
                        className={`relative w-11 h-6 rounded-full transition-colors ${notifications[key] ? "bg-orange-500" : "bg-gray-300"}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${notifications[key] ? "left-5.5" : "left-0.5"}`}
                          style={{ left: notifications[key] ? "22px" : "2px" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Shield size={18} className="text-orange-500" /> Güvenlik
                </h3>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Şifre Değiştir", desc: "Son değişiklik: 30 gün önce", action: "Değiştir" },
                    { label: "İki Faktörlü Doğrulama", desc: "Ek güvenlik katmanı ekle", action: "Etkinleştir" },
                    { label: "Aktif Oturumlar", desc: "1 aktif oturum", action: "Görüntüle" },
                  ].map(({ label, desc, action }) => (
                    <div key={label} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{label}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                      </div>
                      <button className="text-orange-500 hover:text-orange-600 text-xs font-semibold border border-orange-300 hover:border-orange-500 px-3 py-1.5 rounded-lg transition-colors">
                        {action}
                      </button>
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
                  <button className="text-red-500 hover:text-red-700 text-xs font-semibold border border-red-300 hover:border-red-500 px-3 py-1.5 rounded-lg transition-colors">
                    Hesabı Sil
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
