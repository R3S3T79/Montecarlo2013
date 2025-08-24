// 1. Import
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../lib/roles";

// 2. Tipi
interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

// 3. Rotte pubbliche (niente login richiesto)
const PUBLIC_PATHS = ["/login", "/register", "/reset-password"];

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 4. Log diagnostico
  console.log(
    "[ProtectedRoute] loading:",
    loading,
    "user:",
    user ? user.email : null,
    "path:",
    location.pathname
  );

  // 5. Lascia passare le rotte pubbliche
  if (PUBLIC_PATHS.includes(location.pathname)) {
    return <>{children}</>;
  }

  // 6. Gestione loading
  if (loading) {
    return null; // oppure spinner
  }

  // 7. Se non autenticato → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 8. Check ruoli (se richiesti)
  const myRole =
    (user.app_metadata?.role as UserRole) ||
    (user.user_metadata?.role as UserRole) ||
    UserRole.Authenticated;

  if (roles && roles.length > 0 && !roles.includes(myRole)) {
    return <Navigate to="/" replace />;
  }

  // 9. OK
  return <>{children}</>;
}
