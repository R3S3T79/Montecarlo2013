import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BarChart3, Trophy, Target } from 'lucide-react';

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
  id: string;
  nome: string;
  cognome: string;
  gol: number;
  partitaId: string;
  squadraCasa: string;
  squadraOspite: string;
  goalA: number;
  goalB: number;
}

export default function StatisticheGiocatori() {
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>(''); 
  const [statistiche, setStatistiche] = useState<StatisticheGiocatore[]>([]);
  const [topScorer, setTopScorer] = useState<TopScorer | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Nome della stagione di riferimento per le presenze (dato attendibile solo da 2025/2026)
  const STAGIONE_PRESEnZE = '2025/2026';

  useEffect(() => {
    // 1) Carico elenco stagioni
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
    // Avvio il calcolo solo dopo aver caricato le stagioni
    if (stagioni.length === 0) return;

    const fetchStatistiche = async () => {
      setLoading(true);
      try {
        // 2) Trovo l'ID della stagione per le PRESENZE (2025/2026)
        const stagionePresenze = stagioni.find(s => s.nome === STAGIONE_PRESEnZE);
        const stagionePresenzeId = stagionePresenze?.id ?? null;

        // 3) Trovo l'ID della stagione selezionata per i GOL (o null se "Tutte le stagioni")
        const stagioneGolId = stagioneSelezionata || null;

        // 4) Recupero lista di tutti i giocatori
        const { data: giocatori, error: errGiocatori } = await supabase
          .from('giocatori')
          .select('id, nome, cognome')
          .order('cognome');
        if (errGiocatori || !giocatori) {
          throw new Error('Errore recupero giocatori');
        }

        // 5) Preparo array di ID partite per PRESENZE (solo 2025/2026)
        let partitaIdsPresenze: string[] | null = null;
        if (stagionePresenzeId) {
          const { data: partitePres, error: errPres } = await supabase
            .from('partite')
            .select('id')
            .eq('stagione_id', stagionePresenzeId)
            .eq('stato', 'Giocata');
          if (errPres || !partitePres) throw new Error('Errore partite per presenze');
          partitaIdsPresenze = partitePres.map(p => p.id);
        }

        // 6) Preparo array di ID partite per GOL, basato sul filtro dropdown (o null se "Tutte")
        let partitaIdsGol: string[] | null = null;
        if (stagioneGolId) {
          const { data: partiteGol, error: errGol } = await supabase
            .from('partite')
            .select('id')
            .eq('stagione_id', stagioneGolId)
            .eq('stato', 'Giocata');
          if (errGol || !partiteGol) throw new Error('Errore partite per gol');
          partitaIdsGol = partiteGol.map(p => p.id);
        }

        // 7) Calcolo presenze e totali gol per ciascun giocatore
        const statisticheComplete = await Promise.all(
          giocatori.map(async giocatore => {
            let numPresenze = 0;
            let numGol = 0;

            // Conta PRESENZE (solo 2025/2026)
            if (partitaIdsPresenze && partitaIdsPresenze.length > 0) {
              const presenzeQuery = await supabase
                .from('presenze')
                .select('*', { count: 'exact', head: true })
                .eq('giocatore_id', giocatore.id)
                .in('partita_id', partitaIdsPresenze);
              numPresenze = presenzeQuery.count ?? 0;
            }

            // Conta GOL (tutte le stagioni se partitaIdsGol null, altrimenti solo su quelle ID)
            if (partitaIdsGol && partitaIdsGol.length > 0) {
              const golQuery = await supabase
                .from('marcatori')
                .select('*', { count: 'exact', head: true })
                .eq('giocatore_id', giocatore.id)
                .in('partita_id', partitaIdsGol);
              numGol = golQuery.count ?? 0;
            } else {
              // Se "Tutte le stagioni", conto tutti i marcatori
              const golQueryAll = await supabase
                .from('marcatori')
                .select('*', { count: 'exact', head: true })
                .eq('giocatore_id', giocatore.id);
              numGol = golQueryAll.count ?? 0;
            }

            return {
              id: giocatore.id,
              nome: giocatore.nome,
              cognome: giocatore.cognome,
              presenze: numPresenze,
              gol: numGol,
              media_gol: numPresenze > 0 ? numGol / numPresenze : 0,
            } as StatisticheGiocatore;
          })
        );

        // 8) Calcolo "Top Scorer" (più gol in una SINGOLA partita) usando sempre lo stesso filtro di partitaIdsGol
        let maxGolInMatch = -1;
        let candidato: { giocatoreId: string; partitaId: string } | null = null;

        // Preparo la query: se esiste partitaIdsGol, filtro con .in, altrimenti prendo tutti i marcatori
        let marcatoriQuery = supabase.from('marcatori').select('giocatore_id, partita_id');
        if (partitaIdsGol && partitaIdsGol.length > 0) {
          marcatoriQuery = marcatoriQuery.in('partita_id', partitaIdsGol);
        }
        const { data: marcatoriData } = await marcatoriQuery;

        if (marcatoriData) {
          const countMap: Record<string, number> = {};
          marcatoriData.forEach(record => {
            const key = `${record.giocatore_id}_${record.partita_id}`;
            countMap[key] = (countMap[key] || 0) + 1;
            if (countMap[key] > maxGolInMatch) {
              maxGolInMatch = countMap[key];
              candidato = {
                giocatoreId: record.giocatore_id,
                partitaId: record.partita_id,
              };
            }
          });
        }

        // 9) Se ho un candidato, recupero i dettagli di quella partita
        let dettagliTop: TopScorer | null = null;
        if (candidato) {
          // Trovo nome/cognome del giocatore
          const gioc = giocatori.find(g => g.id === candidato!.giocatoreId)!;

          // Recupero dati della partita selezionata
          const { data: partitaDettagli } = await supabase
            .from('partite')
            .select(`
              goal_a,
              goal_b,
              casa:squadra_casa_id(nome),
              ospite:squadra_ospite_id(nome)
            `)
            .eq('id', candidato.partitaId)
            .single();

          if (partitaDettagli) {
            dettagliTop = {
              id: gioc.id,
              nome: gioc.nome,
              cognome: gioc.cognome,
              gol: maxGolInMatch,
              partitaId: candidato.partitaId,
              squadraCasa: partitaDettagli.casa.nome,
              squadraOspite: partitaDettagli.ospite.nome,
              goalA: partitaDettagli.goal_a,
              goalB: partitaDettagli.goal_b,
            };
          }
        }

        // 10) Ordino alfabeticamente per cognome
        const ordinate = statisticheComplete.sort((a, b) =>
          a.cognome.localeCompare(b.cognome)
        );

        setStatistiche(ordinate);
        setTopScorer(dettagliTop);
      } catch (err) {
        console.error('Errore nel recupero delle statistiche:', err);
        setStatistiche([]);
        setTopScorer(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistiche();
  }, [stagioni, stagioneSelezionata]);

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-montecarlo p-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              <BarChart3 className="text-montecarlo-secondary mr-3" size={28} />
              <h1 className="text-2xl font-bold text-montecarlo-secondary">Statistiche Giocatori</h1>
            </div>
          </div>

          {/* Selettore Stagione */}
          <div className="bg-white rounded-lg shadow-montecarlo p-4 mb-6">
            <select
              value={stagioneSelezionata}
              onChange={e => setStagioneSelezionata(e.target.value)}
              className="w-full md:w-auto px-4 py-3 border-2 border-montecarlo-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-montecarlo-secondary focus:ring-2 focus:ring-montecarlo-secondary/20 text-montecarlo-secondary bg-white transition-colors"
            >
              <option value="">Tutte le Stagioni</option>
              {stagioni.map(st => (
                <option key={st.id} value={st.id}>
                  {st.nome}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
              <div className="text-montecarlo-secondary">Caricamento statistiche...</div>
            </div>
          ) : (
            <>
              {/* Top Scorer */}
              {topScorer && (
                <div className="bg-gradient-montecarlo rounded-lg shadow-montecarlo p-6 mb-8 text-white">
                  <div className="flex items-center mb-4">
                    <Trophy className="text-montecarlo-accent mr-3" size={24} />
                    <h2 className="text-lg font-semibold">
                      Giocatore con più gol in una partita
                    </h2>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-white/90">
                      <span className="font-bold text-montecarlo-accent text-lg">
                        {topScorer.cognome} {topScorer.nome}
                      </span>{' '}
                      ha segnato{' '}
                      <span className="font-bold text-montecarlo-accent text-lg">{topScorer.gol}</span>{' '}
                      gol nella partita{' '}
                      <span
                        className="text-montecarlo-accent hover:underline cursor-pointer font-medium"
                        onClick={() => navigate(`/partita/${topScorer.partitaId}`)}
                      >
                        {topScorer.squadraCasa} {topScorer.goalA}-{topScorer.goalB}{' '}
                        {topScorer.squadraOspite}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Tabella delle statistiche */}
              {statistiche.length === 0 ? (
                <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
                  <div className="text-montecarlo-neutral">Nessuna statistica disponibile</div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-montecarlo overflow-hidden">
                  <div className="bg-gradient-montecarlo text-white p-4">
                    <div className="flex items-center">
                      <Target className="mr-2" size={20} />
                      <h3 className="font-semibold">Statistiche Dettagliate</h3>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-montecarlo-gray-200">
                      <thead className="bg-montecarlo-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-montecarlo-secondary uppercase tracking-wider">
                            Giocatore
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-montecarlo-secondary uppercase tracking-wider">
                            Gol
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-montecarlo-secondary uppercase tracking-wider">
                            Presenze (25/26)
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-montecarlo-secondary uppercase tracking-wider">
                            Media Gol
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-montecarlo-gray-100">
                        {statistiche.map((stat, index) => (
                          <tr
                            key={stat.id}
                            onClick={() => navigate(`/giocatore/${stat.id}`)}
                            className={`hover:bg-montecarlo-gray-50 cursor-pointer transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-montecarlo-gray-25'
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-montecarlo-secondary">
                                {stat.cognome} {stat.nome}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="text-sm font-bold text-montecarlo-secondary bg-montecarlo-red-50 px-2 py-1 rounded-full inline-block">
                                {stat.gol}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="text-sm font-bold text-montecarlo-neutral bg-montecarlo-gray-50 px-2 py-1 rounded-full inline-block">
                                {stat.presenze}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="text-sm font-bold text-montecarlo-accent bg-montecarlo-gold-50 px-2 py-1 rounded-full inline-block">
                                {stat.media_gol.toFixed(2)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}