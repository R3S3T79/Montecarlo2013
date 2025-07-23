// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SidebarLayout from "./components/SidebarLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

// pagine pubbliche
import LoginPage    from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ConfirmPage  from "./pages/ConfirmPage";
import AuthCallback from "./pages/AuthCallback";

// pagine fuori sidebar (autenticati)
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
import ProssimaPartita     from "./pages/ProssimaPartita";

// gestione risultato match-day
import GestioneRisultatoPartita from "./components/GestioneRisultatoPartita";

// squadre
import ListaSquadre     from "./pages/ListaSquadre";
import NuovaSquadra     from "./pages/NuovaSquadra";
import EditSquadra      from "./pages/EditSquadra";
import DettaglioSquadra from "./pages/DettaglioSquadra";

// statistiche
import StatisticheSquadra   from "./pages/StatisticheSquadra";
import StatisticheGiocatori from "./pages/StatisticheGiocatori";

// tornei
import Tornei                   from "./pages/tornei/NuovoTorneo/Tornei";
import Step1_DettagliBase       from "./pages/tornei/NuovoTorneo/Step1_DettagliBase";
import Step1_5_FormatoTorneo    from "./pages/tornei/NuovoTorneo/Step1_5_FormatoTorneo";
import Step3_ENumeroSquadre     from "./pages/tornei/NuovoTorneo/Step3_ENumeroSquadre";
import Step3_GuNumeroSquadre    from "./pages/tornei/NuovoTorneo/Step3_GuNumeroSquadre";
import Step3_FgNumeroSquadre    from "./pages/tornei/NuovoTorneo/Step3_FgNumeroSquadre";
import Step4_Eliminazione       from "./pages/tornei/NuovoTorneo/Step4_Eliminazione";
import Step4_GironeUnico        from "./pages/tornei/NuovoTorneo/Step4_GironeUnico";
import Step4_FaseGironi         from "./pages/tornei/NuovoTorneo/Step4_FaseGironi";
import Step5_Eliminazione       from "./pages/tornei/NuovoTorneo/Step5_Eliminazione";
import Step5_GironeUnico        from "./pages/tornei/NuovoTorneo/Step5_GironeUnico";
import Step5_FaseGironi         from "./pages/tornei/NuovoTorneo/Step5_FaseGironi";
import Step6_Eliminazione       from "./pages/tornei/NuovoTorneo/Step6_Eliminazione";
import Step6_GironeUnico        from "./pages/tornei/NuovoTorneo/Step6_GironeUnico";
import Step6_FaseGironi         from "./pages/tornei/NuovoTorneo/Step6_FaseGironi";
import Step7_FaseGironi         from "./pages/tornei/NuovoTorneo/Step7_FaseGironi";

// admin only
import AdminDashboard from "./pages/AdminDashboard";
import AdminPanel     from "./pages/AdminPanel";

export default function App() {
  return (
    <AuthProvider>
      <Routes>

        {/* PUBBLICHE */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/confirm"       element={<ConfirmPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* FUORI SIDEBAR (autenticati) */}
        <Route path="/rosa"               element={<RosaGiocatori />} />
        <Route path="/giocatore/:id"      element={<DettaglioGiocatore />} />
        <Route path="/aggiungi-giocatore" element={<AggiungiGiocatore />} />

        {/* PROTETTE SOTTO SIDEBARLAYOUT */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        >

          <Route index element={<Home />} />

          {/* Partite */}
          <Route path="calendario"             element={<Calendario />} />
          <Route path="prepartita/:id"         element={<DettaglioPrePartita />} />
          <Route path="risultati"              element={<Risultati />} />
          <Route path="nuova-partita"          element={<NuovaPartitaPage />} />
          <Route path="partita/:id"            element={<DettaglioPartita />} />
          <Route path="partita/:id/edit"       element={<EditPartitaPage />} />
          <Route path="prossima-partita"       element={<ProssimaPartita />} />
          <Route path="gestione-risultato/:id" element={<GestioneRisultatoPartita />} />

          {/* Squadre */}
          <Route path="squadre"          element={<ListaSquadre />} />
          <Route path="squadre/nuova"    element={<NuovaSquadra />} />
          <Route path="squadre/:id"      element={<DettaglioSquadra />} />
          <Route path="squadre/:id/edit" element={<EditSquadra />} />

          {/* Statistiche */}
          <Route path="statistiche/squadra"   element={<StatisticheSquadra />} />
          <Route path="statistiche/giocatori" element={<StatisticheGiocatori />} />

          {/* Tornei */}
          <Route path="tornei"                          element={<Tornei />} />
          <Route path="tornei/nuovo/step1"              element={<Step1_DettagliBase />} />
          <Route path="tornei/nuovo/step1-5"            element={<Step1_5_FormatoTorneo />} />
          <Route path="tornei/nuovo/step3-eliminazione" element={<Step3_ENumeroSquadre />} />
          <Route path="tornei/nuovo/step3-gironeunico"  element={<Step3_GuNumeroSquadre />} />
          <Route path="tornei/nuovo/step3-fasegironi"   element={<Step3_FgNumeroSquadre />} />
          <Route path="tornei/nuovo/step4-eliminazione" element={<Step4_Eliminazione />} />
          <Route path="tornei/nuovo/step4-gironeunico"  element={<Step4_GironeUnico />} />
          <Route path="tornei/nuovo/step4-fasegironi"   element={<Step4_FaseGironi />} />
          <Route path="tornei/nuovo/step5-eliminazione" element={<Step5_Eliminazione />} />
          <Route path="tornei/nuovo/step5-gironeunico"  element={<Step5_GironeUnico />} />
          <Route path="tornei/nuovo/step5-fasegironi"   element={<Step5_FaseGironi />} />
          <Route path="tornei/nuovo/step6-eliminazione/:torneoId" element={<Step6_Eliminazione />} />
          <Route path="tornei/nuovo/step6-gironeunico/:torneoId"  element={<Step6_GironeUnico />} />
          <Route path="tornei/nuovo/step6-fasegironi/:torneoId"   element={<Step6_FaseGironi />} />
          <Route path="tornei/nuovo/step7-fasegironi/:torneoId"   element={<Step7_FaseGironi />} />

          {/* Admin only */}
          <Route path="admin"       element={<AdminDashboard />} />
          <Route path="admin-panel" element={<AdminPanel />} />

        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </AuthProvider>
  );
}
