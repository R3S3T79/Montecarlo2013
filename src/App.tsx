// src/App.tsx

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SidebarLayout from "./components/SidebarLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

// pagine pubbliche
import LoginPage       from "./pages/LoginPage";
import RegisterPage    from "./pages/RegisterPage";
import ConfirmPage     from "./pages/ConfirmPage";
import AuthCallback    from "./pages/AuthCallback";

// pagine fuori sidebar, per ogni utente autenticato
import RosaGiocatori      from "./pages/RosaGiocatori";
import DettaglioGiocatore from "./pages/DettaglioGiocatore";
import AggiungiGiocatore  from "./pages/AggiungiGiocatore";

// pagine interne sotto SidebarLayout
import Home                from "./pages/Home";
import Calendario          from "./pages/Calendario";
import DettaglioPrePartita from "./pages/DettaglioPrePartita";
import Risultati           from "./pages/Risultati";
import NuovaPartitaPage    from "./pages/NuovaPartitaPage";
import EditPartitaPage     from "./pages/EditPartitaPage";
import DettaglioPartita    from "./pages/DettaglioPartita";

import ListaSquadre       from "./pages/ListaSquadre";
import NuovaSquadra       from "./pages/NuovaSquadra";
import EditSquadra        from "./pages/EditSquadra";
import DettaglioSquadra   from "./pages/DettaglioSquadra";

import StatisticheSquadra   from "./pages/StatisticheSquadra";
import StatisticheGiocatori from "./pages/StatisticheGiocatori";
import ProssimaPartita      from "./pages/ProssimaPartita";

// pagina Tornei (senza dettaglio)
import Tornei from "./pages/tornei/NuovoTorneo/Tornei";

// admin only
import AdminDashboard from "./pages/AdminDashboard";
import AdminPanel     from "./pages/AdminPanel";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* pagine pubbliche */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/confirm"       element={<ConfirmPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* pagine accessibili a ogni utente autenticato */}
        <Route path="/rosa"               element={<RosaGiocatori />} />
        <Route path="/giocatore/:id"      element={<DettaglioGiocatore />} />
        <Route path="/aggiungi-giocatore" element={<AggiungiGiocatore />} />

        {/* resto delle pagine protette dentro SidebarLayout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />

          <Route path="calendario"      element={<Calendario />} />
          <Route path="pre-partita/:id" element={<DettaglioPrePartita />} />

          <Route path="risultati"       element={<Risultati />} />
          <Route path="nuova-partita"   element={<NuovaPartitaPage />} />
          <Route path="partita/:id"     element={<DettaglioPartita />} />
          <Route path="partita/:id/edit" element={<EditPartitaPage />} />

          <Route path="squadre"          element={<ListaSquadre />} />
          <Route path="squadre/nuova"    element={<NuovaSquadra />} />
          <Route path="squadre/:id"      element={<DettaglioSquadra />} />
          <Route path="squadre/:id/edit" element={<EditSquadra />} />

          <Route path="statistiche/squadra"   element={<StatisticheSquadra />} />
          <Route path="statistiche/giocatori" element={<StatisticheGiocatori />} />
          <Route path="prossima-partita"       element={<ProssimaPartita />} />

          <Route path="tornei" element={<Tornei />} />

          {/* rotte riservate a creator/admin */}
          <Route path="admin"       element={<AdminDashboard />} />
          <Route path="admin-panel" element={<AdminPanel />} />
        </Route>

        {/* catch-all → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
