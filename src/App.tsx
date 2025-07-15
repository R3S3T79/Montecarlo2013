import React from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ConfirmPage from "./pages/ConfirmPage";
import AuthCallback from "./pages/AuthCallback";

import SidebarLayout from "./components/SidebarLayout";
import Home from "./pages/Home";
import Calendario from "./pages/Calendario";
import Risultati from "./pages/Risultati";
import ProssimaPartita from "./pages/ProssimaPartita";
import NuovaPartitaPage from "./pages/NuovaPartitaPage";
import EditPartitaPage from "./pages/EditPartitaPage";
import DettaglioPartita from "./pages/DettaglioPartita";
import DettaglioPrePartita from "./pages/DettaglioPrePartita";
import RosaGiocatori from "./pages/RosaGiocatori";
import AggiungiGiocatore from "./pages/AggiungiGiocatore";
import DettaglioGiocatore from "./pages/DettaglioGiocatore";
import ListaSquadre from "./pages/ListaSquadre";
import NuovaSquadra from "./pages/NuovaSquadra";
import DettaglioSquadra from "./pages/DettaglioSquadra";
import EditSquadra from "./pages/EditSquadra";
import StatisticheSquadra from "./pages/StatisticheSquadra";
import StatisticheGiocatori from "./pages/StatisticheGiocatori";
import MatchHandler from "./components/MatchHandler";

import AdminDashboard from "./pages/AdminDashboard";
import AdminPanel from "./pages/AdminPanel";

import Tornei from "./pages/tornei/NuovoTorneo/Tornei";
import EditRTorneo from "./pages/tornei/NuovoTorneo/EditRTorneo";
import Step1_DettagliBase from "./pages/tornei/NuovoTorneo/Step1_DettagliBase";
import Step1_5_FormatoTorneo from "./pages/tornei/NuovoTorneo/Step1_5_FormatoTorneo";
import Step3_ENumeroSquadre from "./pages/tornei/NuovoTorneo/Step3_ENumeroSquadre";
import Step3_GuNumeroSquadre from "./pages/tornei/NuovoTorneo/Step3_GuNumeroSquadre";
import Step3_FgNumeroSquadre from "./pages/tornei/NuovoTorneo/Step3_FgNumeroSquadre";
import Step4_Eliminazione from "./pages/tornei/NuovoTorneo/Step4_Eliminazione";
import Step4_GironeUnico from "./pages/tornei/NuovoTorneo/Step4_GironeUnico";
import Step4_FaseGironi from "./pages/tornei/NuovoTorneo/Step4_FaseGironi";
import Step5_Eliminazione from "./pages/tornei/NuovoTorneo/Step5_Eliminazione";
import Step5_GironeUnico from "./pages/tornei/NuovoTorneo/Step5_GironeUnico";
import Step5_FaseGironi from "./pages/tornei/NuovoTorneo/Step5_FaseGironi";
import Step5_5_FaseGironi from "./pages/tornei/NuovoTorneo/Step5_5_FaseGironi";
import Step6_FaseGironi from "./pages/tornei/NuovoTorneo/Step6_FaseGironi";
import Step6_GironeUnico from "./pages/tornei/NuovoTorneo/Step6_GironeUnico";
import Step6_Eliminazione from "./pages/tornei/NuovoTorneo/Step6_Eliminazione";
import ModificaRisultatoEliminazione from "./pages/tornei/NuovoTorneo/ModificaRisultatoEliminazione";
import EditGironeUnicoPartita from "./pages/tornei/NuovoTorneo/EditGironeUnicoPartita";
import EditFaseGironiPartita from "./pages/tornei/NuovoTorneo/EditFaseGironiPartita";
import Step7_FaseGironi from "./pages/tornei/NuovoTorneo/Step7_FaseGironi";

function RequireAuth({
  children,
  role,
}: {
  children: JSX.Element;
  role?: string;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.user_metadata.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* pubbliche */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/confirm" element={<ConfirmPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* protette */}
      <Route
        path="/*"
        element={
          <RequireAuth>
            <SidebarLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Home />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="risultati" element={<Risultati />} />
        <Route path="prossima-partita" element={<ProssimaPartita />} />
        <Route path="nuova-partita" element={<NuovaPartitaPage />} />
        <Route path="edit-partita/:id" element={<EditPartitaPage />} />
        <Route path="partita/:id" element={<DettaglioPartita />} />
        <Route path="prepartita/:id" element={<DettaglioPrePartita />} />
        <Route path="rosa" element={<RosaGiocatori />} />
        <Route path="aggiungi-giocatore" element={<AggiungiGiocatore />} />
        <Route path="giocatore/:id" element={<DettaglioGiocatore />} />
        <Route path="squadre" element={<ListaSquadre />} />
        <Route path="squadre/nuova" element={<NuovaSquadra />} />
        <Route path="squadre/:id" element={<DettaglioSquadra />} />
        <Route path="squadre/:id/edit" element={<EditSquadra />} />
        <Route path="statistiche/squadra" element={<StatisticheSquadra />} />
        <Route path="statistiche/giocatori" element={<StatisticheGiocatori />} />
        <Route path="match-handler/:id" element={<MatchHandler />} />
        <Route path="tornei" element={<Tornei />} />
        <Route path="tornei/edit/:id" element={<EditRTorneo />} />
        <Route path="tornei/nuovo/step1" element={<Step1_DettagliBase />} />
        <Route path="tornei/nuovo/step1_5" element={<Step1_5_FormatoTorneo />} />
        <Route
          path="tornei/nuovo/step3-eliminazione"
          element={<Step3_ENumeroSquadre />}
        />
        <Route
          path="tornei/nuovo/step3-gironeunico"
          element={<Step3_GuNumeroSquadre />}
        />
        <Route
          path="tornei/nuovo/step3-fasegironi"
          element={<Step3_FgNumeroSquadre />}
        />
        <Route
          path="tornei/nuovo/step4-eliminazione"
          element={<Step4_Eliminazione />}
        />
        <Route
          path="tornei/nuovo/step4-gironeunico"
          element={<Step4_GironeUnico />}
        />
        <Route
          path="tornei/nuovo/step4-fasegironi"
          element={<Step4_FaseGironi />}
        />
        <Route
          path="tornei/nuovo/step5-eliminazione"
          element={<Step5_Eliminazione />}
        />
        <Route
          path="tornei/nuovo/step5-gironeunico"
          element={<Step5_GironeUnico />}
        />
        <Route
          path="tornei/nuovo/step5-fasegironi"
          element={<Step5_FaseGironi />}
        />
        <Route
          path="tornei/nuovo/step5-5-fasegironi"
          element={<Step5_5_FaseGironi />}
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
          path="tornei/nuovo/step6-eliminazione/:torneoId"
          element={<Step6_Eliminazione />}
        />
        <Route
          path="tornei/nuovo/step6-eliminazione/:torneoId/edit/:matchId"
          element={<ModificaRisultatoEliminazione />}
        />
        <Route
          path="tornei/nuovo/step6-fasegironi/:torneoId/edit/:matchId"
          element={<EditFaseGironiPartita />}
        />
        <Route
          path="tornei/nuovo/step6-gironeunico/:torneoId/edit/:matchId"
          element={<EditGironeUnicoPartita />}
        />
        <Route
          path="tornei/nuovo/step7-fasegironi/:torneoId"
          element={<Step7_FaseGironi />}
        />

        {/* Admin-only */}
        <Route
          path="admin"
          element={
            <RequireAuth role="creator">
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="admin-panel"
          element={
            <RequireAuth role="creator">
              <AdminPanel />
            </RequireAuth>
          }
        />
      </Route>
    </Routes>
  );
}
