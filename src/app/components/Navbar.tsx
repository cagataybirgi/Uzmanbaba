import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, X, ChevronDown, LayoutDashboard, User, LogOut, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate("/");
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-orange-500 text-white font-extrabold text-xl px-3 py-1 rounded-lg tracking-tight">
              Uzman<span className="text-orange-200">Baba</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/search"
              className={`text-sm font-medium transition-colors ${isActive("/search") ? "text-orange-500" : "text-gray-600 hover:text-orange-500"}`}>
              Hizmetler
            </Link>
            <a href="/#how-it-works"
              className="text-gray-600 hover:text-orange-500 transition-colors text-sm font-medium">
              Nasıl Çalışır
            </a>

            <div className="w-px h-5 bg-gray-200" />

            {isAuthenticated && user ? (
              /* User dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-xl px-3 py-1.5 transition-all"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-orange-300 flex-shrink-0">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover object-top" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 max-w-[100px] truncate">
                    {user.name.split(" ")[0]}
                  </span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-200 shadow-xl py-2 animate-scale-in z-50">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                      <p className="text-gray-400 text-xs truncate">{user.email}</p>
                    </div>

                    {[
                      { label: "Panelim", icon: LayoutDashboard, path: "/dashboard" },
                      { label: "Profilim", icon: User, path: "/dashboard" },
                      { label: "Ayarlar", icon: Settings, path: "/dashboard" },
                    ].map(({ label, icon: Icon, path }) => (
                      <button key={label}
                        onClick={() => { navigate(path); setDropdownOpen(false); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors w-full text-left">
                        <Icon size={15} className="text-gray-400" />
                        {label}
                      </button>
                    ))}

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full text-left">
                        <LogOut size={15} />
                        Çıkış Yap
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Guest links */
              <>
                <Link to="/login"
                  className={`text-sm font-medium transition-colors ${isActive("/login") ? "text-orange-500" : "text-gray-600 hover:text-orange-500"}`}>
                  Giriş Yap
                </Link>
                <Link to="/register"
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${isActive("/register") ? "bg-orange-600 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}`}>
                  Üye Ol
                </Link>
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button className="md:hidden text-gray-600" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menü">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-5 pt-3 flex flex-col gap-1 border-t border-gray-100 animate-slide-down">
            <Link to="/search" className="text-gray-700 hover:text-orange-500 text-sm font-medium py-2 px-2 rounded-lg hover:bg-orange-50 transition-colors"
              onClick={() => setMenuOpen(false)}>
              Hizmetler
            </Link>
            <a href="/#how-it-works" className="text-gray-700 hover:text-orange-500 text-sm font-medium py-2 px-2 rounded-lg hover:bg-orange-50 transition-colors"
              onClick={() => setMenuOpen(false)}>
              Nasıl Çalışır
            </a>

            <div className="h-px bg-gray-100 my-1" />

            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-orange-300">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <Link to="/dashboard" className="text-gray-700 hover:text-orange-500 text-sm font-medium py-2 px-2 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2"
                  onClick={() => setMenuOpen(false)}>
                  <LayoutDashboard size={15} /> Panelim
                </Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="text-red-500 text-sm font-medium py-2 px-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 text-left w-full">
                  <LogOut size={15} /> Çıkış Yap
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-orange-500 text-sm font-medium py-2 px-2 rounded-lg hover:bg-orange-50 transition-colors"
                  onClick={() => setMenuOpen(false)}>
                  Giriş Yap
                </Link>
                <Link to="/register" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg w-full text-center transition-colors mt-1"
                  onClick={() => setMenuOpen(false)}>
                  Üye Ol
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
