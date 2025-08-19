// Data creazione chat: 2025-07-30
// src/App.tsx

import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SidebarLayout from "./components/SidebarLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

// pagine pubbliche
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ConfirmPage from "./pages/ConfirmPage";
import AuthCallback from "./pages/AuthCallback";
import UserProfile from './pages/UserProfile';

// pagine utente
import RosaGiocatori from "./pages/RosaGiocatori";
import DettaglioGiocatore from "./pages/DettaglioGiocatore";
import AggiungiGiocatore from "./pages/AggiungiGiocatore";
import EditGiocatore from "./pages/EditGiocatore";

// pagine interne
import Home from "./pages/Home";
import Calendario from "./pages/Calendario";
import DettaglioPrePartita from "./pages/DettaglioPrePartita";
import Risultati from "./pages/Risultati";
import NuovaPartitaPage from "./pages/NuovaPartitaPage";
import EditPartitaPage from "./pages/EditPartitaPage";
import DettaglioPartita from "./pages/DettaglioPartita";
import EditPartitaGiocata from "./pages/EditPartitaGiocata";
import MenuFormazione from "./components/MenuFormazione";
import Galleria from "./pages/Galleria";
// statistiche
import StatisticheSquadra from "./pages/StatisticheSquadra";
import StatisticheGiocatori from "./pages/StatisticheGiocatori";

// Nuove pagine per le allenamenti/allenamenti
import Allenamenti from "./pages/Allenamenti";
import AllenamentiNuovo from "./pages/AllenamentiNuovo";
import AllenamentiGiocatore from "./pages/AllenamentiGiocatore";
import StoricoAllenamenti from "./pages/StoricoAllenamenti";

// prossima partita
import ProssimaPartita from "./pages/ProssimaPartita";
import GestioneRisultatoPartita from "./components/GestioneRisultatoPartita";
import VotazioniPartita from './pages/VotazioniPartita';

// ...
<Route path="/partita/:id/votazioni" element={<VotazioniPartita />} />


// tornei
import LegacyFaseGironiRedirect from "./pages/tornei/LegacyFaseGironiRedirect";
import Tornei from "./pages/tornei/NuovoTorneo/Tornei";
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
import Step5_5_FaseGironi from "./pages/tornei/NuovoTorneo/Step5_5_FaseGironi";
import Step6_Eliminazione from "./pages/tornei/NuovoTorneo/Step6_Eliminazione";
import Step6_GironeUnico from "./pages/tornei/NuovoTorneo/Step6_GironeUnico";
import Step6_FaseGironi from "./pages/tornei/NuovoTorneo/Step6_FaseGironi";
import Step7_FaseGironi from "./pages/tornei/NuovoTorneo/Step7_FaseGironi";
import Step8_FaseGironi from "./pages/tornei/NuovoTorneo/Step8_FaseGironi";
import ModificaRisultatoEliminazione from "./pages/tornei/NuovoTorneo/ModificaRisultatoEliminazione";
import EditGironeUnicoPartita from "./pages/tornei/NuovoTorneo/EditGironeUnicoPartita";
import EditFaseGironiPartita from "./pages/tornei/NuovoTorneo/EditFaseGironiPartita";

// squadre
import ListaSquadre from "./pages/ListaSquadre";
import DettaglioSquadra from "./pages/DettaglioSquadra";
import NuovaSquadra from "./pages/NuovaSquadra";
import EditSquadra from "./pages/EditSquadra";

// admin panel
import AdminPanel from "./pages/AdminPanel";
import AdminNotizie from "./pages/AdminNotizie"; // <--- aggiungi import
import NuovoUtente from "./pages/NuovoUtente"; // nuova pagina



// fallback
import NotFoundPage from "./pages/NotFoundPage";


export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Rotte pubbliche */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/confirm" element={<ConfirmPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        


        {/* Layout protetto */}
        <Route
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        >
          {/* Nuove rotte allenamenti/Allenamenti */}
          <Route path="allenamenti" element={<Allenamenti />} />
          <Route path="allenamenti/nuovo" element={<AllenamentiNuovo />} />
          <Route path="allenamenti/:id" element={<AllenamentiGiocatore />} />
          <Route path="allenamenti/storico-allenamenti" element={<StoricoAllenamenti />} />

          {/* Dashboard principale */}
          <Route path="/" element={<Home />} />
          <Route path="/profilo" element={<UserProfile />} />
          <Route path="/galleria" element={<Galleria />} />


          {/* Calendario e partite */}
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/risultati" element={<Risultati />} />
          <Route path="/nuova-partita" element={<NuovaPartitaPage />} />
          <Route path="/partita/:id" element={<DettaglioPartita />} />
          <Route path="/partita/:id/edit" element={<EditPartitaPage />} />
          <Route path="/pre-partita/:id" element={<DettaglioPrePartita />} />
          <Route path="/modifica-partita-giocata/:id" element={<EditPartitaGiocata />} />

          {/* Rose e giocatori */}
          <Route path="/rosa" element={<RosaGiocatori />} />
          <Route path="/giocatore/:id" element={<DettaglioGiocatore />} />
          <Route path="/aggiungi-giocatore" element={<AggiungiGiocatore />} />
          <Route path="/edit-giocatore/:id" element={<EditGiocatore />} />
          <Route path="/formazione/:id" element={<MenuFormazione />} />

          {/* Statistiche */}
          <Route path="/statistiche/squadra" element={<StatisticheSquadra />} />
          <Route path="/statistiche/giocatori" element={<StatisticheGiocatori />} />

          {/* Prossima partita */}
          <Route path="/prossima-partita" element={<ProssimaPartita />} />
          <Route path="/gestione-risultato/:id" element={<GestioneRisultatoPartita />} />
          <Route path="/partita/:id/votazioni" element={<VotazioniPartita />} />
          

          {/* Tornei */}
          <Route path="/modifica-partita-fasegironi/:id" element={<LegacyFaseGironiRedirect />} />
          <Route path="/tornei" element={<Tornei />} />
          <Route path="/tornei/nuovo/step1" element={<Step1_DettagliBase />} />
          <Route path="/tornei/nuovo/step1-5" element={<Step1_5_FormatoTorneo />} />
          <Route path="/tornei/nuovo/step3-enumerosquadre/:torneoId" element={<Step3_ENumeroSquadre />} />
          <Route path="/tornei/nuovo/step3-gunumerosquadre/:torneoId" element={<Step3_GuNumeroSquadre />} />
          <Route path="/tornei/nuovo/step3-fgnumerosquadre/:torneoId" element={<Step3_FgNumeroSquadre />} />
          <Route path="/tornei/nuovo/step4-eliminazione/:torneoId" element={<Step4_Eliminazione />} />
          <Route path="/tornei/nuovo/step4-gironeunico/:torneoId" element={<Step4_GironeUnico />} />
          <Route path="/tornei/nuovo/step4-fasegironi/:torneoId" element={<Step4_FaseGironi />} />
          <Route path="/tornei/nuovo/step5-eliminazione/:torneoId" element={<Step5_Eliminazione />} />
          <Route path="/tornei/nuovo/step5-gironeunico/:torneoId" element={<Step5_GironeUnico />} />
          <Route path="/tornei/nuovo/step5-5-fasegironi/:torneoId" element={<Step5_5_FaseGironi />} />
          <Route path="/tornei/nuovo/step6-eliminazione/:torneoId" element={<Step6_Eliminazione />} />
          <Route path="/tornei/nuovo/step6-gironeunico/:torneoId" element={<Step6_GironeUnico />} />
          <Route path="/tornei/nuovo/step6-fasegironi/:torneoId" element={<Step6_FaseGironi />} />
          <Route path="/tornei/nuovo/step7-fasegironi/:torneoId" element={<Step7_FaseGironi />} />
          <Route path="/tornei/nuovo/step8-fasegironi/:torneoId" element={<Step8_FaseGironi />} />
          <Route path="/tornei/nuovo/step6-eliminazione/:torneoId/partita/:id" element={<ModificaRisultatoEliminazione />} />
          <Route path="/tornei/nuovo/step6-gironeunico/:torneoId/partita/:matchId/edit" element={<EditGironeUnicoPartita />} />
          <Route path="/tornei/nuovo/step6-fasegironi/:torneoId/partita/:matchId/edit" element={<EditFaseGironiPartita />} />

          {/* Squadre */}
          <Route path="/squadre" element={<ListaSquadre />} />
          <Route path="/squadre/nuova" element={<NuovaSquadra />} />
          <Route path="/squadre/:id" element={<DettaglioSquadra />} />
          <Route path="/squadre/:id/edit" element={<EditSquadra />} />

          {/* Admin Panel */}
          <Route path="/admin-panel" element={<AdminPanel />} />
          <Route path="/admin-notizie" element={<AdminNotizie />} />
          <Route path="/nuovo-utente" element={<NuovoUtente />} /> {/* nuova */}


          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
