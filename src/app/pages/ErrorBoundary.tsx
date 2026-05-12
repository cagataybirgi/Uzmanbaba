import { useRouteError, isRouteErrorResponse, Link, useNavigate } from "react-router";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  // Extract a user-friendly title + message based on error type
  let title = "Bir şeyler ters gitti";
  let message = "Beklenmedik bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin.";
  let statusCode: number | null = null;

  if (isRouteErrorResponse(error)) {
    // Thrown Response (e.g. from a loader/action)
    statusCode = error.status;
    if (error.status === 404) {
      title = "Sayfa Bulunamadı";
      message = "Aradığınız sayfa mevcut değil.";
    } else if (error.status === 401 || error.status === 403) {
      title = "Yetkisiz Erişim";
      message = "Bu sayfayı görüntüleme izniniz yok.";
    } else if (error.status >= 500) {
      title = "Sunucu Hatası";
      message = "Sunucularımızda bir sorun var. Birazdan tekrar deneyin.";
    } else {
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  // Log to console in dev so developers can see the stack
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.error("Route error:", error);
  }

  const handleReload = () => {
    // Try a soft refresh first; fall back to full reload
    navigate(0);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6 animate-fade-in-up">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={40} className="text-red-500" />
        </div>

        {/* Status code (if any) */}
        {statusCode && (
          <div className="inline-block bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Hata {statusCode}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h1 className="text-gray-900 text-2xl sm:text-3xl font-extrabold">
            {title}
          </h1>
          <p className="text-gray-500 text-base max-w-sm">{message}</p>
        </div>

        {/* Dev-only error details */}
        {import.meta.env?.DEV && error instanceof Error && error.stack && (
          <details className="w-full text-left bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-gray-600 hover:text-gray-900">
              Geliştirici Detayları
            </summary>
            <pre className="text-[10px] text-gray-500 mt-2 overflow-x-auto whitespace-pre-wrap break-all">
              {error.stack}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2">
          <button
            onClick={handleReload}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all"
          >
            <RefreshCw size={16} />
            Sayfayı Yenile
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 border border-gray-300 hover:border-orange-400 hover:text-orange-500 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm transition-all"
          >
            <Home size={16} />
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
