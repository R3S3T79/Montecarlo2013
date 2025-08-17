// src/pages/AllenamentiNuovo.tsx
// Data creazione chat: 2025-08-10

import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { UserRole } from '../lib/roles';

interface Giocatore {
  id: string;      // sarà l'id reale del giocatore
  nome: string;
  cognome: string;
}

interface Stagione {
  id: string;
  nome: string;
  data_inizio: string;
  data_fine: string;
}

export default function AllenamentiNuovo(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('data');
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(dateParam ?? today);

  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  if (role !== UserRole.Admin && role !== UserRole.Creator) {
    return <Navigate to="/" replace />;
  }

  const [players, setPlayers] = useState<Giocatore[]>([]);
  const [selections, setSelections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const [seasons, setSeasons] = useState<Stagione[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");

  const weekdays = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const selectedDayName = weekdays[new Date(date).getDay()];

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('stagioni')
        .select('id, nome, data_inizio, data_fine')
        .order('data_inizio', { ascending: false });

      if (error || !data) {
        console.error('Errore caricamento stagioni:', error);
        return;
      }

      setSeasons(data);

      const oggi = new Date().toISOString().split('T')[0];
      const attiva = data.find(s => s.data_inizio <= oggi && s.data_fine >= oggi);
      setSelectedSeasonId(attiva ? attiva.id : data[0]?.id ?? "");
    })();
  }, []);

  useEffect(() => {
    async function load() {
      if (!selectedSeasonId) return;
      setLoading(true);

      // Uso della view con id reale del giocatore
      const { data: gsData, error: gsError } = await supabase
        .from('v_giocatori_stagioni')
        .select('giocatore_id, nome, cognome')
        .eq('stagione_id', selectedSeasonId)
        .order('cognome', { ascending: true });

      if (gsError || !gsData) {
        console.error('Errore fetch v_giocatori_stagioni:', gsError);
        setPlayers([]);
        setSelections({});
        setLoading(false);
        return;
      }

      const list = gsData.map(r => ({
        id: r.giocatore_id,   // id vero della tabella giocatori
        nome: r.nome,
        cognome: r.cognome
      }));
      setPlayers(list);

      const initSel: Record<string, boolean> = {};
      list.forEach(p => { initSel[p.id] = false });

      setSelections(initSel);
      setLoading(false);
    }
    load();
  }, [selectedSeasonId]);

  const togglePresenza = (id: string, presente: boolean) => {
    setSelections(prev => ({ ...prev, [id]: presente }));
  };

  const handleSave = async () => {
    const records = players.map(p => ({
      giocatore_uid: p.id,   // colonna corretta della tabella allenamenti
      data_allenamento: date,
      presente: selections[p.id] === true,
      stagione_id: selectedSeasonId
    }));

    const { error } = await supabase.from('allenamenti').insert(records);
    if (error) {
      console.error('Salvataggio fallito', error);
      alert('Errore durante il salvataggio.');
    } else {
      navigate('/allenamenti');
    }
  };

  if (loading) {
    return <div className="min-h-screen">Caricamento…</div>;
  }

  return (
    <div className="min-h-screen px-4">
      {/* Selettore giorno, data e stagione */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center space-x-4">
          <span className="text-lg text-white font-semibold">{selectedDayName}</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-md bg-white border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <select
            value={selectedSeasonId}
            onChange={e => setSelectedSeasonId(e.target.value)}
            className="rounded-md bg-white border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {seasons.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista giocatori */}
      <ul className="divide-y divide-gray-200 mb-6">
        {players.map(p => {
          const isPresente = selections[p.id];
          return (
            <li key={p.id} className="flex items-center justify-between py-3 pr-2">
              <span className="text-lg text-white pl-3">
                {p.cognome} {p.nome}
              </span>
              {/* Pulsanti verticali */}
              <div className="flex flex-col space-y-2 pr-2">
                <button
                  onClick={() => togglePresenza(p.id, true)}
                  className={`px-4 py-1 rounded ${
                    isPresente
                      ? 'bg-green-600 text-white'
                      : 'bg-green-200 text-green-800'
                  }`}
                >
                  Presente
                </button>
                <button
                  onClick={() => togglePresenza(p.id, false)}
                  className={`px-4 py-1 rounded ${
                    !isPresente
                      ? 'bg-red-600 text-white'
                      : 'bg-red-200 text-red-800'
                  }`}
                >
                  Assente
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Azioni */}
      <div className="flex justify-center space-x-6">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 border border-black-400 rounded-lg text-white hover:bg-gray-100 transition"
        >
          Annulla
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 transition"
        >
          Salva
        </button>
      </div>
    </div>
  );
}
