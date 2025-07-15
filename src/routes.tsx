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

  // protette (qualsiasi utente autenticato)
  {
    path: '/',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <Home />
      </ProtectedRoute>
    )
  },
  {
    path: '/calendario',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <Calendario />
      </ProtectedRoute>
    )
  },
  {
    path: '/risultati',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <Risultati />
      </ProtectedRoute>
    )
  },
  {
    path: '/rosa',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <RosaGiocatori />
      </ProtectedRoute>
    )
  },
  {
    path: '/squadre',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <ListaSquadre />
      </ProtectedRoute>
    )
  },
  {
    path: '/statistiche/squadra',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <StatisticheSquadra />
      </ProtectedRoute>
    )
  },
  {
    path: '/statistiche/giocatori',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <StatisticheGiocatori />
      </ProtectedRoute>
    )
  },
  {
    path: '/prossima-partita',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <ProssimaPartita />
      </ProtectedRoute>
    )
  },
  {
    path: '/tornei',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <Tornei />
      </ProtectedRoute>
    )
  },

  // riservate a creator
  {
    path: '/admin',
    element: (
      <ProtectedRoute roles={[UserRole.Creator]}>
        <AdminDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: '/admin-panel',
    element: (
      <ProtectedRoute roles={[UserRole.Creator]}>
        <AdminPanel />
      </ProtectedRoute>
    )
  }
];
