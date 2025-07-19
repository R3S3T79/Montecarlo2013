// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SidebarLayout from "./components/SidebarLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

// — Pubbliche —
import LoginPage       from "./pages/LoginPage";
import RegisterPage    from "./pages/RegisterPage";
import ConfirmPage     from "./pages/ConfirmPage";
import AuthCallback    from "./pages/AuthCallback";

// — Fuori sidebar (autenticati) —
import RosaGiocatori      from "./pages/RosaGiocatori";
import DettaglioGiocatore from "./pages/DettaglioGiocatore";
import AggiungiGiocatore  from "./pages/AggiungiGiocatore";

// — Dentro sidebar —
import Home                   from "./pages/Home";
import Calendario             from "./pages/Calendario";
import DettaglioPrePartita    from "./pages/DettaglioPrePartita";
import Risultati              from "./pages/Risultati";
import NuovaPartitaPage       from "./pages/NuovaPartitaPage";
import EditPartitaPage        from "./pages/EditPartitaPage";      // **nuovo**
import DettaglioPartita       from "./pages/DettaglioPartita";

import ListaSquadre           from "./pages/ListaSquadre";
import NuovaSquadra           from "./pages/NuovaSquadra";        // **nuovo**
import EditSquadra            from "./pages/EditSquadra";         // **nuovo**
import DettaglioSquadra       from "./pages/DettaglioSquadra";

import StatisticheSquadra     from "./pages/StatisticheSquadra";
import StatisticheGiocatori   from "./pages/StatisticheGiocatori";
import ProssimaPartita        from "./pages/ProssimaPartita";

import Tornei                 from "./pages/tornei/Tornei";
import DettaglioTorneo        from "./pages/tornei/DettaglioTorneo"; // **nuovo**

// (Se usi il wizard, importa anche gli step)
// import Step1_DettagliBase       from "./pages/tornei/Step1_DettagliBase";
// import Step3_FgNumeroSquadre    from "./pages/tornei/Step3_FgNumeroSquadre";
// import Step4_FaseGironi         from "./pages/tornei/Step4_FaseGironi";
// import Step5_GironeUnico        from "./pages/tornei/Step5_GironeUnico";
// import Step5_Eliminazione       from "./pages/tornei/Step5_Eliminazione";
// import Step6_FaseGironi         from "./pages/tornei/Step6_FaseGironi";
// import Step6_GironeUnico        from "./pages/tornei/Step6_GironeUnico";
// import Step6_Eliminazione       from "./pages/tornei/Step6_Eliminazione";

import AdminDashboard         from "./pages/AdminDashboard";
import AdminPanel             from "./pages/AdminPanel";            // **nuovo**

export default function App() {
  return (
    <AuthProvider>
      <Routes>

        {/* — Pubbliche — */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/confirm"       element={<ConfirmPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* — Fuori sidebar (autenticati) — */}
        <Route path="/rosa"               element={<RosaGiocatori />} />
        <Route path="/giocatore/:id"      element={<DettaglioGiocatore />} />
        <Route path="/aggiungi-giocatore" element={<AggiungiGiocatore />} />

        {/* — Tutto il resto usa SidebarLayout e richiede login — */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />

          {/* Calendario */}
          <Route path="calendario"       element={<Calendario />} />
          <Route path="pre-partita/:id"  element={<DettaglioPrePartita />} />

          {/* Risultati */}
          <Route path="risultati"         element={<Risultati />} />
          <Route path="nuova-partita"     element={<NuovaPartitaPage />} />
          <Route path="partita/:id"       element={<DettaglioPartita />} />
          <Route path="partita/:id/edit"  element={<EditPartitaPage />} />

          {/* Squadre */}
          <Route path="squadre"           element={<ListaSquadre />} />
          <Route path="squadre/nuova"     element={<NuovaSquadra />} />
          <Route path="squadre/:id"       element={<DettaglioSquadra />} />
          <Route path="squadre/:id/edit"  element={<EditSquadra />} />

          {/* Statistiche */}
          <Route path="statistiche/squadra"   element={<StatisticheSquadra />} />
          <Route path="statistiche/giocatori" element={<StatisticheGiocatori />} />
          <Route path="prossima-partita"       element={<ProssimaPartita />} />

          {/* Tornei */}
          <Route path="tornei"             element={<Tornei />} />
          <Route path="tornei/:id"         element={<DettaglioTorneo />} />
          {/* Se usi il wizard, aggiungi qui le route per ciascun “step” */}

          {/* Solo Creator/Admin */}
          <Route path="admin"       element={<AdminDashboard />} />
          <Route path="admin-panel" element={<AdminPanel />} />

        </Route>

        {/* — Catch-all → login — */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </AuthProvider>
  );
}
