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
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>(''); // '' = tutte le stagioni
  const [statistiche, setStatistiche] = useState<StatistichePartite | null>(null);
  const [matchMaxFatti, setMatchMaxFatti] = useState<PartitaEstesa | null>(null);
  const [matchMaxSubiti, setMatchMaxSubiti] = useState<PartitaEstesa | null>(null);
  const [matchMaxDifferenza, setMatchMaxDifferenza] = useState<PartitaEstesa | null>(null);
  const [loading, setLoading] = useState(true);

  // Carica le stagioni
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

  // Calcola statistiche e partite "top"
  useEffect(() => {
    const fetchStatistiche = async () => {
      setLoading(true);
      try {
        // Recupera tutte le partite giocate con i nomi di casa e ospite
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

        // Inizializza statistiche di base
        const stats: StatistichePartite = {
          totali: { giocate: 0, vittorie: 0, pareggi: 0, sconfitte: 0, gol_fatti: 0, gol_subiti: 0 },
          casa:   { giocate: 0, vittorie: 0, pareggi: 0, sconfitte: 0, gol_fatti: 0, gol_subiti: 0 },
          trasferta: { giocate: 0, vittorie: 0, pareggi: 0, sconfitte: 0, gol_fatti: 0, gol_subiti: 0 }
        };

        // Variabili per trovare le partite "top"
        let maxFatti = -1;
        let partitaMaxFatti: PartitaEstesa | null = null;
        let maxSubiti = -1;
        let partitaMaxSubiti: PartitaEstesa | null = null;
        let maxDiff = -1;
        let partitaMaxDiff: PartitaEstesa | null = null;

        // Itera su tutte le partite giocate
        partite.forEach((partita: PartitaEstesa) => {
          const isCasa = partita.squadra_casa_id === MONTECARLO_ID;
          const isTrasferta = partita.squadra_ospite_id === MONTECARLO_ID;
          if (!isCasa && !isTrasferta) return; // salto se Montecarlo non è coinvolta

          const golFatti   = isCasa ? partita.goal_a : partita.goal_b;
          const golSubiti  = isCasa ? partita.goal_b : partita.goal_a;
          const tipo       = isCasa ? 'casa' : 'trasferta';

          // Aggiorno stats per "casa" o "trasferta"
          stats[tipo].giocate++;
          stats[tipo].gol_fatti  += golFatti;
          stats[tipo].gol_subiti += golSubiti;
          if      (golFatti > golSubiti) stats[tipo].vittorie++;
          else if (golFatti < golSubiti) stats[tipo].sconfitte++;
          else                            stats[tipo].pareggi++;

          // Aggiorno stats totali
          stats.totali.giocate++;
          stats.totali.gol_fatti  += golFatti;
          stats.totali.gol_subiti += golSubiti;
          if      (golFatti > golSubiti) stats.totali.vittorie++;
          else if (golFatti < golSubiti) stats.totali.sconfitte++;
          else                            stats.totali.pareggi++;

          // Cerco la partita con più gol fatti da Montecarlo
          if (golFatti > maxFatti) {
            maxFatti = golFatti;
            partitaMaxFatti = partita;
          }

          // Cerco la partita con più gol subiti da Montecarlo
          if (golSubiti > maxSubiti) {
            maxSubiti = golSubiti;
            partitaMaxSubiti = partita;
          }

          // Cerco la partita con la maggior differenza reti
          const diff = Math.abs(golFatti - golSubiti);
          if (diff > maxDiff) {
            maxDiff = diff;
            partitaMaxDiff = partita;
          }
        });

        setStatistiche(stats);
        setMatchMaxFatti(partitaMaxFatti);
        setMatchMaxSubiti(partitaMaxSubiti);
        setMatchMaxDifferenza(partitaMaxDiff);
      } catch (err) {
        console.error('Errore recupero statistiche:', err);
        setStatistiche(null);
        setMatchMaxFatti(null);
        setMatchMaxSubiti(null);
        setMatchMaxDifferenza(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistiche();
  }, [stagioneSelezionata]);

  const StatisticheBox = ({ title, stats }: { title: string; stats: any }) => {
    const mediaGolFatti = stats.giocate ? (stats.gol_fatti / stats.giocate).toFixed(2) : '0.00';
    const mediaGolSubiti = stats.giocate ? (stats.gol_subiti / stats.giocate).toFixed(2) : '0.00';

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Partite giocate</p>
            <p className="text-2xl font-bold">{stats.giocate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Vittorie</p>
            <p className="text-2xl font-bold text-green-600">{stats.vittorie}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pareggi</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pareggi}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Sconfitte</p>
            <p className="text-2xl font-bold text-red-600">{stats.sconfitte}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Gol fatti</p>
            <p className="text-2xl font-bold">{stats.gol_fatti}</p>
            <p className="text-sm text-gray-500">Media: {mediaGolFatti}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Gol subiti</p>
            <p className="text-2xl font-bold">{stats.gol_subiti}</p>
            <p className="text-sm text-gray-500">Media: {mediaGolSubiti}</p>
          </div>
        </div>
      </div>
    );
  };

  const MatchCard = ({
    partita,
    label,
  }: {
    partita: PartitaEstesa;
    label: string;
  }) => {
    // Determino se Montecarlo era in casa o trasferta
    const isCasa = partita.squadra_casa_id === MONTECARLO_ID;
    const golFatti  = isCasa ? partita.goal_a : partita.goal_b;
    const golSubiti = isCasa ? partita.goal_b : partita.goal_a;
    const avversario = isCasa ? partita.ospite.nome : partita.casa.nome;
    const location   = isCasa ? 'Casa' : 'Trasferta';

    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h4 className="text-md font-semibold mb-2">{label}</h4>
        <p className="text-sm text-gray-600 mb-1">
          <span className="font-medium">Avversario:</span> {avversario} ({location})
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Risultato:</span>{' '}
          {isCasa
            ? `Montecarlo ${golFatti} - ${golSubiti} ${avversario}`
            : `${avversario} ${golSubiti} - ${golFatti} Montecarlo`}
        </p>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Statistiche Squadra</h1>

        {/* Selettore Stagione */}
        <div className="mb-8">
          <select
            value={stagioneSelezionata}
            onChange={(e) => setStagioneSelezionata(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutte le stagioni</option>
            {stagioni.map((stagione) => (
              <option key={stagione.id} value={stagione.id}>
                {stagione.nome}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Caricamento statistiche...</p>
          </div>
        ) : !statistiche ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Nessuna statistica disponibile</p>
          </div>
        ) : (
          <>
            <div className="space-y-8 mb-8">
              <StatisticheBox title="Statistiche Totali" stats={statistiche.totali} />
              <StatisticheBox title="Statistiche Casa" stats={statistiche.casa} />
              <StatisticheBox title="Statistiche Trasferta" stats={statistiche.trasferta} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {matchMaxFatti && (
                <MatchCard
                  partita={matchMaxFatti}
                  label="Partita con più gol fatti"
                />
              )}
              {matchMaxSubiti && (
                <MatchCard
                  partita={matchMaxSubiti}
                  label="Partita con più gol subiti"
                />
              )}
              {matchMaxDifferenza && (
                <MatchCard
                  partita={matchMaxDifferenza}
                  label="Partita con maggior differenza reti"
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}