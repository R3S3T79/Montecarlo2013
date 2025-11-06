// src/pages/StatisticheSquadra.tsx
// Data creazione chat: 2025-08-10 — Rev3: aggiunti colori dinamici per vittorie/pareggi/sconfitte/gol fatti/subiti

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Stagione {
  id: string;
  nome: string;
}

interface PartitaEstesa {
  id: string;
  squadra_casa_id: string;
  squadra_ospite_id: string;
  goal_a: number;
  goal_b: number;
  casa: { nome: string };
  ospite: { nome: string };
}

interface StatistichePartite {
  totali: {
    giocate: number;
    vittorie: number;
    pareggi: number;
    sconfitte: number;
    gol_fatti: number;
    gol_subiti: number;
  };
  casa: {
    giocate: number;
    vittorie: number;
    pareggi: number;
    sconfitte: number;
    gol_fatti: number;
    gol_subiti: number;
  };
  trasferta: {
    giocate: number;
    vittorie: number;
    pareggi: number;
    sconfitte: number;
    gol_fatti: number;
    gol_subiti: number;
  };
}

export default function StatisticheSquadra() {
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>('');
  const [filtroCompetizione, setFiltroCompetizione] = useState<string>('Tutte');
  const [statistiche, setStatistiche] = useState<StatistichePartite | null>(null);
  const [matchMaxFatti, setMatchMaxFatti] = useState<PartitaEstesa | null>(null);
  const [matchMaxSubiti, setMatchMaxSubiti] = useState<PartitaEstesa | null>(null);
  const [matchMaxDifferenza, setMatchMaxDifferenza] = useState<PartitaEstesa | null>(null);
  const [loading, setLoading] = useState(true);
  const [montecarloId, setMontecarloId] = useState<string>('');

  useEffect(() => {
    async function fetchInitialData() {
      const { data: stagioniData } = await supabase
        .from('stagioni')
        .select('id, nome')
        .order('data_inizio', { ascending: false });

      if (stagioniData && stagioniData.length > 0) {
        setStagioni(stagioniData);
        setStagioneSelezionata(stagioniData[0].id);
      }

      const { data: squadra } = await supabase
        .from('squadre')
        .select('id')
        .eq('nome', 'Montecarlo')
        .single();

      if (squadra) setMontecarloId(squadra.id);
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    async function fetchStatistiche() {
      if (!stagioneSelezionata || !montecarloId) return;

      setLoading(true);
      try {
        let query = supabase
          .from('partite')
          .select(`
            id,
            squadra_casa_id,
            squadra_ospite_id,
            goal_a,
            goal_b,
            campionato_torneo,
            casa:squadra_casa_id(nome),
            ospite:squadra_ospite_id(nome)
          `)
          .eq('stato', 'Giocata')
          .eq('stagione_id', stagioneSelezionata)
          .neq('campionato_torneo', 'Allenamento');

        if (filtroCompetizione !== 'Tutte') {
          query = query.eq('campionato_torneo', filtroCompetizione);
        }

        const { data: partite, error } = await query;

        if (!partite || error) {
          setStatistiche(null);
          setMatchMaxFatti(null);
          setMatchMaxSubiti(null);
          setMatchMaxDifferenza(null);
          return;
        }

        const tot = { giocate: 0, vittorie: 0, pareggi: 0, sconfitte: 0, gol_fatti: 0, gol_subiti: 0 };
        const casa = { ...tot };
        const trasf = { ...tot };

        let maxF: PartitaEstesa | null = null;
        let maxS: PartitaEstesa | null = null;
        let maxD: PartitaEstesa | null = null;

        partite.forEach(p => {
          const èCasa = p.squadra_casa_id === montecarloId;
          const goalFatti = èCasa ? p.goal_a : p.goal_b;
          const goalSubiti = èCasa ? p.goal_b : p.goal_a;

          tot.giocate++;
          tot.gol_fatti += goalFatti;
          tot.gol_subiti += goalSubiti;
          if (goalFatti > goalSubiti) tot.vittorie++;
          else if (goalFatti === goalSubiti) tot.pareggi++;
          else tot.sconfitte++;

          if (èCasa) {
            casa.giocate++;
            casa.gol_fatti += goalFatti;
            casa.gol_subiti += goalSubiti;
            if (goalFatti > goalSubiti) casa.vittorie++;
            else if (goalFatti === goalSubiti) casa.pareggi++;
            else casa.sconfitte++;
          } else {
            trasf.giocate++;
            trasf.gol_fatti += goalFatti;
            trasf.gol_subiti += goalSubiti;
            if (goalFatti > goalSubiti) trasf.vittorie++;
            else if (goalFatti === goalSubiti) trasf.pareggi++;
            else trasf.sconfitte++;
          }

          if (!maxF || goalFatti > (maxF.squadra_casa_id === montecarloId ? maxF.goal_a : maxF.goal_b)) maxF = p;
          if (!maxS || goalSubiti > (maxS.squadra_casa_id === montecarloId ? maxS.goal_b : maxS.goal_a)) maxS = p;
          if (!maxD || Math.abs(goalFatti - goalSubiti) > Math.abs((maxD.squadra_casa_id === montecarloId ? maxD.goal_a : maxD.goal_b) - (maxD.squadra_casa_id === montecarloId ? maxD.goal_b : maxD.goal_a))) maxD = p;
        });

        setStatistiche({ totali: tot, casa, trasferta: trasf });
        setMatchMaxFatti(maxF);
        setMatchMaxSubiti(maxS);
        setMatchMaxDifferenza(maxD);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchStatistiche();
  }, [stagioneSelezionata, filtroCompetizione, montecarloId]);

  return (
    <div className="min-h-screen w-full px-[2px] box-border">
      <div className="w-full flex flex-col md:flex-row gap-6">
        <div className="bg-white/90 rounded-xl shadow-montecarlo flex-1 p-6 md:p-8">
          <select
            value={stagioneSelezionata}
            onChange={e => setStagioneSelezionata(e.target.value)}
            className="w-full mb-3 border-2 border-montecarlo-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-montecarlo-secondary/40"
          >
            {stagioni.map(s => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>

          <select
            value={filtroCompetizione}
            onChange={e => setFiltroCompetizione(e.target.value)}
            className="w-full mb-6 border-2 border-montecarlo-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-montecarlo-secondary/40"
          >
            <option value="Tutte">Tutte le Competizioni</option>
            <option value="Campionato">Campionato</option>
            <option value="Torneo">Tornei</option>
            <option value="Amichevole">Amichevoli</option>
          </select>

          {loading ? (
            <div className="text-center text-montecarlo-secondary">Caricamento statistiche…</div>
          ) : !statistiche ? (
            <div className="text-center text-montecarlo-neutral">Nessuna statistica disponibile</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-montecarlo-red-600 text-white">
                  <tr>
                    <th className="px-4 py-2 text-left">Statistiche</th>
                    <th className="px-4 py-2 text-center">Totale</th>
                    <th className="px-4 py-2 text-center">Casa</th>
                    <th className="px-4 py-2 text-center">Trasf.</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900">
                  <tr className="border-t border-montecarlo-red-600">
                    <td className="px-4 py-2">Giocate</td>
                    <td className="text-center">{statistiche.totali.giocate}</td>
                    <td className="text-center">{statistiche.casa.giocate}</td>
                    <td className="text-center">{statistiche.trasferta.giocate}</td>
                  </tr>
                  <tr className="border-t border-montecarlo-red-600 text-green-600 font-semibold">
                    <td className="px-4 py-2">Vittorie</td>
                    <td className="text-center">{statistiche.totali.vittorie}</td>
                    <td className="text-center">{statistiche.casa.vittorie}</td>
                    <td className="text-center">{statistiche.trasferta.vittorie}</td>
                  </tr>
                  <tr className="border-t border-montecarlo-red-600 text-gray-500 font-semibold">
                    <td className="px-4 py-2">Pareggi</td>
                    <td className="text-center">{statistiche.totali.pareggi}</td>
                    <td className="text-center">{statistiche.casa.pareggi}</td>
                    <td className="text-center">{statistiche.trasferta.pareggi}</td>
                  </tr>
                  <tr className="border-t border-montecarlo-red-600 text-red-600 font-semibold">
                    <td className="px-4 py-2">Sconfitte</td>
                    <td className="text-center">{statistiche.totali.sconfitte}</td>
                    <td className="text-center">{statistiche.casa.sconfitte}</td>
                    <td className="text-center">{statistiche.trasferta.sconfitte}</td>
                  </tr>
                  <tr className="border-t border-montecarlo-red-600 text-green-600 font-semibold">
                    <td className="px-4 py-2">Gol fatti</td>
                    <td className="text-center">{statistiche.totali.gol_fatti}</td>
                    <td className="text-center">{statistiche.casa.gol_fatti}</td>
                    <td className="text-center">{statistiche.trasferta.gol_fatti}</td>
                  </tr>
                  <tr className="border-t border-montecarlo-red-600 text-red-600 font-semibold">
                    <td className="px-4 py-2">Gol subiti</td>
                    <td className="text-center">{statistiche.totali.gol_subiti}</td>
                    <td className="text-center">{statistiche.casa.gol_subiti}</td>
                    <td className="text-center">{statistiche.trasferta.gol_subiti}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex-1 md:w-1/3 space-y-4">
          {matchMaxFatti && (
            <div className="bg-white/90 p-4 md:p-6 rounded-xl shadow-montecarlo">
              <h3 className="font-semibold text-montecarlo-secondary mb-1">Massimo Gol Fatti</h3>
              <p className="text-gray-900">
                {matchMaxFatti.casa.nome} {matchMaxFatti.goal_a} - {matchMaxFatti.goal_b} {matchMaxFatti.ospite.nome}
              </p>
            </div>
          )}
          {matchMaxSubiti && (
            <div className="bg-white/90 p-4 md:p-6 rounded-xl shadow-montecarlo">
              <h3 className="font-semibold text-montecarlo-secondary mb-1">Massimo Gol Subiti</h3>
              <p className="text-gray-900">
                {matchMaxSubiti.casa.nome} {matchMaxSubiti.goal_a} - {matchMaxSubiti.goal_b} {matchMaxSubiti.ospite.nome}
              </p>
            </div>
          )}
          {matchMaxDifferenza && (
            <div className="bg-white/90 p-4 md:p-6 rounded-xl shadow-montecarlo">
              <h3 className="font-semibold text-montecarlo-secondary mb-1">Maggior Differenza Reti</h3>
              <p className="text-gray-900">
                {matchMaxDifferenza.casa.nome} {matchMaxDifferenza.goal_a} - {matchMaxDifferenza.goal_b} {matchMaxDifferenza.ospite.nome}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
