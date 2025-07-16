import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  console.log(
    "[ProtectedRoute] loading:",
    loading,
    "user:",
    user ? user.email : null
  );

  if (loading) {
    return null; // o uno spinner
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const myRole =
    (user.app_metadata?.role as UserRole) ||
    (user.user_metadata?.role as UserRole) ||
    UserRole.Authenticated;

  if (roles && roles.length > 0 && !roles.includes(myRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
