// src/pages/StatisticheSquadra.tsx
// Data creazione chat: 2025-08-10 — Rev3: aggiunti colori dinamici per vittorie/pareggi/sconfitte/gol fatti/subiti

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Stagione {
  id: string;
  nome: string;
}

interface PartitaEstesa {
  id: string;
  data_ora: string;
  squadra_casa_id: string;
  squadra_ospite_id: string;
  goal_a: number;
  goal_b: number;
  rigori_a: number;
  rigori_b: number;
  casa: { nome: string }[];
ospite: { nome: string }[];
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

interface StatisticheExtra {
  media_gol_fatti: number;
  media_gol_subiti: number;
  differenza_reti: number;
  percentuale_vittorie: number;
  clean_sheet: number;
  senza_segnare: number;
  serie_positiva: number;
}

export default function StatisticheSquadra() {
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>('');
  const [filtroCompetizione, setFiltroCompetizione] = useState<string>('Tutte');
  const [statistiche, setStatistiche] = useState<StatistichePartite | null>(null);
  const [statisticheExtra, setStatisticheExtra] = useState<StatisticheExtra | null>(null);
  const [matchMaxFatti, setMatchMaxFatti] = useState<PartitaEstesa | null>(null);
  const [matchMaxSubiti, setMatchMaxSubiti] = useState<PartitaEstesa | null>(null);
  const [matchMaxDifferenza, setMatchMaxDifferenza] = useState<PartitaEstesa | null>(null);
  const [matchMigliorVittoria, setMatchMigliorVittoria] = useState<PartitaEstesa | null>(null);
  const [matchPeggiorSconfitta, setMatchPeggiorSconfitta] = useState<PartitaEstesa | null>(null);
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
            data_ora,
            squadra_casa_id,
            squadra_ospite_id,
            goal_a,
            goal_b,
            rigori_a,
            rigori_b,
            campionato_torneo,
            casa:squadra_casa_id(nome),
            ospite:squadra_ospite_id(nome)
          `)
          .eq('stato', 'Giocata')
          .eq('stagione_id', stagioneSelezionata)
          .neq('campionato_torneo', 'Allenamento')
          .order('data_ora', { ascending: true });

        if (filtroCompetizione !== 'Tutte') {
          query = query.eq('campionato_torneo', filtroCompetizione);
        }

        const { data: partite, error } = await query;

        if (!partite || error) {
          setStatistiche(null);
          setStatisticheExtra(null);
          setMatchMaxFatti(null);
          setMatchMaxSubiti(null);
          setMatchMaxDifferenza(null);
          setMatchMigliorVittoria(null);
          setMatchPeggiorSconfitta(null);
          return;
        }

        const tot = { giocate: 0, vittorie: 0, pareggi: 0, sconfitte: 0, gol_fatti: 0, gol_subiti: 0 };
        const casa = { ...tot };
        const trasf = { ...tot };

        let maxF: PartitaEstesa | null = null;
        let maxS: PartitaEstesa | null = null;
        let maxD: PartitaEstesa | null = null;
        let migliorVittoria: PartitaEstesa | null = null;
        let peggiorSconfitta: PartitaEstesa | null = null;

        let cleanSheet = 0;
        let senzaSegnare = 0;

        partite.forEach(p => {
          const èCasa = p.squadra_casa_id === montecarloId;
          const goalFatti = èCasa ? p.goal_a : p.goal_b;
          const goalSubiti = èCasa ? p.goal_b : p.goal_a;

          tot.giocate++;
          tot.gol_fatti += goalFatti;
          tot.gol_subiti += goalSubiti;
            const rigoriFatti = èCasa ? p.rigori_a : p.rigori_b;
          const rigoriSubiti = èCasa ? p.rigori_b : p.rigori_a;

          if (goalSubiti === 0) {
            cleanSheet++;
          }

          if (goalFatti === 0) {
            senzaSegnare++;
          }

          if (goalFatti > goalSubiti) {
            tot.vittorie++;
          } else if (goalFatti < goalSubiti) {
            tot.sconfitte++;
          } else if (rigoriFatti > rigoriSubiti) {
            tot.vittorie++;
          } else if (rigoriFatti < rigoriSubiti) {
            tot.sconfitte++;
          } else {
            tot.pareggi++;
          }

          if (èCasa) {
            casa.giocate++;
            casa.gol_fatti += goalFatti;
            casa.gol_subiti += goalSubiti;
            if (goalFatti > goalSubiti) {
  casa.vittorie++;
} else if (goalFatti < goalSubiti) {
  casa.sconfitte++;
} else if (rigoriFatti > rigoriSubiti) {
  casa.vittorie++;
} else if (rigoriFatti < rigoriSubiti) {
  casa.sconfitte++;
} else {
  casa.pareggi++;
}
          } else {
            trasf.giocate++;
            trasf.gol_fatti += goalFatti;
            trasf.gol_subiti += goalSubiti;
            if (goalFatti > goalSubiti) {
  trasf.vittorie++;
} else if (goalFatti < goalSubiti) {
  trasf.sconfitte++;
} else if (rigoriFatti > rigoriSubiti) {
  trasf.vittorie++;
} else if (rigoriFatti < rigoriSubiti) {
  trasf.sconfitte++;
} else {
  trasf.pareggi++;
}
          }

          if (!maxF || goalFatti > (maxF.squadra_casa_id === montecarloId ? maxF.goal_a : maxF.goal_b)) maxF = p;
          if (!maxS || goalSubiti > (maxS.squadra_casa_id === montecarloId ? maxS.goal_b : maxS.goal_a)) maxS = p;
          if (!maxD || Math.abs(goalFatti - goalSubiti) > Math.abs((maxD.squadra_casa_id === montecarloId ? maxD.goal_a : maxD.goal_b) - (maxD.squadra_casa_id === montecarloId ? maxD.goal_b : maxD.goal_a))) maxD = p;

          if (goalFatti > goalSubiti) {
            if (!migliorVittoria) {
              migliorVittoria = p;
            } else {
              const migliorÈCasa = migliorVittoria.squadra_casa_id === montecarloId;
              const migliorGF = migliorÈCasa ? migliorVittoria.goal_a : migliorVittoria.goal_b;
              const migliorGS = migliorÈCasa ? migliorVittoria.goal_b : migliorVittoria.goal_a;

              if ((goalFatti - goalSubiti) > (migliorGF - migliorGS)) {
                migliorVittoria = p;
              }
            }
          }

          if (goalFatti < goalSubiti) {
            if (!peggiorSconfitta) {
              peggiorSconfitta = p;
            } else {
              const peggiorÈCasa = peggiorSconfitta.squadra_casa_id === montecarloId;
              const peggiorGF = peggiorÈCasa ? peggiorSconfitta.goal_a : peggiorSconfitta.goal_b;
              const peggiorGS = peggiorÈCasa ? peggiorSconfitta.goal_b : peggiorSconfitta.goal_a;

              if ((goalSubiti - goalFatti) > (peggiorGS - peggiorGF)) {
                peggiorSconfitta = p;
              }
            }
          }
        });

        let seriePositiva = 0;

        for (let i = partite.length - 1; i >= 0; i--) {
          const p = partite[i];

          const èCasa = p.squadra_casa_id === montecarloId;
          const goalFatti = èCasa ? p.goal_a : p.goal_b;
          const goalSubiti = èCasa ? p.goal_b : p.goal_a;
          const rigoriFatti = èCasa ? p.rigori_a : p.rigori_b;
          const rigoriSubiti = èCasa ? p.rigori_b : p.rigori_a;

          const sconfitta =
            goalFatti < goalSubiti ||
            (goalFatti === goalSubiti && rigoriFatti < rigoriSubiti);

          if (sconfitta) {
            break;
          }

          seriePositiva++;
        }

        const mediaGolFatti =
          tot.giocate > 0 ? tot.gol_fatti / tot.giocate : 0;

        const mediaGolSubiti =
          tot.giocate > 0 ? tot.gol_subiti / tot.giocate : 0;

        const percentualeVittorie =
          tot.giocate > 0 ? (tot.vittorie / tot.giocate) * 100 : 0;

        setStatistiche({ totali: tot, casa, trasferta: trasf });

        setStatisticheExtra({
          media_gol_fatti: mediaGolFatti,
          media_gol_subiti: mediaGolSubiti,
          differenza_reti: tot.gol_fatti - tot.gol_subiti,
          percentuale_vittorie: percentualeVittorie,
          clean_sheet: cleanSheet,
          senza_segnare: senzaSegnare,
          serie_positiva: seriePositiva,
        });

        setMatchMaxFatti(maxF);
        setMatchMaxSubiti(maxS);
        setMatchMaxDifferenza(maxD);
        setMatchMigliorVittoria(migliorVittoria);
        setMatchPeggiorSconfitta(peggiorSconfitta);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchStatistiche();
  }, [stagioneSelezionata, filtroCompetizione, montecarloId]);

  return (
    <div className="min-h-screen w-full px-[2px] pb-6 box-border">

      {/* 1. Contenitore principale */}
      <div className="w-full flex flex-col md:flex-row gap-4">

        <div className="flex-1 rounded-2xl border border-white/20 bg-black/20 p-3 md:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-[1px]">

          {/* 2. Selettore stagione */}
          <div className="relative mb-3 overflow-hidden rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-14 items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-[22px] text-white">
              📅
            </div>

            <select
              value={stagioneSelezionata}
              onChange={e => setStagioneSelezionata(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/70 bg-white/90 py-3 pl-[72px] pr-10 text-[16px] font-semibold text-[#151515] outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
            >
              {stagioni.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xl font-bold text-black">
              ⌄
            </div>
          </div>

          {/* 3. Selettore competizione */}
          <div className="relative mb-5 overflow-hidden rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-14 items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-[22px] text-white">
              🏆
            </div>

            <select
              value={filtroCompetizione}
              onChange={e => setFiltroCompetizione(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/70 bg-white/90 py-3 pl-[72px] pr-10 text-[16px] font-semibold text-[#151515] outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
            >
              <option value="Tutte">Tutte le Competizioni</option>
              <option value="Campionato">Campionato</option>
              <option value="Torneo">Tornei</option>
              <option value="Amichevole">Amichevoli</option>
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xl font-bold text-black">
              ⌄
            </div>
          </div>

          {/* 4. Tabella statistiche */}
          {loading ? (
            <div className="rounded-xl bg-white/85 px-4 py-8 text-center font-semibold text-red-600 shadow-md">
              Caricamento statistiche…
            </div>
          ) : !statistiche ? (
            <div className="rounded-xl bg-white/85 px-4 py-8 text-center font-semibold text-gray-600 shadow-md">
              Nessuna statistica disponibile
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-white/50 bg-white/85 shadow-[0_6px_18px_rgba(0,0,0,0.30)]">

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">

                    <thead className="bg-gradient-to-r from-red-600 via-red-600 to-red-700 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left text-[15px] font-extrabold">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">▥</span>
                            <span>Statistiche</span>
                          </div>
                        </th>
                        <th className="px-2 py-3 text-center text-[15px] font-extrabold">Totale</th>
                        <th className="px-2 py-3 text-center text-[15px] font-extrabold">Casa</th>
                        <th className="px-2 py-3 text-center text-[15px] font-extrabold">Trasf.</th>
                      </tr>
                    </thead>

                    <tbody>

                      <tr className="border-b border-white bg-white/55">
                        <td className="px-3 py-3 text-[#202020]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[18px] shadow-md">
                              ⚽
                            </div>
                            <span className="font-semibold">Giocate</span>
                          </div>
                        </td>
                        <td className="text-center font-bold text-[#202020]">{statistiche.totali.giocate}</td>
                        <td className="text-center font-bold text-[#202020]">{statistiche.casa.giocate}</td>
                        <td className="text-center font-bold text-[#202020]">{statistiche.trasferta.giocate}</td>
                      </tr>

                      <tr className="border-b border-white bg-white/45 text-green-600">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-[17px] text-white shadow-md">
                              🏆
                            </div>
                            <span className="font-bold">Vittorie</span>
                          </div>
                        </td>
                        <td className="text-center font-extrabold">{statistiche.totali.vittorie}</td>
                        <td className="text-center font-extrabold">{statistiche.casa.vittorie}</td>
                        <td className="text-center font-extrabold">{statistiche.trasferta.vittorie}</td>
                      </tr>

                      <tr className="border-b border-white bg-white/55 text-gray-500">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[17px] shadow-md">
                              🤝
                            </div>
                            <span className="font-bold">Pareggi</span>
                          </div>
                        </td>
                        <td className="text-center font-extrabold">{statistiche.totali.pareggi}</td>
                        <td className="text-center font-extrabold">{statistiche.casa.pareggi}</td>
                        <td className="text-center font-extrabold">{statistiche.trasferta.pareggi}</td>
                      </tr>

                      <tr className="border-b border-white bg-white/45 text-red-600">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-[18px] font-black text-white shadow-md">
                              ×
                            </div>
                            <span className="font-bold">Sconfitte</span>
                          </div>
                        </td>
                        <td className="text-center font-extrabold">{statistiche.totali.sconfitte}</td>
                        <td className="text-center font-extrabold">{statistiche.casa.sconfitte}</td>
                        <td className="text-center font-extrabold">{statistiche.trasferta.sconfitte}</td>
                      </tr>

                      <tr className="border-b border-white bg-white/55 text-green-600">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-[17px] text-white shadow-md">
                              🥅
                            </div>
                            <span className="font-bold">Gol fatti</span>
                          </div>
                        </td>
                        <td className="text-center font-extrabold">{statistiche.totali.gol_fatti}</td>
                        <td className="text-center font-extrabold">{statistiche.casa.gol_fatti}</td>
                        <td className="text-center font-extrabold">{statistiche.trasferta.gol_fatti}</td>
                      </tr>

                      <tr className="bg-white/45 text-red-600">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-[17px] text-white shadow-md">
                              ⚽
                            </div>
                            <span className="font-bold">Gol subiti</span>
                          </div>
                        </td>
                        <td className="text-center font-extrabold">{statistiche.totali.gol_subiti}</td>
                        <td className="text-center font-extrabold">{statistiche.casa.gol_subiti}</td>
                        <td className="text-center font-extrabold">{statistiche.trasferta.gol_subiti}</td>
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Statistiche aggiuntive */}
              {statisticheExtra && (
                <div className="mt-4 grid grid-cols-2 gap-3">

                  <div className="rounded-xl border border-white/40 bg-white/85 p-3 text-center shadow-md">
                    <div className="text-[12px] font-bold uppercase text-gray-500">
                      Media GF
                    </div>
                    <div className="mt-1 text-[24px] font-extrabold text-green-600">
                      {statisticheExtra.media_gol_fatti.toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/40 bg-white/85 p-3 text-center shadow-md">
                    <div className="text-[12px] font-bold uppercase text-gray-500">
                      Media GS
                    </div>
                    <div className="mt-1 text-[24px] font-extrabold text-red-600">
                      {statisticheExtra.media_gol_subiti.toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/40 bg-white/85 p-3 text-center shadow-md">
                    <div className="text-[12px] font-bold uppercase text-gray-500">
                      Differenza reti
                    </div>
                    <div
                      className={`mt-1 text-[24px] font-extrabold ${
                        statisticheExtra.differenza_reti > 0
                          ? 'text-green-600'
                          : statisticheExtra.differenza_reti < 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {statisticheExtra.differenza_reti > 0 ? '+' : ''}
                      {statisticheExtra.differenza_reti}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/40 bg-white/85 p-3 text-center shadow-md">
                    <div className="text-[12px] font-bold uppercase text-gray-500">
                      Vittorie
                    </div>
                    <div className="mt-1 text-[24px] font-extrabold text-red-600">
                      {statisticheExtra.percentuale_vittorie.toFixed(0)}%
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/40 bg-white/85 p-3 text-center shadow-md">
                    <div className="text-[12px] font-bold uppercase text-gray-500">
                      Clean Sheet
                    </div>
                    <div className="mt-1 text-[24px] font-extrabold text-green-600">
                      {statisticheExtra.clean_sheet}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/40 bg-white/85 p-3 text-center shadow-md">
                    <div className="text-[12px] font-bold uppercase text-gray-500">
                      Senza segnare
                    </div>
                    <div className="mt-1 text-[24px] font-extrabold text-red-600">
                      {statisticheExtra.senza_segnare}
                    </div>
                  </div>

                  <div className="col-span-2 rounded-xl border border-white/40 bg-gradient-to-r from-[#202020]/90 to-[#353535]/90 p-3 text-center shadow-md">
                    <div className="text-[12px] font-bold uppercase tracking-wide text-gray-300">
                      Serie positiva attuale
                    </div>
                    <div className="mt-1 text-[26px] font-extrabold text-white">
                      {statisticheExtra.serie_positiva}
                      <span className="ml-2 text-[13px] font-semibold text-gray-300">
                        {statisticheExtra.serie_positiva === 1 ? 'partita' : 'partite'}
                      </span>
                    </div>
                  </div>

                </div>
              )}
            </>
          )}
        </div>

        {/* 6. Record partite */}
        <div className="flex-1 md:w-1/3 space-y-3">

          {matchMigliorVittoria && (
            <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/85 shadow-[0_6px_18px_rgba(0,0,0,0.32)]">
              <div className="flex min-h-[92px] items-stretch">

                <div className="flex w-[88px] flex-shrink-0 items-center justify-center bg-gradient-to-br from-green-500 to-green-700 text-[32px] text-white shadow-[5px_0_14px_rgba(0,0,0,0.20)]">
                  🏆
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                  <h3 className="mb-1 text-[16px] font-extrabold text-green-700">
                    Miglior Vittoria
                  </h3>

                  <p className="text-[16px] font-semibold text-[#171717]">
                    {matchMigliorVittoria.casa[0]?.nome} {matchMigliorVittoria.goal_a} - {matchMigliorVittoria.goal_b} {matchMigliorVittoria.ospite[0]?.nome}
                  </p>
                </div>
              </div>
            </div>
          )}

          {matchPeggiorSconfitta && (
            <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/85 shadow-[0_6px_18px_rgba(0,0,0,0.32)]">
              <div className="flex min-h-[92px] items-stretch">

                <div className="flex w-[88px] flex-shrink-0 items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-[32px] text-white shadow-[5px_0_14px_rgba(185,28,28,0.25)]">
                  ✕
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                  <h3 className="mb-1 text-[16px] font-extrabold text-red-700">
                    Peggior Sconfitta
                  </h3>

                  <p className="text-[16px] font-semibold text-[#171717]">
                    {matchPeggiorSconfitta.casa[0]?.nome} {matchPeggiorSconfitta.goal_a} - {matchPeggiorSconfitta.goal_b} {matchPeggiorSconfitta.ospite[0]?.nome}
                  </p>
                </div>
              </div>
            </div>
          )}

          {matchMaxFatti && (
            <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/85 shadow-[0_6px_18px_rgba(0,0,0,0.32)]">
              <div className="flex min-h-[92px] items-stretch">

                <div className="flex w-[88px] flex-shrink-0 items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-[32px] text-white shadow-[5px_0_14px_rgba(185,28,28,0.25)]">
                  🎯
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                  <h3 className="mb-1 text-[16px] font-extrabold text-red-700">
                    Massimo Gol Fatti
                  </h3>

                  <p className="text-[16px] font-semibold text-[#171717]">
  {matchMaxFatti.squadra_casa_id === montecarloId
    ? matchMaxFatti.goal_a
    : matchMaxFatti.goal_b} gol
</p>
                </div>

                <div className="pointer-events-none absolute bottom-2 right-3 text-[42px] opacity-[0.08]">
                  ↗
                </div>
              </div>
            </div>
          )}

          {matchMaxSubiti && (
            <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/85 shadow-[0_6px_18px_rgba(0,0,0,0.32)]">
              <div className="flex min-h-[92px] items-stretch">

                <div className="flex w-[88px] flex-shrink-0 items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-[32px] text-white shadow-[5px_0_14px_rgba(185,28,28,0.25)]">
                  ⚽
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                  <h3 className="mb-1 text-[16px] font-extrabold text-red-700">
                    Massimo Gol Subiti
                  </h3>

                  <p className="text-[16px] font-semibold text-[#171717]">
                    {matchMaxSubiti.casa[0]?.nome} {matchMaxSubiti.goal_a} - {matchMaxSubiti.goal_b} {matchMaxSubiti.ospite[0]?.nome}
                  </p>
                </div>

                <div className="pointer-events-none absolute bottom-2 right-3 text-[42px] opacity-[0.08]">
                  ↘
                </div>
              </div>
            </div>
          )}

          {matchMaxDifferenza && (
            <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/85 shadow-[0_6px_18px_rgba(0,0,0,0.32)]">
              <div className="flex min-h-[92px] items-stretch">

                <div className="flex w-[88px] flex-shrink-0 items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-[32px] text-white shadow-[5px_0_14px_rgba(185,28,28,0.25)]">
                  ⚖
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                  <h3 className="mb-1 text-[16px] font-extrabold text-red-700">
                    Maggior Differenza Reti
                  </h3>

                  <p className="text-[16px] font-semibold text-[#171717]">
                    {matchMaxDifferenza.casa[0]?.nome} {matchMaxDifferenza.goal_a} - {matchMaxDifferenza.goal_b} {matchMaxDifferenza.ospite[0]?.nome}
                  </p>
                </div>

                <div className="pointer-events-none absolute bottom-2 right-3 text-[42px] opacity-[0.08]">
                  ⚖
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}