// src/components/SidebarLayout.tsx
// Data creazione chat: 2025-08-02 (rev: brand "Montecarlo 2013" + 3 strisce rosse, Home link, titolo home "Ciao {username}")

import React, { useState, useEffect } from 'react';
import {
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
  useMatch,
} from 'react-router-dom';
import { Menu, PlusCircle, Trash2, Edit2, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { UserRole } from '../lib/roles';
import { Star } from "lucide-react";
// (presente nei tuoi import originali)
import Step3_GuNumeroSquadre from '../pages/tornei/NuovoTorneo/Step3_GuNumeroSquadre';

export default function SidebarLayout(): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Username da user_profiles per titolo "Ciao {username}"
  const [profileUsername, setProfileUsername] = useState<string>('');
  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data?.username) setProfileUsername(data.username);
    })();
  }, [user?.id]);

  // Chiudi sidebar al cambio pagina
  useEffect(() => {
    if (drawerOpen) setDrawerOpen(false);
  }, [location.pathname]);

  // Matches per pagine squadre e giocatori
  const matchTeamList = useMatch({ path: '/squadre', end: true });
  const matchTeamEdit = useMatch('/squadre/:id/edit');
  const matchTeamDetail = useMatch({ path: '/squadre/:id', end: true });
  const matchTeamNew = useMatch('/squadre/nuova');
  const matchRosa = useMatch('/rosa');
  const matchAggiungiGiocatore = useMatch('/aggiungi-giocatore');

  // Matches per altre azioni
  const matchCalendario = useMatch('/calendario');
  const matchPre = useMatch('/pre-partita/:id');
  const matchDetail = useMatch('/partita/:id');
  const matchEditPartita = useMatch('/partita/:id/edit');
  const matchGestione = useMatch('/gestione-risultato/:id');
  const matchPlayer = useMatch('/giocatore/:id');
  const matchEditGiocatore = useMatch('/edit-giocatore/:id');
  const matchStatisticheGiocatori = useMatch('/statistiche/giocatori');
  const matchStatisticheSquadra = useMatch('/statistiche/squadra');
  const matchTornei = useMatch('/tornei');
  const matchNuovoTorneo = useMatch('/tornei/nuovo/step1');
  const matchFormatoTorneo = useMatch('/tornei/nuovo/step1-5');
  const matchNumeroSquadre = useMatch('/tornei/nuovo/step3-enumerosquadre/:torneoId');
  const matchSelezionaSquadre = useMatch('/tornei/nuovo/step4-eliminazione/:torneoId');
  const matchStep5Eliminazione = useMatch('/tornei/nuovo/step5-eliminazione/:torneoId');
  const matchSpetp3GuNumeroSquadre = useMatch('/tornei/nuovo/step3-gunumerosquadre/:torneoId');
  const matchStep4GironeUnico = useMatch('/tornei/nuovo/step4-gironeunico/:torneoId');
  const matchStep5GironeUnico = useMatch('/tornei/nuovo/step5-gironeunico/:torneoId');
  const matchEditGironeUnico = useMatch('/tornei/nuovo/step6-gironeunico/:torneoId/partita/:id/edit');
  const matcheditfasegironi = useMatch('/tornei/nuovo/step6-fasegironi/:torneoId/partita/:id/edit');
  const matchEditRisultatoEliminazione = useMatch('/tornei/nuovo/step6-eliminazione/:torneoId/partita/:id');
  const matchStep3FgNumeroSquadre = useMatch('/tornei/nuovo/step3-fgnumerosquadre/:torneoId');
  const matchStep4FaseGironi = useMatch('/tornei/nuovo/step4-FaseGironi/:torneoId');
  const matchStep5_5FaseGironi = useMatch('/tornei/nuovo/step5-5-FaseGironi/:torneoId');
  const matchAllenamenti = useMatch({ path: '/allenamenti', end: true });
  const matchAllenamentiNuovo = useMatch('/allenamenti/nuovo');
  const matchStoricoAllenamenti = useMatch('/allenamenti/storico-allenamenti');
  const matchProssimaPartita = useMatch('/prossima-partita');
  const matchVotazioni = useMatch('/partita/:id/votazioni');
  const matchEditPartitaGiocata = useMatch('/modifica-partita-giocata/:id');

  const teamId = matchTeamDetail?.params.id ?? null;
  const preId = matchPre?.params.id ?? null;
  const detailId = matchDetail?.params.id ?? null;
  const gestioneId = matchGestione?.params.id ?? null;
  const playerId = matchPlayer?.params.id ?? null;

  // Recupero data/ora per gestione risultato
  const [gestioneData, setGestioneData] = useState<string | null>(null);
  const [gestioneOra, setGestioneOra] = useState<string | null>(null);
  useEffect(() => {
    if (!gestioneId) return;
    (async () => {
      const { data, error } = await supabase
        .from('partite')
        .select('data_ora')
        .eq('id', gestioneId)
        .single();
      if (data && !error) {
        const d = new Date(data.data_ora);
        setGestioneData(
          d.toLocaleDateString('it-IT', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        );
        setGestioneOra(
          d.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
      }
    })();
  }, [gestioneId]);

  // Permessi utente
  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;

 const canAdmin = role === UserRole.Admin;
const canCreator = role === UserRole.Creator;

  // Gruppi link — PRIMA voce: "Home"
  const group1 = [
    { to: '/', label: 'Home' },
    { to: '/risultati', label: 'Risultati' },
    { to: '/calendario', label: 'Calendario' },
    { to: '/prossima-partita', label: 'Prossima Partita' },
  ];
  const group2 = [
    { to: '/rosa', label: 'Rosa Giocatori' },
    { to: '/squadre', label: 'Squadre' },
  ];
  const group3 = [
    { to: '/statistiche/squadra', label: 'Statistiche Squadra' },
    { to: '/statistiche/giocatori', label: 'Statistiche Giocatori' },
    { to: '/tornei', label: 'Tornei' },
    { to: '/galleria', label: 'Galleria' },
  ];
  const group4 = [
  ...(canAdmin || canCreator ? [{ to: '/allenamenti', label: 'Allenamenti' }] : []),
  ...(canAdmin || canCreator ? [{ to: '/convocazioni', label: 'Convocazioni' }] : []),
  ...(canCreator ? [{ to: '/admin-panel', label: 'Pannello Admin' }] : []),
];

  


  // Titolo dinamico — sulla home: "Ciao {username da user_profiles}"
  let pageTitle = '';
  if (matchTeamEdit) pageTitle = 'Modifica Squadra';
  else if (matchTeamNew) pageTitle = 'Nuova Squadra';
  else if (matchTeamDetail) pageTitle = 'Dettaglio Squadra';
  else if (matchTeamList) pageTitle = 'Squadre';
  else if (matchRosa) pageTitle = 'Rosa Giocatori';
  else if (matchAggiungiGiocatore) pageTitle = 'Nuovo Giocatore';
  else if (matchPre) pageTitle = 'Partita';
  else if (matchDetail) pageTitle = 'Partita';
  else if (matchEditPartita) pageTitle = 'Modifica Partita';
  else if (matchGestione) pageTitle = 'Gestione Risultato';
  else if (matchPlayer) pageTitle = 'Giocatore';
  else if (matchEditGiocatore) pageTitle = 'Modifica Giocatore';
  else if (matchCalendario) pageTitle = 'Calendario';
  else if (matchStatisticheGiocatori) pageTitle = 'Statistiche Giocatori';
  else if (matchStatisticheSquadra) pageTitle = 'Statistiche Squadra';
  else if (location.pathname === '/galleria') pageTitle = 'Galleria';
  else if (matchTornei) pageTitle = 'Tornei';
  else if (matchNuovoTorneo) pageTitle = 'Nuovo Torneo';
  else if (matchFormatoTorneo) pageTitle = 'Formato Torneo';
  else if (matchNumeroSquadre) pageTitle = 'Numero Squadre';
  else if (matchSelezionaSquadre) pageTitle = 'Seleziona Squadre';
  else if (matchStep5Eliminazione) pageTitle = 'Date Fasi';
  else if (matchSpetp3GuNumeroSquadre) pageTitle = 'Numero Squadre';
  else if (matchStep4GironeUnico) pageTitle = 'Seleziona Squadre';
  else if (matchStep5GironeUnico) pageTitle = 'Date Match';
  else if (matchEditGironeUnico) pageTitle = 'Modifica Risultato';
  else if (matcheditfasegironi) pageTitle = 'Modifica Risultato';
  else if (matchEditRisultatoEliminazione) pageTitle = 'Modifica Risultato';
  else if (matchStep3FgNumeroSquadre) pageTitle = 'Numero Squadre';
  else if (matchStep4FaseGironi) pageTitle = 'Gironi';
  else if (matchStep5_5FaseGironi) pageTitle = 'Date Match';
  else if (matchAllenamenti) pageTitle = 'Presenze Allenamenti';
  else if (matchAllenamentiNuovo) pageTitle = 'Nuovo Allenamento';
  else if (matchStoricoAllenamenti) pageTitle = 'Storico Allenamenti';
  else if (matchProssimaPartita) pageTitle = 'Prossima Partita';
  else if (matchVotazioni) pageTitle = 'Voto Partita';
  else if (matchEditPartitaGiocata) pageTitle = 'Modifica Partita';
  else if (location.pathname === '/risultati') pageTitle = 'Risultati';
  else if (location.pathname === '/')
    pageTitle = `Ciao ${profileUsername || user?.user_metadata?.username || ''}`;
  else pageTitle = '';

  if (authLoading) return <div className="min-h-screen">Caricamento…</div>;
  // Handlers
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const handleTeamDelete = async () => {
    const id = matchTeamDetail?.params.id;
    if (!id || !window.confirm('Eliminare questa squadra?')) return;
    const { error } = await supabase.from('squadre').delete().eq('id', id);
    if (!error) navigate('/squadre', { replace: true });
  };

  const handlePlayerDelete = async () => {
    const id = matchPlayer?.params.id;
    if (!id || !window.confirm('Eliminare questo giocatore e tutti i dati collegati?')) return;
    await supabase.from('giocatori_stagioni').delete().eq('giocatore_uid', id);
    await supabase.from('marcatori').delete().eq('giocatore_uid', id);
    await supabase.from('allenamenti').delete().eq('giocatore_uid', id);
    const { error } = await supabase.from('giocatori').delete().eq('id', id);
    if (!error) navigate('/rosa', { replace: true });
  };

  const handlePreDelete = async () => {
    const id = matchPre?.params.id;
    if (!id || !window.confirm('Eliminare questa partita?')) return;
    const { error } = await supabase.from('partite').delete().eq('id', id);
    if (!error) navigate('/calendario', { replace: true });
  };

  const handleDetailDelete = async () => {
    const id = matchDetail?.params.id;
    if (!id || !window.confirm('Eliminare definitivamente questa partita?')) return;
    await supabase.from('marcatori').delete().eq('partita_id', id);
    await supabase.from('presenze').delete().eq('partita_id', id);
    await supabase.from('partite').delete().eq('id', id);
    navigate('/calendario', { replace: true });
  };

  return (
    <div className="relative h-screen flex overflow-hidden bg-transparent">
      {/* HEADER */}
       <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 pt-3 pb-1 bg-transparent text-white">
        {/* Pulsante hamburger */}
        <button onClick={() => setDrawerOpen(true)} aria-label="Apri menu" className="mr-4">
          <Menu size={24} />
        </button>

 {/* Stelle su dettaglio partita */}
{matchDetail && (
  <>
    {/* Stella dorata piena */}
    <button
      onClick={() => navigate(`/partita/${matchDetail.params.id}/votazioni`)}
      aria-label="Vota Giocatori"
      className="mr-3 hover:scale-110 transition"
    >
      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
    </button>
  </>
)}




        {/* Titolo pagina */}
        <div className="flex-1 flex justify-center items-center relative">
  <h1 className="text-lg font-bold">{pageTitle}</h1>
  {matchGestione && gestioneData && gestioneOra && (
    <div className="absolute top-full mt-1 text-sm flex justify-center space-x-2">
      <span>{gestioneData}</span>
      <span>•</span>
      <span>{gestioneOra}</span>
    </div>
  )}
</div>

        {/* --- TUTTI I PULSANTI ADMIN/CREATOR INVARIATI --- */}
        {matchCalendario && (canAdmin || canCreator) && (
          <button
            onClick={() => navigate('/nuova-partita')}
            aria-label="Nuova Partita"
            className="ml-auto mr-4 hover:scale-105 transition"
          >
            <PlusCircle size={24} />
          </button>
        )}

        {matchRosa && (canAdmin || canCreator) && (
          <button
            onClick={() => navigate('/aggiungi-giocatore')}
            aria-label="Aggiungi Giocatore"
            className="ml-auto mr-4 hover:scale-105 transition"
          >
            <PlusCircle size={24} />
          </button>
        )}

        {matchTeamList && (canAdmin || canCreator) && (
          <button
            onClick={() => navigate('/squadre/nuova')}
            aria-label="Nuova Squadra"
            className="ml-auto mr-4 hover:scale-105 transition"
          >
            <PlusCircle size={24} />
          </button>
        )}

        {matchAllenamenti && (canAdmin || canCreator) && (
          <>
            <button
              onClick={() => navigate('/allenamenti/nuovo')}
              aria-label="Nuovo Allenamento"
              className="ml-auto mr-2 hover:scale-105 transition"
            >
              <PlusCircle size={24} />
            </button>
            <button
              onClick={() => navigate('/allenamenti/storico-allenamenti')}
              aria-label="Storico Allenamenti"
              className="mr-4 hover:scale-105 transition"
            >
              📜
            </button>
          </>
        )}

        {matchTornei && (canAdmin || canCreator) && (
          <button
            onClick={() => navigate('/tornei/nuovo/step1')}
            aria-label="Nuovo Torneo"
            className="ml-auto mr-4 hover:scale-105 transition"
          >
            <PlusCircle size={24} />
          </button>
        )}

        {matchTeamDetail && (canAdmin || canCreator) && (
          <>
            <button
              onClick={() => navigate(`/squadre/${matchTeamDetail.params.id}/edit`)}
              aria-label="Modifica Squadra"
              className="mx-2 hover:scale-105 transition"
            >
              <Edit2 size={24} />
            </button>
            <button
              onClick={handleTeamDelete}
              aria-label="Elimina Squadra"
              className="mx-2 hover:scale-105 transition text-red-400"
            >
              <Trash2 size={24} />
            </button>
          </>
        )}

        {matchPlayer && (canAdmin || canCreator) && (
          <>
            <button
              onClick={() => navigate(`/edit-giocatore/${matchPlayer.params.id}`)}
              aria-label="Modifica Giocatore"
              className="mx-2 hover:scale-105 transition"
            >
              <Edit2 size={24} />
            </button>
            <button
              onClick={handlePlayerDelete}
              aria-label="Elimina Giocatore"
              className="mx-2 hover:scale-105 transition text-red-400"
            >
              <Trash2 size={24} />
            </button>
          </>
        )}

        {matchPre && (canAdmin || canCreator) && (
          <>
            <button
              onClick={() => navigate(`/partita/${matchPre.params.id}/edit`)}
              aria-label="Modifica Pre-partita"
              className="mx-2 hover:scale-105 transition"
            >
              <Edit2 size={24} />
            </button>
            <button
              onClick={handlePreDelete}
              aria-label="Elimina Pre-partita"
              className="mx-2 hover:scale-105 transition text-red-400"
            >
              <Trash2 size={24} />
            </button>
          </>
        )}

        {matchDetail && (canAdmin || canCreator) && (
          <>
            <button
              onClick={() => navigate(`/modifica-partita-giocata/${matchDetail.params.id}`)}
              aria-label="Modifica Partita Giocata"
              className="mx-2 hover:scale-105 transition"
            >
              <Edit2 size={24} />
            </button>
            <button
              onClick={handleDetailDelete}
              aria-label="Elimina Partita Giocata"
              className="mx-2 hover:scale-105 transition text-red-400"
            >
              <Trash2 size={24} />
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event('capture-container'))}
              aria-label="Screenshot"
              className="mx-2 hover:scale-105 transition"
            >
              <Camera size={24} />
            </button>
          </>
        )}
      </header>

      {/* BACKDROP */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setDrawerOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-neutral-900/90 text-white z-40 pt-16 pb-4 transform transition-transform duration-300
  ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <nav className="flex flex-col h-full px-4 space-y-2 overflow-y-auto">
          {/* BRAND */}
          <div className="px-2 py-4">
            <div className="relative h-16 overflow-hidden">
              <div aria-hidden className="absolute inset-0 flex flex-col justify-center gap-[4px]">
                <div className="h-[2px] bg-red-600 rounded" />
                <div className="h-[2px] bg-red-600 rounded" />
                <div className="h-[2px] bg-red-600 rounded" />
              </div>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                <div className="text-[23px] md:text-3xl font-bold tracking-wide text-white drop-shadow">
                  Montecarlo 2013
                </div>
              </div>
            </div>
          </div>

          {[...group1, ...group2, ...group3, ...group4].map((link) => (
            <React.Fragment key={link.to}>
              <NavLink
  to={link.to}
  onClick={() => setDrawerOpen(false)}   // ✅ forza chiusura anche se stessa pagina
  className={({ isActive }) =>
    `block p-2 rounded ${isActive ? 'bg-white text-gray-800' : 'hover:bg-white/20'}`
  }
>
  {link.label}
</NavLink>

              {link.to === '/' && <hr className="border-t border-white/20 my-2" />}
              {link.to === '/prossima-partita' && <hr className="border-t border-white/20 my-2" />}
              {link.to === '/squadre' && <hr className="border-t border-white/20 my-2" />}
              {link.to === '/statistiche/giocatori' && <hr className="border-t border-white/20 my-2" />}
              {link.to === '/galleria' && <hr className="border-t border-white/20 my-2" />}
            </React.Fragment>
          ))}

          {/* Footer sidebar */}
          <div className="mt-auto pt-4 border-t border-white/20 px-2">
            {user ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigate('/profilo')}
                  className="text-sm underline hover:text-gray-200"
                >
                  {profileUsername || user.user_metadata?.username || user.email}
                </button>
                <button onClick={handleLogout} className="underline hover:text-gray-200 text-sm">
                  Logout
                </button>
              </div>
            ) : (
              <span className="text-sm">Accesso Pubblico</span>
            )}
          </div>
        </nav>
      </aside>

      {/* CONTENUTO PRINCIPALE */}
      <main className="w-full max-w-6xl mx-auto p-4 overflow-y-auto">
  <div className="mt-2">
    <Outlet />
  </div>
</main>
    </div>
  );
}
