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

// pagine per ogni utente autenticato (ora NESTATE dentro SidebarLayout)
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

// tornei
import Tornei             from "./pages/tornei/NuovoTorneo/Tornei";
import Step5_Eliminazione  from "./pages/tornei/NuovoTorneo/Step5_Eliminazione";
import Step6_Eliminazione  from "./pages/tornei/NuovoTorneo/Step6_Eliminazione";
import Step6_FaseGironi    from "./pages/tornei/NuovoTorneo/Step6_FaseGironi";
import Step6_GironeUnico   from "./pages/tornei/NuovoTorneo/Step6_GironeUnico";
import Step7_FaseGironi    from "./pages/tornei/NuovoTorneo/Step7_FaseGironi";

// admin only
import AdminDashboard from "./pages/AdminDashboard";
import AdminPanel     from "./pages/AdminPanel";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ROTTE PUBBLICHE */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/confirm"       element={<ConfirmPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* TUTTE LE ROTTE PROTETTE CON SIDEBAR */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        >
          {/* Home */}
          <Route index element={<Home />} />

          {/* Rosa Giocatori e dettagli */}
          <Route path="rosa"               element={<RosaGiocatori />} />
          <Route path="giocatore/:id"      element={<DettaglioGiocatore />} />
          <Route path="aggiungi-giocatore" element={<AggiungiGiocatore />} />

          {/* Calendario */}
          <Route path="calendario"      element={<Calendario />} />
          <Route path="pre-partita/:id" element={<DettaglioPrePartita />} />

          {/* Risultati */}
          <Route path="risultati"        element={<Risultati />} />
          <Route path="nuova-partita"    element={<NuovaPartitaPage />} />
          <Route path="partita/:id"      element={<DettaglioPartita />} />
          <Route path="partita/:id/edit" element={<EditPartitaPage />} />

          {/* Squadre */}
          <Route path="squadre"          element={<ListaSquadre />} />
          <Route path="squadre/nuova"    element={<NuovaSquadra />} />
          <Route path="squadre/:id"      element={<DettaglioSquadra />} />
          <Route path="squadre/:id/edit" element={<EditSquadra />} />

          {/* Statistiche */}
          <Route path="statistiche/squadra"   element={<StatisticheSquadra />} />
          <Route path="statistiche/giocatori" element={<StatisticheGiocatori />} />
          <Route path="prossima-partita"       element={<ProssimaPartita />} />

          {/* Tornei */}
          <Route path="tornei" element={<Tornei />} />
          <Route
            path="tornei/nuovo/step5-eliminazione/:torneoId"
            element={<Step5_Eliminazione />}
          />
          <Route
            path="tornei/nuovo/step6-eliminazione/:torneoId"
            element={<Step6_Eliminazione />}
          />
          <Route
            path="tornei/nuovo/step6-fasegironi/:torneoId"
            element={<Step6_FaseGironi />}
          />
          <Route
            path="tornei/nuovo/step6-gironeunico/:torneoId"
            element={<Step6_GironeUnico />}
          />
          <Route
            path="tornei/nuovo/step7-fasegironi/:torneoId"
            element={<Step7_FaseGironi />}
          />

          {/* Admin only */}
          <Route path="admin"       element={<AdminDashboard />} />
          <Route path="admin-panel" element={<AdminPanel     />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
