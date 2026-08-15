import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Toaster } from "./components/ui/sonner";

/**
 * Sends the window back to the top and moves keyboard/screen-reader focus to
 * the main landmark on client-side route changes. Hash navigation keeps its
 * native in-page behavior, and the initial page load does not steal focus.
 */
function RouteFocusManager() {
  const { pathname, hash } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const pathnameChanged = previousPathname.current !== pathname;
    previousPathname.current = pathname;

    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    if (!pathnameChanged) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("main")?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}

export function Root() {
  return (
    <AuthProvider>
      <div className="flex min-h-dvh flex-col bg-paper text-ink">
        <RouteFocusManager />
        <Navbar />
        {/* `main` is the skip link's target and the landmark screen readers
            jump to; `tabIndex={-1}` lets focus land here programmatically. */}
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          <Outlet />
        </main>
        <Footer />
        {/* Single Toaster instance for the whole app. Anything calling
            toast() / toast.success() from src/app/lib/toast.ts renders here. */}
        <Toaster position="top-right" closeButton />
      </div>
    </AuthProvider>
  );
}
