// src/pages/StatisticheSquadra.tsx

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

const MONTECARLO_ID = '5bca3e07-974a-4d12-9208-d85975906fe4';

export default function StatisticheSquadra() {
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>('');
  const [statistiche, setStatistiche] = useState<StatistichePartite | null>(null);
  const [matchMaxFatti, setMatchMaxFatti] = useState<PartitaEstesa | null>(null);
  const [matchMaxSubiti, setMatchMaxSubiti] = useState<PartitaEstesa | null>(null);
  const [matchMaxDifferenza, setMatchMaxDifferenza] = useState<PartitaEstesa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStagioni = async () => {
      const { data } = await supabase
        .from('stagioni')
        .select('id, nome')
        .order('data_inizio', { ascending: false });
      if (data) setStagioni(data);
    };
    fetchStagioni();
  }, []);

  useEffect(() => {
    const fetchStatistiche = async () => {
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
            casa:squadra_casa_id(nome),
            ospite:squadra_ospite_id(nome)
          `)
          .eq('stato', 'Giocata');

        if (stagioneSelezionata) {
          query = query.eq('stagione_id', stagioneSelezionata);
        }

        const { data: partite, error } = await query;
        if (error || !partite) {
          setStatistiche(null);
          setMatchMaxFatti(null);
          setMatchMaxSubiti(null);
          setMatchMaxDifferenza(null);
          setLoading(false);
          return;
        }

        const stats: StatistichePartite = {
          totali: { giocate: 0, vittorie: 0, pareggi: 0, sconfitte: 0, gol_fatti: 0, gol_subiti: 0 },
          casa: { giocate: 0, vittorie: 0, pareggi: 0, sconfitte: 0, gol_fatti: 0, gol_subiti: 0 },
          trasferta: { giocate: 0, vittorie: 0, pareggi: 0, sconfitte: 0, gol_fatti: 0, gol_subiti: 0 }
        };

        let maxFatti = -1, maxSubiti = -1, maxDiff = -1;
        let partitaMaxFatti = null, partitaMaxSubiti = null, partitaMaxDiff = null;

        partite.forEach((p: PartitaEstesa) => {
          const isCasa = p.squadra_casa_id === MONTECARLO_ID;
          const isTrasferta = p.squadra_ospite_id === MONTECARLO_ID;
          if (!isCasa && !isTrasferta) return;

          const fatti = isCasa ? p.goal_a : p.goal_b;
          const subiti = isCasa ? p.goal_b : p.goal_a;
          const tipo = isCasa ? 'casa' : 'trasferta';

          stats[tipo].giocate++;
          stats[tipo].gol_fatti += fatti;
          stats[tipo].gol_subiti += subiti;
          if (fatti > subiti) stats[tipo].vittorie++;
          else if (fatti < subiti) stats[tipo].sconfitte++;
          else stats[tipo].pareggi++;

          stats.totali.giocate++;
          stats.totali.gol_fatti += fatti;
          stats.totali.gol_subiti += subiti;
          if (fatti > subiti) stats.totali.vittorie++;
          else if (fatti < subiti) stats.totali.sconfitte++;
          else stats.totali.pareggi++;

          if (fatti > maxFatti) { maxFatti = fatti; partitaMaxFatti = p; }
          if (subiti > maxSubiti) { maxSubiti = subiti; partitaMaxSubiti = p; }
          const diff = Math.abs(fatti - subiti);
          if (diff > maxDiff) { maxDiff = diff; partitaMaxDiff = p; }
        });

        setStatistiche(stats);
        setMatchMaxFatti(partitaMaxFatti);
        setMatchMaxSubiti(partitaMaxSubiti);
        setMatchMaxDifferenza(partitaMaxDiff);
      } catch (err) {
        console.error('Errore:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatistiche();
  }, [stagioneSelezionata]);

  const StatisticheBox = ({ title, stats }: { title: string; stats: any }) => {
    const mediaFatti = stats.giocate ? (stats.gol_fatti / stats.giocate).toFixed(2) : '0.00';
    const mediaSubiti = stats.giocate ? (stats.gol_subiti / stats.giocate).toFixed(2) : '0.00';

    return (
      <div className="bg-white rounded-xl shadow-montecarlo p-6">
        <h3 className="text-lg font-semibold mb-4 text-montecarlo-secondary">{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-sm text-montecarlo-neutral">Giocate</p><p className="text-xl font-bold">{stats.giocate}</p></div>
          <div><p className="text-sm text-montecarlo-neutral">Vittorie</p><p className="text-xl font-bold text-green-600">{stats.vittorie}</p></div>
          <div><p className="text-sm text-montecarlo-neutral">Pareggi</p><p className="text-xl font-bold text-yellow-600">{stats.pareggi}</p></div>
          <div><p className="text-sm text-montecarlo-neutral">Sconfitte</p><p className="text-xl font-bold text-red-600">{stats.sconfitte}</p></div>
          <div><p className="text-sm text-montecarlo-neutral">Gol fatti</p><p className="text-xl font-bold">{stats.gol_fatti}</p><p className="text-sm text-gray-400">Media: {mediaFatti}</p></div>
          <div><p className="text-sm text-montecarlo-neutral">Gol subiti</p><p className="text-xl font-bold">{stats.gol_subiti}</p><p className="text-sm text-gray-400">Media: {mediaSubiti}</p></div>
        </div>
      </div>
    );
  };

  const MatchCard = ({ partita, label }: { partita: PartitaEstesa; label: string }) => {
    const isCasa = partita.squadra_casa_id === MONTECARLO_ID;
    const fatti = isCasa ? partita.goal_a : partita.goal_b;
    const subiti = isCasa ? partita.goal_b : partita.goal_a;
    const avversario = isCasa ? partita.ospite.nome : partita.casa.nome;
    return (
      <div className="bg-white rounded-xl shadow-montecarlo p-4">
        <h4 className="text-base font-semibold text-montecarlo-secondary mb-2">{label}</h4>
        <p className="text-sm text-montecarlo-neutral">
          <span className="font-medium">Avversario:</span> {avversario} ({isCasa ? 'Casa' : 'Trasferta'})
        </p>
        <p className="text-sm text-montecarlo-neutral">
          <span className="font-medium">Risultato:</span> {isCasa ? `Montecarlo ${fatti} - ${subiti} ${avversario}` : `${avversario} ${subiti} - ${fatti} Montecarlo`}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-montecarlo p-2 text-center">
            <h2 className="text-lg font-bold text-montecarlo-secondary">Statistiche Squadra</h2>
          </div>
        </div>

        <div className="mb-6">
          <select
            value={stagioneSelezionata}
            onChange={(e) => setStagioneSelezionata(e.target.value)}
            className="w-full border-2 border-montecarlo-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-montecarlo-secondary/40"
          >
            <option value="">Tutte le stagioni</option>
            {stagioni.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center text-montecarlo-secondary">Caricamento statistiche…</div>
        ) : !statistiche ? (
          <div className="text-center text-montecarlo-neutral">Nessuna statistica disponibile</div>
        ) : (
          <>
            <div className="space-y-6 mb-6">
              <StatisticheBox title="Totali" stats={statistiche.totali} />
              <StatisticheBox title="In Casa" stats={statistiche.casa} />
              <StatisticheBox title="In Trasferta" stats={statistiche.trasferta} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {matchMaxFatti && <MatchCard partita={matchMaxFatti} label="Più gol fatti" />}
              {matchMaxSubiti && <MatchCard partita={matchMaxSubiti} label="Più gol subiti" />}
              {matchMaxDifferenza && <MatchCard partita={matchMaxDifferenza} label="Maggior differenza" />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
