import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <div className="bg-orange-500 text-white font-extrabold text-lg px-3 py-1 rounded-lg w-fit tracking-tight">
              Uzman<span className="text-orange-200">Baba</span>
            </div>
            <p className="text-gray-500 text-sm mt-1">Baba sorunu çözer.</p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <a href="#" className="hover:text-orange-500 transition-colors">Kategoriler</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Hakkımızda</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Destek</a>
            <a href="#" className="hover:text-orange-500 transition-colors">İletişim</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Şartlar</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Gizlilik</a>
          </div>

          {/* Newsletter + Socials */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-700">Bülten Kaydı</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="E-posta adresiniz"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
                Gönder
              </button>
            </div>
            <div className="flex gap-3 mt-1">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <button
                  key={i}
                  className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors"
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          © 2024 UzmanBaba — Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
