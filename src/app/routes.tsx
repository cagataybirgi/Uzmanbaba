import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { Home } from "./pages/Home";
import { SearchResults } from "./pages/SearchResults";
import { ProfessionalDetail } from "./pages/ProfessionalDetail";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { VerifyEmail } from "./pages/VerifyEmail";
import { Dashboard } from "./pages/Dashboard";
import { NotFound } from "./pages/NotFound";
import { ErrorBoundary } from "./pages/ErrorBoundary";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { About, Support, Contact, Terms, Privacy } from "./pages/InfoPages";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    // Catches any error thrown in Root or its descendants (render errors,
    // loader/action errors, thrown Responses, etc.)
    ErrorBoundary: ErrorBoundary,
    children: [
      { index: true, Component: Home },
      { path: "search", Component: SearchResults },
      { path: "professionals/:id", Component: ProfessionalDetail },
      { path: "login", Component: Login },
      { path: "register", Component: Register },
      { path: "verify-email", Component: VerifyEmail },
      { path: "forgot-password", Component: ForgotPassword },
      { path: "reset-password", Component: ResetPassword },

      // Static / informational pages
      { path: "hakkimizda", Component: About },
      { path: "destek", Component: Support },
      { path: "iletisim", Component: Contact },
      { path: "sartlar", Component: Terms },
      { path: "gizlilik", Component: Privacy },

      // Protected: requires authentication
      {
        path: "dashboard",
        Component: ProtectedRoute,
        children: [{ index: true, Component: Dashboard }],
      },

      // Catch-all 404 — must be last
      { path: "*", Component: NotFound },
    ],
  },
]);
