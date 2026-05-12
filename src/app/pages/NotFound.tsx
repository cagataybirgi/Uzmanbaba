import { Link } from "react-router";
import { Home, Search, ArrowLeft } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6 animate-fade-in-up">
        {/* 404 badge */}
        <div className="inline-block bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
          Sayfa Bulunamadı
        </div>

        {/* Big 404 */}
        <h1 className="text-orange-500 text-8xl sm:text-9xl font-extrabold leading-none">
          404
        </h1>

        <div className="flex flex-col gap-2">
          <h2 className="text-gray-900 text-2xl font-extrabold">
            Aradığın sayfa burada değil
          </h2>
          <p className="text-gray-500 text-base max-w-sm">
            Bağlantı kırılmış olabilir veya sayfa kaldırılmış olabilir.
            Endişelenme — baba sorunu çözer.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all"
          >
            <Home size={16} />
            Ana Sayfaya Dön
          </Link>
          <Link
            to="/search"
            className="flex items-center justify-center gap-2 border border-gray-300 hover:border-orange-400 hover:text-orange-500 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm transition-all"
          >
            <Search size={16} />
            Uzman Ara
          </Link>
        </div>

        {/* Back link */}
        <button
          onClick={() => window.history.back()}
          className="text-gray-400 hover:text-orange-500 text-sm font-medium flex items-center gap-1 mt-2 transition-colors"
        >
          <ArrowLeft size={14} />
          Önceki sayfaya dön
        </button>
      </div>
    </div>
  );
}
