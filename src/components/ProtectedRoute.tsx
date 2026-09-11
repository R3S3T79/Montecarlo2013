import React, { useEffect, useState } from "react";
import {
  Navigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { UserRole } from "../lib/roles";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({
  children,
  roles,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [mustChangePassword, setMustChangePassword] =
    useState<boolean | null>(null);

  // =====================================
  // CONTROLLO PASSWORD PROVVISORIA
  // =====================================

  useEffect(() => {
    let active = true;

    const checkPasswordStatus = async () => {
      if (loading) {
        return;
      }

      if (!user) {
        if (active) {
          setMustChangePassword(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("must_change_password")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (error) {
        console.error(
          "[ProtectedRoute] errore controllo password:",
          error
        );

        setMustChangePassword(null);
        return;
      }

      setMustChangePassword(
        data?.must_change_password === true
      );
    };

    setMustChangePassword(null);
    checkPasswordStatus();

    return () => {
      active = false;
    };
  }, [user?.id, loading, location.pathname]);

  // =====================================
  // LOADING SESSIONE
  // =====================================

  if (loading) {
    return null;
  }

  // =====================================
  // UTENTE NON AUTENTICATO
  // =====================================

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // =====================================
  // CONTROLLO PROFILO
  // =====================================

  if (mustChangePassword === null) {
    return null;
  }

  // =====================================
  // PASSWORD PROVVISORIA
  //
  // Nessuna pagina dell'app è accessibile
  // finché la password non viene cambiata.
  // =====================================

  if (
    mustChangePassword &&
    location.pathname !== "/change-password"
  ) {
    return (
      <Navigate
        to="/change-password"
        replace
      />
    );
  }

  // Se il cambio non è più necessario,
  // non deve poter restare sulla pagina.
  if (
    !mustChangePassword &&
    location.pathname === "/change-password"
  ) {
    return <Navigate to="/" replace />;
  }

  // =====================================
  // CONTROLLO RUOLI ESISTENTE
  // =====================================

  const myRole =
    (user.app_metadata?.role as UserRole) ||
    (user.user_metadata?.role as UserRole) ||
    UserRole.Authenticated;

  if (
    roles &&
    roles.length > 0 &&
    !roles.includes(myRole)
  ) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}