import type { ComponentType } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { Root } from "./Root";
import { ErrorBoundary } from "./pages/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RouteLoading } from "./components/RouteLoading";

/**
 * Adapts a named page export to React Router's lazy-route contract while
 * preserving the module's inferred type. Route modules are fetched only when
 * their URL is first visited; Root and ErrorBoundary stay eager so navigation
 * chrome and import failures always have a stable surface.
 */
function lazyPage<TModule>(
  importModule: () => Promise<TModule>,
  selectComponent: (module: TModule) => ComponentType,
) {
  return async () => ({ Component: selectComponent(await importModule()) });
}

export const routes: RouteObject[] = [
  {
    path: "/",
    Component: Root,
    HydrateFallback: RouteLoading,
    // Catches any error thrown in Root or its descendants (render errors,
    // loader/action errors, thrown Responses, etc.)
    ErrorBoundary: ErrorBoundary,
    children: [
      {
        index: true,
        lazy: lazyPage(() => import("./pages/Home"), (module) => module.Home),
      },
      {
        path: "search",
        lazy: lazyPage(
          () => import("./pages/SearchResults"),
          (module) => module.SearchResults,
        ),
      },
      {
        path: "professionals/:id",
        lazy: lazyPage(
          () => import("./pages/ProfessionalDetail"),
          (module) => module.ProfessionalDetail,
        ),
      },
      {
        path: "login",
        lazy: lazyPage(() => import("./pages/Login"), (module) => module.Login),
      },
      {
        path: "register",
        lazy: lazyPage(
          () => import("./pages/Register"),
          (module) => module.Register,
        ),
      },
      {
        path: "verify-email",
        lazy: lazyPage(
          () => import("./pages/VerifyEmail"),
          (module) => module.VerifyEmail,
        ),
      },
      {
        path: "forgot-password",
        lazy: lazyPage(
          () => import("./pages/ForgotPassword"),
          (module) => module.ForgotPassword,
        ),
      },
      {
        path: "reset-password",
        lazy: lazyPage(
          () => import("./pages/ResetPassword"),
          (module) => module.ResetPassword,
        ),
      },

      // Static / informational pages
      {
        path: "hakkimizda",
        lazy: lazyPage(
          () => import("./pages/InfoPages"),
          (module) => module.About,
        ),
      },
      {
        path: "destek",
        lazy: lazyPage(
          () => import("./pages/InfoPages"),
          (module) => module.Support,
        ),
      },
      {
        path: "iletisim",
        lazy: lazyPage(
          () => import("./pages/InfoPages"),
          (module) => module.Contact,
        ),
      },
      {
        path: "sartlar",
        lazy: lazyPage(
          () => import("./pages/InfoPages"),
          (module) => module.Terms,
        ),
      },
      {
        path: "gizlilik",
        lazy: lazyPage(
          () => import("./pages/InfoPages"),
          (module) => module.Privacy,
        ),
      },

      // Protected: requires authentication
      {
        path: "dashboard",
        Component: ProtectedRoute,
        children: [
          {
            index: true,
            lazy: lazyPage(
              () => import("./pages/Dashboard"),
              (module) => module.Dashboard,
            ),
          },
        ],
      },

      // Catch-all 404 — must be last
      {
        path: "*",
        lazy: lazyPage(
          () => import("./pages/NotFound"),
          (module) => module.NotFound,
        ),
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
