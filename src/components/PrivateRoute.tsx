// src/components/PrivateRoute.tsx
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
  const isAuth = localStorage.getItem("auth") === "1";
  return isAuth ? children : <Navigate to="/login" replace />;
}
