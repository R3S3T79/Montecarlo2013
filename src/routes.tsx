// src/routes.tsx
import React from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './lib/roles';

import Home from './pages/Home';
import Calendario from './pages/Calendario';
import Risultati from './pages/Risultati';
import RosaGiocatori from './pages/RosaGiocatori';
import ListaSquadre from './pages/ListaSquadre';
import StatisticheSquadra from './pages/StatisticheSquadra';
import StatisticheGiocatori from './pages/StatisticheGiocatori';
import ProssimaPartita from './pages/ProssimaPartita';
import Tornei from './pages/tornei/NuovoTorneo/Tornei';
import AdminDashboard from './pages/AdminDashboard';
import AdminPanel from './pages/AdminPanel';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConfirmPage from './pages/ConfirmPage';
import AuthCallback from './pages/AuthCallback';

export const routes = [
  // pubbliche
  { path: '/login',         element: <LoginPage /> },
  { path: '/register',      element: <RegisterPage /> },
  { path: '/confirm',       element: <ConfirmPage /> },
  { path: '/auth/callback', element: <AuthCallback /> },

  // protette per utenti autenticati
  {
    path: '/',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: '/calendario',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <Calendario />
      </ProtectedRoute>
    ),
  },
  {
    path: '/risultati',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <Risultati />
      </ProtectedRoute>
    ),
  },
  {
    path: '/rosa',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <RosaGiocatori />
      </ProtectedRoute>
    ),
  },
  {
    path: '/squadre',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <ListaSquadre />
      </ProtectedRoute>
    ),
  },
  {
    path: '/statistiche/squadra',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <StatisticheSquadra />
      </ProtectedRoute>
    ),
  },
  {
    path: '/statistiche/giocatori',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <StatisticheGiocatori />
      </ProtectedRoute>
    ),
  },
  {
    path: '/prossima-partita',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <ProssimaPartita />
      </ProtectedRoute>
    ),
  },
  {
    path: '/tornei',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <Tornei />
      </ProtectedRoute>
    ),
  },

  // protette per creator
  {
    path: '/admin',
    element: (
      <ProtectedRoute roles={[UserRole.Creator]}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin-panel',
    element: (
      <ProtectedRoute roles={[UserRole.Creator]}>
        <AdminPanel />
      </ProtectedRoute>
    ),
  },
];
