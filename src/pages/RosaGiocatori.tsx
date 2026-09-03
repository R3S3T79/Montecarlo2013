// src/pages/RosaGiocatori.tsx
// Data creazione chat: 2025-08-14 (rev: passaggio stagione a DettaglioGiocatore)

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';


interface Giocatore {
  giocatore_uid: string;
  nome: string | null;
  cognome: string | null;
  ruolo: string | null;
  foto_url: string | null;
}

interface Stagione {
  id: string;
  nome: string;
  data_inizio: string;
  data_fine: string;
}

export default function RosaGiocatori(): JSX.Element {
  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  
 

  // Carica stagioni e imposta quella corrente di default
  useEffect(() => {
    async function fetchStagioni() {
      const { data, error } = await supabase
        .from('stagioni')
        .select('id, nome, data_inizio, data_fine')
        .order('data_inizio', { ascending: false });

      if (!error && data) {
        setStagioni(data);

        const oggi = new Date().toISOString().split('T')[0];
        const stagioneCorrente = data.find(
          s => s.data_inizio <= oggi && s.data_fine >= oggi
        );
        setStagioneSelezionata(stagioneCorrente?.id || data[0]?.id || null);
      }
    }
    fetchStagioni();
  }, []);

  // Carica giocatori della stagione selezionata dalla nuova view
  useEffect(() => {
    async function fetchGiocatori() {
      if (!stagioneSelezionata) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v_stat_giocatore_stagione')
          .select('giocatore_uid, nome, cognome, ruolo, foto_url')
          .eq('stagione_id', stagioneSelezionata)
          .order('cognome', { ascending: true });

        if (!error && data) {
          setGiocatori(data as Giocatore[]);
        } else {
          setGiocatori([]);
        }
      } catch {
        setGiocatori([]);
      } finally {
        setLoading(false);
      }
    }
    fetchGiocatori();
  }, [stagioneSelezionata]);

  const getInitial = (g: Giocatore): string => {
    const testo = g.cognome?.trim() || g.nome?.trim() || '';
    return testo.charAt(0).toUpperCase() || '?';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b]">
      <div className="w-full px-3 pt-3 pb-8 box-border">

        {/* 1. Selettore stagione */}
        <div className="mb-5">
          <select
            className="w-full rounded-xl border border-red-600/60 bg-[#242424] px-4 py-3 text-sm font-semibold text-white shadow-lg outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-600/30"
            value={stagioneSelezionata || ''}
            onChange={(e) => setStagioneSelezionata(e.target.value)}
          >
            {stagioni.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#242424] text-white">
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Elenco giocatori */}
        {loading ? (
          <div className="py-8 text-center font-semibold text-red-500">
            Caricamento...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {giocatori.map((g) => (
              <div
                key={g.giocatore_uid}
                onClick={() =>
                  navigate(`/giocatore/${g.giocatore_uid}`, {
                    state: { stagioneId: stagioneSelezionata } // 🔹 passaggio stagione
                  })
                }
                className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-r from-white via-[#f8f8f8] to-[#ededed] shadow-[0_6px_18px_rgba(0,0,0,0.35)] cursor-pointer transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_9px_24px_rgba(0,0,0,0.45)]"
              >
                <div className="absolute left-0 top-0 h-full w-[4px] bg-red-600" />

                <div className="flex min-h-[96px] items-center px-4 py-3">
                  <div className="flex shrink-0 items-center">
                    <div className="h-[72px] w-[72px] overflow-hidden rounded-full border-[3px] border-red-600 bg-gray-300 shadow-md">
                      {g.foto_url ? (
                        <img
                          src={g.foto_url}
                          alt={`${g.cognome || ''} ${g.nome || ''}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#2b2b2b] text-xl font-bold text-white">
                          {getInitial(g)}
                        </div>
                      )}
                    </div>

                    <div className="ml-4 h-14 w-px bg-gray-300" />
                  </div>

                  <div className="min-w-0 flex-1 px-4">
                    <h3 className="truncate text-[17px] font-extrabold uppercase leading-tight tracking-wide">
                      <span className="text-red-600">
                        {g.cognome || ''}
                      </span>
                      {g.nome && (
                        <span className="ml-2 text-[#222222]">
                          {g.nome}
                        </span>
                      )}
                    </h3>

                    {g.ruolo && (
                      <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                        {g.ruolo}
                      </p>
                    )}
                  </div>

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white/80 text-red-600 shadow-sm transition group-hover:border-red-500 group-hover:bg-red-50">
                    <span className="text-2xl font-light leading-none">›</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}