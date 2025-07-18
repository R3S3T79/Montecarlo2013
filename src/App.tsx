// src/App.tsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import SidebarLayout from './components/SidebarLayout';
import { UserRole } from './lib/roles';

// Pagine
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

// Auth
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConfirmPage from './pages/ConfirmPage';
import AuthCallback from './pages/AuthCallback';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ROTTE PUBBLICHE */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/confirm"       element={<ConfirmPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* ROTTE PROTETTE CON LAYOUT */}
        <Route element={<SidebarLayout />}>
          <Route
            index
            element={
              <ProtectedRoute roles={[UserRole.Authenticated]}>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="calendario"
            element={
              <ProtectedRoute roles={[UserRole.Authenticated]}>
                <Calendario />
              </ProtectedRoute>
            }
          />
          <Route
            path="risultati"
            element={
              <ProtectedRoute roles={[UserRole.Authenticated]}>
                <Risultati />
              </ProtectedRoute>
            }
          />
          <Route
            path="rosa"
            element={
              <ProtectedRoute roles={[UserRole.Authenticated]}>
                <RosaGiocatori />
              </ProtectedRoute>
            }
          />
          <Route
            path="squadre"
            element={
              <ProtectedRoute roles={[UserRole.Authenticated]}>
                <ListaSquadre />
              </ProtectedRoute>
            }
          />
          <Route
            path="statistiche/squadra"
            element={
              <ProtectedRoute roles={[UserRole.Authenticated]}>
                <StatisticheSquadra />
              </ProtectedRoute>
            }
          />
          <Route
            path="statistiche/giocatori"
            element={
              <ProtectedRoute roles={[UserRole.Authenticated]}>
                <StatisticheGiocatori />
              </ProtectedRoute>
            }
          />
          <Route
            path="prossima-partita"
            element={
              <ProtectedRoute roles={[UserRole.Authenticated]}>
                <ProssimaPartita />
              </ProtectedRoute>
            }
          />
          <Route
            path="tornei"
            element={
              <ProtectedRoute roles={[UserRole.Authenticated]}>
                <Tornei />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <ProtectedRoute roles={[UserRole.Creator]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin-panel"
            element={
              <ProtectedRoute roles={[UserRole.Creator]}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <div style={{ padding: 40, textAlign: 'center' }}>
                <h1>404</h1>
                <p>Pagina non trovata</p>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
);
}
