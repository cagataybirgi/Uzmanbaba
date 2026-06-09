import { Outlet } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Toaster } from "./components/ui/sonner";

export function Root() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        {/* Single Toaster instance for the whole app. Anything calling
            toast() / toast.success() from src/app/lib/toast.ts renders here. */}
        <Toaster position="top-right" richColors closeButton />
      </div>
    </AuthProvider>
  );
}
