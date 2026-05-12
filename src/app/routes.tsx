import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { Home } from "./pages/Home";
import { SearchResults } from "./pages/SearchResults";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { VerifyEmail } from "./pages/VerifyEmail";
import { Dashboard } from "./pages/Dashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "search", Component: SearchResults },
      { path: "login", Component: Login },
      { path: "register", Component: Register },
      { path: "verify-email", Component: VerifyEmail },
      { path: "dashboard", Component: Dashboard },
    ],
  },
]);
