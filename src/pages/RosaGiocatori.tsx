// src/pages/RosaGiocatori.tsx
// Data creazione chat: 2025-08-14

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';

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
  const { user } = useAuth();

  const canEdit =
    user?.app_metadata?.role === UserRole.Admin ||
    user?.app_metadata?.role === UserRole.Creator ||
    user?.user_metadata?.role === UserRole.Admin ||
    user?.user_metadata?.role === UserRole.Creator;

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
          .from('giocatori_stagioni_view')
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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        {/* Selettore stagione */}
        <div className="mb-4">
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-montecarlo-secondary focus:ring-2 focus:ring-montecarlo-secondary/20"
            value={stagioneSelezionata || ''}
            onChange={(e) => setStagioneSelezionata(e.target.value)}
          >
            {stagioni.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center text-montecarlo-secondary">Caricamento...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {giocatori.map((g) => (
              <div
                key={g.giocatore_uid}
                onClick={() => navigate(`/giocatore/${g.giocatore_uid}`)}
                className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-montecarlo-accent">
                    {g.foto_url ? (
                      <img
                        src={g.foto_url}
                        alt={`${g.cognome || ''} ${g.nome || ''}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-montecarlo-secondary flex items-center justify-center text-white font-bold">
                        {getInitial(g)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-montecarlo-secondary">
                      {g.cognome || ''} {g.nome || ''}
                    </h3>
                    {g.ruolo && (
                      <p className="text-sm text-gray-800">{g.ruolo}</p>

                    )}
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
