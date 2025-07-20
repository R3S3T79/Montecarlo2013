// src/pages/StatisticheGiocatori.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Giocatore, Marcatori, Presenze, Stagioni } from '../types/database';

interface Stagione {
  id: string;
  nome: string;
}

interface StatisticheGiocatore {
  id: string;
  nome: string;
  cognome: string;
  presenze: number;
  gol: number;
  media_gol: number;
}

interface TopScorer {
  giocatore_id: string;
  partita_id: string;
  gol_count: number;
  cognome: string;
  nome: string;
  // aggiungere altri dettagli se serve
}

export default function StatisticheGiocatori(): JSX.Element {
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>('');
  const [statistiche, setStatistiche] = useState<StatisticheGiocatore[]>([]);
  const [topScorer, setTopScorer] = useState<TopScorer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Carica le stagioni disponibili
    const fetchStagioni = async () => {
      const { data } = await supabase
        .from<Stagioni>('stagioni')
        .select('id, nome')
        .order('data_inizio', { ascending: false });
      setStagioni(data || []);
    };
    fetchStagioni();
  }, []);

  useEffect(() => {
    if (!user || authLoading) return;
    const fetchStatistiche = async () => {
      setLoading(true);
      try {
        const stagioneId = stagioneSelezionata || undefined;

        // 1. Carica tutti i giocatori
        const { data: giocatoriData, error: giocatoriErr } = await supabase
          .from<Giocatore>('giocatori')
          .select('id, nome, cognome')
          .order('cognome');
        if (giocatoriErr) throw giocatoriErr;
        const giocatori = giocatoriData || [];

        // 2. Carica marcatori (filtra per stagione se specificata)
        let marcatoriQuery = supabase
          .from<Marcatori>('marcatori')
          .select('giocatore_id, partita_id');
        if (stagioneId) {
          marcatoriQuery = marcatoriQuery.eq('stagione_id', stagioneId);
        }
        if (stagioneId) {
          marcatoriQuery = marcatoriQuery.eq('stagione_id', stagioneId);
        }
        const { data: marcatoriData, error: marcatoriErr } = await marcatoriQuery;
        if (marcatoriErr) throw marcatoriErr;
        const marcatori = marcatoriData || [];

        // 3. Carica presenze (filtra per stagione se specificata)
        let presenzeQuery = supabase
          .from<Presenze>('presenze')
          .select('giocatore_id, partita_id');
        if (stagioneId) {
          presenzeQuery = presenzeQuery.eq('stagione_id', stagioneId);
        }
        if (stagioneId) {
          presenzeQuery = presenzeQuery.eq('stagione_id', stagioneId);
        }
        const { data: presenzeData, error: presenzeErr } = await presenzeQuery;
        if (presenzeErr) throw presenzeErr;
        const presenze = presenzeData || [];

        // Calcola statistiche per ogni giocatore
        const stats = giocatori.map(g => {
          const golCount = marcatori.filter(m => m.giocatore_id === g.id).length;
          const presCount = presenze.filter(p => p.giocatore_id === g.id).length;
          return {
            id: g.id,
            nome: g.nome,
            cognome: g.cognome,
            gol: golCount,
            presenze: presCount,
            media_gol: presCount ? golCount / presCount : 0,
          };
        });

        // Trova il top scorer in una singola partita
        let best: TopScorer | null = null;
        const countMap = new Map<string, { giocatore_id: string; partita_id: string; count: number }>();
        marcatori.forEach(m => {
          const key = `${m.giocatore_id}-${m.partita_id}`;
          const prev = countMap.get(key);
          if (prev) {
            prev.count += 1;
          } else {
            countMap.set(key, { giocatore_id: m.giocatore_id, partita_id: m.partita_id, count: 1 });
          }
        });
        countMap.forEach(item => {
          if (!best || item.count > best.gol_count) {
            const gioc = giocatori.find(g => g.id === item.giocatore_id);
            best = {
              giocatore_id: item.giocatore_id,
              partita_id: item.partita_id,
              gol_count: item.count,
              nome: gioc?.nome || '',
              cognome: gioc?.cognome || '',
            };
          }
        });

        setStatistiche(stats);
        setTopScorer(best);
      } catch (err) {
        console.error('Errore fetch statistiche:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatistiche();
  }, [user, authLoading, stagioneSelezionata]);

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-6">
        {/* Header ridotto e spostato */}
        <div className="relative mt-4 mb-4">
          <div className="bg-white rounded-xl shadow-montecarlo p-2">
            <h2 className="text-lg font-bold text-montecarlo-secondary text-center">
              Statistiche Giocatori
            </h2>
          </div>
        </div>

        {/* Selettore Stagione ridotto */}
        <div className="relative mb-4">
          <div className="bg-white rounded-lg shadow-montecarlo p-2">
            <select
              value={stagioneSelezionata}
              onChange={e => setStagioneSelezionata(e.target.value)}
              className="w-full border-2 border-montecarlo-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-montecarlo-secondary focus:ring-2 focus:ring-montecarlo-secondary/20"
            >
              <option value="">Stagione</option>
              {stagioni.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
            Caricamento statistiche...
          </div>
        ) : (
          <>
            {/* Top Scorer */}
            {topScorer && (
              <div className="bg-gradient-montecarlo rounded-lg shadow-montecarlo p-4 mb-6 text-white">
                <h3 className="font-semibold mb-2">Miglior Marcatore</h3>
                <p>
                  {topScorer.cognome} {topScorer.nome} ha segnato{' '}
                  <span className="font-bold text-yellow-300">{topScorer.gol_count}</span> gol in una partita
                </p>
              </div>
            )}

            {/* Tabella Statistiche Dettagliate */}
            <div className="bg-white rounded-lg shadow-montecarlo overflow-hidden">
              <div className="bg-gradient-montecarlo text-white p-2">
                <h4 className="font-semibold">Dettaglio Statistiche</h4>
              </div>
              <table className="min-w-full divide-y divide-montecarlo-gray-200">
                <thead className="bg-montecarlo-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-montecarlo-secondary uppercase">Giocatore</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-montecarlo-secondary uppercase">Gol</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-montecarlo-secondary uppercase">Presenze</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-montecarlo-secondary uppercase">Media</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-montecarlo-gray-100">
                  {statistiche.map(stat => (
                    <tr key={stat.id} onClick={() => navigate(`/giocatore/${stat.id}`)} className="hover:bg-montecarlo-gray-50 cursor-pointer">
                      <td className="px-3 py-2 text-sm text-montecarlo-secondary">
                        {stat.cognome} {stat.nome}
                      </td>
                      <td className="px-3 py-2 text-center text-sm font-bold text-montecarlo-secondary">
                        {stat.gol}
                      </td>
                      <td className="px-3 py-2 text-center text-sm font-bold text-montecarlo-secondary">
                        {stat.presenze}
                      </td>
                      <td className="px-3 py-2 text-center text-sm font-bold text-montecarlo-secondary">
                        {stat.media_gol.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
