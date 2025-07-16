// src/components/ProtectedRoute.tsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth();

  // non autenticato → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // utente autenticato di default
  const myRole = 
    (user.app_metadata?.role as UserRole)
    || (user.user_metadata?.role as UserRole)
    || UserRole.Authenticated;

  // se ho una whitelist e il mio ruolo non è incluso → homepage
  if (roles && roles.length > 0 && !roles.includes(myRole)) {
    return <Navigate to="/" replace />;
  }

  // ok: renderizza i figli
  return <>{children}</>;
}
