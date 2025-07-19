// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import SidebarLayout from './components/SidebarLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
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
import DettaglioGiocatore from './pages/DettaglioGiocatore';
import AggiungiGiocatore from './pages/AggiungiGiocatore';
import DettaglioSquadra from './pages/DettaglioSquadra';

// Auth
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConfirmPage from './pages/ConfirmPage';
import AuthCallback from './pages/AuthCallback';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* PUBBLICHE */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/confirm"       element={<ConfirmPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* PUBBLICHE NON PROTETTE */}
        <Route path="/rosa"               element={<RosaGiocatori />} />
        <Route path="/giocatore/:id"     element={<DettaglioGiocatore />} />
        <Route path="/aggiungi-giocatore" element={<AggiungiGiocatore />} />

        {/* PROTETTE – qualunque utente autenticato */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="calendario"            element={<Calendario />} />
          <Route path="risultati"             element={<Risultati />} />
          <Route path="squadre"               element={<ListaSquadre />} />
          <Route path="squadre/:id"           element={<DettaglioSquadra />} />
          <Route path="statistiche/squadra"   element={<StatisticheSquadra />} />
          <Route path="statistiche/giocatori" element={<StatisticheGiocatori />} />
          <Route path="prossima-partita"      element={<ProssimaPartita />} />
          <Route path="tornei"                element={<Tornei />} />

          {/* ADMIN – solo creator */}
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

        {/* REDIRECT PER TUTTO IL RESTO */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
