// src/routes.tsx
import React from 'react';
import {
  Home, Calendario, Risultati, RosaGiocatori,
  ListaSquadre, StatisticheSquadra, StatisticheGiocatori,
  ProssimaPartita, Tornei, AdminDashboard, AdminPanel,
  LoginPage, RegisterPage, ConfirmPage, AuthCallback
} from './pages';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './lib/roles';

export const routes = [
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/confirm',  element: <ConfirmPage /> },
  { path: '/auth/callback', element: <AuthCallback /> },

  // TUTTE queste pagine richiedono almeno l’autenticazione
  { path: '/',                     element: <Home />,              roles: [UserRole.Authenticated] },
  { path: '/calendario',           element: <Calendario />,        roles: [UserRole.Authenticated] },
  { path: '/risultati',            element: <Risultati />,         roles: [UserRole.Authenticated] },
  { path: '/rosa',                 element: <RosaGiocatori />,     roles: [UserRole.Authenticated] },
  { path: '/squadre',              element: <ListaSquadre />,      roles: [UserRole.Authenticated] },
  { path: '/statistiche/squadra',  element: <StatisticheSquadra />,roles: [UserRole.Authenticated] },
  { path: '/statistiche/giocatori',element: <StatisticheGiocatori />,roles: [UserRole.Authenticated] },
  { path: '/prossima-partita',     element: <ProssimaPartita />,   roles: [UserRole.Authenticated] },
  { path: '/tornei',               element: <Tornei />,             roles: [UserRole.Authenticated] },

  // Solo creator
  { path: '/admin',       element: <AdminDashboard />, roles: [UserRole.Creator] },
  { path: '/admin-panel', element: <AdminPanel />,     roles: [UserRole.Creator] },
];
