import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute — guards child routes behind authentication.
 *
 * If the user is authenticated, renders the nested route via <Outlet />.
 * If not, redirects to /login and stores the attempted location in
 * navigation state (`from`) so the login page can redirect the user back
 * after a successful login.
 *
 * Usage in routes.tsx:
 *   {
 *     path: "dashboard",
 *     Component: ProtectedRoute,
 *     children: [{ index: true, Component: Dashboard }],
 *   }
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  return <Outlet />;
}
