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

// pagine “base” per utenti loggati
import RosaGiocatori       from "./pages/RosaGiocatori";
import DettaglioGiocatore  from "./pages/DettaglioGiocatore";
import AggiungiGiocatore   from "./pages/AggiungiGiocatore";

// tutte le altre dentro la SidebarLayout
import Home                from "./pages/Home";
import Calendario          from "./pages/Calendario";
import DettaglioPrePartita from "./pages/DettaglioPrePartita";
import Risultati           from "./pages/Risultati";
import NuovaPartitaPage    from "./pages/NuovaPartitaPage";
import DettaglioPartita    from "./pages/DettaglioPartita";
import ListaSquadre        from "./pages/ListaSquadre";
import DettaglioSquadra    from "./pages/DettaglioSquadra";
import StatisticheSquadra  from "./pages/StatisticheSquadra";
import StatisticheGiocatori from "./pages/StatisticheGiocatori";
import ProssimaPartita     from "./pages/ProssimaPartita";
import Tornei              from "./pages/tornei/NuovoTorneo/Tornei";
import AdminDashboard      from "./pages/AdminDashboard";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* PUBBLICHE */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/confirm"       element={<ConfirmPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* VISIBILI A OGNI UTENTE AUTENTICATO */}
        <Route path="/rosa"               element={<RosaGiocatori />} />
        <Route path="/giocatore/:id"      element={<DettaglioGiocatore />} />
        <Route path="/aggiungi-giocatore" element={<AggiungiGiocatore />} />

        {/* BLOCCO PROTETTO: tutte le altre */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="calendario" element={<Calendario />} />

          {/* qui abbiamo cambiato il path per farlo combaciare col navigate */}
          <Route path="pre-partita/:id" element={<DettaglioPrePartita />} />

          <Route path="risultati"     element={<Risultati />} />
          <Route path="nuova-partita" element={<NuovaPartitaPage />} />
          <Route path="partita/:id"   element={<DettaglioPartita />} />

          <Route path="squadre"       element={<ListaSquadre />} />
          <Route path="squadre/:id"   element={<DettaglioSquadra />} />

          <Route path="statistiche/squadra"   element={<StatisticheSquadra />} />
          <Route path="statistiche/giocatori" element={<StatisticheGiocatori />} />
          <Route path="prossima-partita"      element={<ProssimaPartita />} />
          <Route path="tornei"                element={<Tornei />} />

          {/* SOLO CREATOR/ADMIN */}
          <Route path="admin" element={<AdminDashboard />} />
        </Route>

        {/* REDIRECT TUTTO IL RESTO → LOGIN */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
