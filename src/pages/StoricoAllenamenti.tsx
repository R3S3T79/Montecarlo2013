// src/pages/StoricoAllenamenti.tsx
// Data creazione chat: 2025-08-01  

import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { UserRole } from '../lib/roles';

interface PlayerRecord {
  record_id: string;    // PK di giocatori_stagioni (id della view riga stagione-giocatore)
  giocatore_id: string; // vero ID del giocatore (giocatori.id)
  nome: string;
  cognome: string;
  presente: boolean;
}

export default function StoricoAllenamenti(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  if (role !== UserRole.Admin && role !== UserRole.Creator) {
    return <Navigate to="/" replace />;
  }

  const [dates, setDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Carica tutte le date allenamenti
  useEffect(() => {
    (async () => {
      setLoadingDates(true);
      const { data, error } = await supabase
        .from('allenamenti')
        .select('data_allenamento')
        .order('data_allenamento', { ascending: false });
      if (!error && data) {
        const uniq = Array.from(
          new Set(data.map(r => r.data_allenamento.slice(0, 10)))
        );
        setDates(uniq);
      }
      setLoadingDates(false);
    })();
  }, []);

  // Carica i giocatori della data selezionata
  useEffect(() => {
    if (!selectedDate) return;

    (async () => {
      setLoadingPlayers(true);

      // 1) Trova la stagione che include la selectedDate (per usare la view correttamente)
      const { data: stagione, error: errSt } = await supabase
        .from('stagioni')
        .select('id, data_inizio, data_fine')
        .lte('data_inizio', selectedDate)
        .gte('data_fine', selectedDate)
        .single();

      if (errSt || !stagione) {
        console.error('Stagione non trovata per la data selezionata:', errSt);
        setPlayers([]);
        setLoadingPlayers(false);
        return;
      }

      // 2) Leggi gli allenamenti del giorno (NB: colonna corretta: giocatore_uid)
      const { data: allens, error: errA } = await supabase
        .from('allenamenti')
        .select('giocatore_uid, presente')
        .gte('data_allenamento', `${selectedDate}T00:00:00`)
        .lte('data_allenamento', `${selectedDate}T23:59:59`);

      if (errA || !allens) {
        console.error('Errore fetch allenamenti:', errA);
        setPlayers([]);
        setLoadingPlayers(false);
        return;
      }

      const giocatoreUids = Array.from(new Set(allens.map(a => a.giocatore_uid))).filter(Boolean) as string[];
      if (giocatoreUids.length === 0) {
        setPlayers([]);
        setLoadingPlayers(false);
        return;
      }

      // 3) Recupera nome/cognome e record_id stagione dalla view (filtrando per stagione e giocatori)
      const { data: gs, error: errGs } = await supabase
        .from('v_giocatori_stagioni')
        .select('id, giocatore_id, nome, cognome')
        .eq('stagione_id', stagione.id)
        .in('giocatore_id', giocatoreUids);

      if (errGs || !gs) {
        console.error('Errore fetch v_giocatori_stagioni:', errGs);
        setPlayers([]);
        setLoadingPlayers(false);
        return;
      }

      gs.sort((a, b) => (a.cognome ?? '').localeCompare(b.cognome ?? ''));

      // 4) Mappa presenze per giocatore_uid
      const presenceMap = allens.reduce<Record<string, boolean>>((acc, cur) => {
        if (cur.giocatore_uid) acc[cur.giocatore_uid] = !!cur.presente;
        return acc;
      }, {});

      setPlayers(
        gs.map((r: any) => ({
          record_id: r.id,               // id riga stagione-giocatore (dalla view)
          giocatore_id: r.giocatore_id,  // vero id giocatore
          nome: r.nome,
          cognome: r.cognome,
          presente: presenceMap[r.giocatore_id] ?? false,
        }))
      );
      setLoadingPlayers(false);
    })();
  }, [selectedDate]);

  const onDateClick = (date: string) => setSelectedDate(date);
  const onPlayerClick = (playerId: string) =>
    navigate(`/allenamenti/${playerId}`);

  if (loadingDates) {
    return <div className="p-6 text-center">Caricamento…</div>;
  }

  if (selectedDate) {
    const dt = new Date(selectedDate);
    const weekday = dt.toLocaleDateString('it-IT', { weekday: 'long' });
    const dayName = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const displayDate = dt.toLocaleDateString('it-IT');

    return (
      <div className="min-h-screen px-2">
        <h2 className="text-2xl font-semibold mb-4 text-white">
          {dayName}, {displayDate}
        </h2>

        {loadingPlayers ? (
          <div>Caricamento elenco giocatori…</div>
        ) : players.length === 0 ? (
          <div>Nessun allenamento registrato per questa data.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {players.map(p => (
              <li
                key={p.record_id}
                className="py-3 flex justify-between hover:bg-gray-100 cursor-pointer"
                onClick={() => onPlayerClick(p.giocatore_id)}
              >
                <span className="font-medium text-lg text-white">
                  {p.cognome} {p.nome}
                </span>
                <span
  className={`px-2 py-1 rounded bg-white/80 ${
    p.presente ? "text-green-600" : "text-red-600"
  } font-semibold`}
>
  {p.presente ? "Presente" : "Assente"}
</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4">
      {dates.length === 0 ? (
        <div>Nessuna seduta registrata.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {dates.map(date => {
            const dt = new Date(date);
            const weekday = dt.toLocaleDateString('it-IT', { weekday: 'long' });
            const dayName =
              weekday.charAt(0).toUpperCase() + weekday.slice(1);
            const displayDate = dt.toLocaleDateString('it-IT');
            return (
              <li
                key={date}
                className="flex items-center justify-between py-2 hover:bg-gray-100"
              >
                <span
                  className="cursor-pointer text-lg font-semibold text-white"
                  onClick={() => onDateClick(date)}
                >
                  {dayName}, {displayDate}
                </span>
                <button
                  onClick={async () => {
                    if (
                      confirm(`Eliminare tutte le sedute del ${displayDate}?`)
                    ) {
                      await supabase
                        .from('allenamenti')
                        .delete()
                        .gte('data_allenamento', `${date}T00:00:00`)
                        .lte('data_allenamento', `${date}T23:59:59`);
                      setDates(dates.filter(d => d !== date));
                    }
                  }}
                  className="text-red-600 hover:underline"
                >
                  Elimina
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
