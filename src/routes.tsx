// src/routes.tsx
import React from 'react';
import {
  Home,
  Calendario,
  Risultati,
  RosaGiocatori,
  ListaSquadre,
  StatisticheSquadra,
  StatisticheGiocatori,
  ProssimaPartita,
  Tornei,
  AdminDashboard,
  AdminPanel,
  LoginPage,
  RegisterPage,
  ConfirmPage,
  AuthCallback
} from './pages';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './lib/roles';

export const routes = [
  // pubbliche
  { path: '/login',         element: <LoginPage /> },
  { path: '/register',      element: <RegisterPage /> },
  { path: '/confirm',       element: <ConfirmPage /> },
  { path: '/auth/callback', element: <AuthCallback /> },

  // **ROUTA `/` SENZA PROTECTEDROUTE**
  {
    path: '/',
    element: <Home />
  },

  // protette (qualsiasi utente autenticato)
  {
    path: '/calendario',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <Calendario />
      </ProtectedRoute>
    )
  },
  // ... lascia tutte le altre rotte invariate
];
