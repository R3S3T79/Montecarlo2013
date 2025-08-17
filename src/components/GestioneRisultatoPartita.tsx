// src/components/GestioneRisultatoPartita.tsx
// Data creazione: 16/08/2025

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import TimerCircolare from "./TimerCircolare";

interface TimerState {
  partita_id: string;
  timer_started_at: string | null;
  timer_offset_ms: number;
  timer_status: "running" | "paused" | "stopped";
  timer_duration_min?: number;
}

export default function GestioneRisultatoPartita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const MONTECARLO_ID = "a16a8645-9f86-41d9-a81f-a92931f1cc67";

  const [partita, setPartita] = useState<any>(null);
  const [squadraCasa, setSquadraCasa] = useState<any>(null);
  const [squadraOspite, setSquadraOspite] = useState<any>(null);

  const [giocatori, setGiocatori] = useState<
    { id: string; nome: string | null; cognome: string | null; giocatore_uid?: string }[]
  >([]);
  const [convocati, setConvocati] = useState<string[]>([]);

  const [formazioneAperta, setFormazioneAperta] = useState(false);
  const [goalCasa, setGoalCasa] = useState([0, 0, 0, 0]);
  const [goalOspite, setGoalOspite] = useState([0, 0, 0, 0]);
  const [tempo, setTempo] = useState<number | null>(null);

  const [marcatori, setMarcatori] = useState<
    Record<number, { goal_tempo: number; giocatore_stagione_id: string | null; id_supabase?: string }[]>
  >({});

  // TIMER
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const totale = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const isMontecarlo = (teamId?: string, teamName?: string) =>
    teamId === MONTECARLO_ID || (teamName || "").toLowerCase().includes("montecarlo");

  // =====================
  // FETCH DATI INIZIALI + REALTIME
  // =====================
  useEffect(() => {
    if (!id) return;
    let subPartite: any = null;
    let subMarcatori: any = null;
    let subTimer: any = null;

    (async () => {
      const { data: p } = await supabase.from("partite").select("*").eq("id", id).single();
      if (!p) return;
      setPartita(p);
      setGoalCasa([p.goal_a1, p.goal_a2, p.goal_a3, p.goal_a4]);
      setGoalOspite([p.goal_b1, p.goal_b2, p.goal_b3, p.goal_b4]);

      const [resCasa, resOspite] = await Promise.all([
        supabase.from("squadre").select("*").eq("id", p.squadra_casa_id).single(),
        supabase.from("squadre").select("*").eq("id", p.squadra_ospite_id).single(),
      ]);
      setSquadraCasa(resCasa.data);
      setSquadraOspite(resOspite.data);

      const { data: presenze } = await supabase
        .from("presenze")
        .select("giocatore_stagione_id, nome, cognome")
        .eq("partita_id", id);

      const { data: giocatoriStagione } = await supabase
        .from("giocatori_stagioni")
        .select("id, nome, cognome, giocatore_uid")
        .eq("stagione_id", p.stagione_id);

      const mapGiocatori = new Map<
        string,
        { id: string; nome: string | null; cognome: string | null; giocatore_uid?: string }
      >();
      (giocatoriStagione || []).forEach((g) => {
        mapGiocatori.set(g.id, {
          id: g.id,
          nome: g.nome ?? null,
          cognome: g.cognome ?? null,
          giocatore_uid: g.giocatore_uid,
        });
      });
      (presenze || []).forEach((pr) => {
        const idg = pr.giocatore_stagione_id;
        if (!idg) return;
        if (!mapGiocatori.has(idg)) {
          mapGiocatori.set(idg, {
            id: idg,
            nome: pr.nome ?? null,
            cognome: pr.cognome ?? null,
          });
        }
      });
      const elencoGiocatori = Array.from(mapGiocatori.values()).sort((a, b) => {
        const ac = (a.cognome || "").localeCompare(b.cognome || "");
        return ac !== 0 ? ac : (a.nome || "").localeCompare(b.nome || "");
      });
      setGiocatori(elencoGiocatori);

      if (presenze && presenze.length > 0) {
        const ids = presenze
          .map((x) => x.giocatore_stagione_id)
          .filter((x): x is string => typeof x === "string");
        setConvocati(ids);
      } else {
        setConvocati([]);
      }

      const { data: marcatoriDB } = await supabase
        .from("marcatori")
        .select("giocatore_stagione_id, periodo, goal_tempo, id")
        .eq("partita_id", p.id);

      const perPeriodo: Record<number, any[]> = {};
      marcatoriDB?.forEach((m) => {
        perPeriodo[m.periodo] = perPeriodo[m.periodo] || [];
        perPeriodo[m.periodo].push({
          goal_tempo: m.goal_tempo,
          giocatore_stagione_id: m.giocatore_stagione_id,
          id_supabase: m.id,
        });
      });
      setMarcatori(perPeriodo);

      // realtime partite
      subPartite = supabase
        .channel("realtime-partite")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "partite", filter: `id=eq.${p.id}` },
          ({ new: u }) => {
            setGoalCasa([u.goal_a1, u.goal_a2, u.goal_a3, u.goal_a4]);
            setGoalOspite([u.goal_b1, u.goal_b2, u.goal_b3, u.goal_b4]);
          }
        )
        .subscribe();

      // realtime marcatori (qualsiasi evento)
      subMarcatori = supabase
        .channel("realtime-marcatori")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "marcatori", filter: `partita_id=eq.${p.id}` },
          async () => {
            const { data: live } = await supabase
              .from("marcatori")
              .select("giocatore_stagione_id, periodo, goal_tempo, id")
              .eq("partita_id", p.id);
            const perLive: Record<number, any[]> = {};
            live?.forEach((m) => {
              perLive[m.periodo] = perLive[m.periodo] || [];
              perLive[m.periodo].push({
                goal_tempo: m.goal_tempo,
                giocatore_stagione_id: m.giocatore_stagione_id,
                id_supabase: m.id,
              });
            });
            setMarcatori(perLive);
          }
        )
        .subscribe();

      // stato timer iniziale
      const { data: t } = await supabase
        .from("partita_timer_state")
        .select("*")
        .eq("partita_id", p.id)
        .single();
      if (t) setTimerState(t);

      // realtime timer
      subTimer = supabase
        .channel("realtime-timer")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "partita_timer_state", filter: `partita_id=eq.${p.id}` },
          ({ new: u }) => {
            setTimerState(u as TimerState);
          }
        )
        .subscribe();
    })();

    return () => {
      if (subPartite) supabase.removeChannel(subPartite);
      if (subMarcatori) supabase.removeChannel(subMarcatori);
      if (subTimer) supabase.removeChannel(subTimer);
    };
  }, [id]);

  // calcolo elapsed
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerState) {
      if (timerState.timer_status === "running" && timerState.timer_started_at) {
        interval = setInterval(() => {
          const started = new Date(timerState.timer_started_at!).getTime();
          setElapsed(timerState.timer_offset_ms + (Date.now() - started));
        }, 1000);
      } else {
        setElapsed(timerState.timer_offset_ms);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState]);

  // durata corrente "sorgente unica"
  const currentDuration = timerState?.timer_duration_min ?? 20;

  // comandi timer (includono SEMPRE la durata per coerenza su prima creazione riga)
  const startTimer = async () => {
    if (!id) return;
    await supabase.from("partita_timer_state").upsert({
      partita_id: id,
      timer_duration_min: currentDuration,
      timer_started_at: new Date().toISOString(),
      timer_status: "running",
    });
  };

  const pauseTimer = async () => {
    if (!id || !timerState?.timer_started_at) return;
    const diff = Date.now() - new Date(timerState.timer_started_at).getTime();
    await supabase
      .from("partita_timer_state")
      .update({
        timer_offset_ms: timerState.timer_offset_ms + diff,
        timer_started_at: null,
        timer_status: "paused",
      })
      .eq("partita_id", id);
  };

  const resetTimer = async () => {
    if (!id) return;
    await supabase
      .from("partita_timer_state")
      .update({
        timer_offset_ms: 0,
        timer_started_at: null,
        timer_status: "stopped",
      })
      .eq("partita_id", id);
  };

  // cambia durata iniziale (sincronizzato, e mette il timer in stopped/offset 0)
  const changeDuration = async (minutes: number) => {
    if (!id) return;
    await supabase.from("partita_timer_state").upsert({
      partita_id: id,
      timer_duration_min: minutes,
      timer_offset_ms: 0,
      timer_started_at: null,
      timer_status: "stopped",
    });
  };

  // ---- helper marcatori: aggiorna stato locale per un periodo ----
  const aggiornaMarcatori = (periodo: number, nuovi: any[]) => {
    setMarcatori((prev) => ({ ...prev, [periodo]: nuovi }));
  };

  // gestione goal
  const aggiornaGoal = async (goalA: number[], goalB: number[]) => {
    if (!partita) return;
    await supabase
      .from("partite")
      .update({
        goal_a1: goalA[0],
        goal_a2: goalA[1],
        goal_a3: goalA[2],
        goal_a4: goalA[3],
        goal_b1: goalB[0],
        goal_b2: goalB[1],
        goal_b3: goalB[2],
        goal_b4: goalB[3],
        goal_a: totale(goalA),
        goal_b: totale(goalB),
      })
      .eq("id", partita.id);
  };

  const incrementa = async (tipo: "casa" | "ospite") => {
    if (tempo === null || !partita) return;
    const idx = tempo - 1;
    const nuovaA = [...goalCasa];
    const nuovaB = [...goalOspite];
    if (tipo === "casa") nuovaA[idx]++; else nuovaB[idx]++;
    setGoalCasa(nuovaA);
    setGoalOspite(nuovaB);
    await aggiornaGoal(nuovaA, nuovaB);

    // --- RIPRISTINO LOGICA: crea riga marcatore vuota per Montecarlo ---
    const sideIsMontecarlo =
      tipo === "casa"
        ? isMontecarlo(partita.squadra_casa_id, squadraCasa?.nome)
        : isMontecarlo(partita.squadra_ospite_id, squadraOspite?.nome);

    if (sideIsMontecarlo) {
      const goal_tempo = (marcatori[tempo]?.length || 0) + 1;
      const { data, error } = await supabase
        .from("marcatori")
        .insert({
          partita_id: partita.id,
          stagione_id: partita.stagione_id,
          periodo: tempo,
          goal_tempo,
          giocatore_stagione_id: null,
          giocatore_uid: null,
        })
        .select("id")
        .single();

      if (!error && data) {
        const attuali = marcatori[tempo] || [];
        aggiornaMarcatori(tempo, [
          ...attuali,
          { goal_tempo, giocatore_stagione_id: null, id_supabase: data.id },
        ]);
      }
    }
  };

  const decrementa = async (tipo: "casa" | "ospite") => {
    if (tempo === null || !partita) return;
    const idx = tempo - 1;
    const nuovaA = [...goalCasa];
    const nuovaB = [...goalOspite];
    if (tipo === "casa" && nuovaA[idx] > 0) nuovaA[idx]--;
    if (tipo === "ospite" && nuovaB[idx] > 0) nuovaB[idx]--;
    setGoalCasa(nuovaA);
    setGoalOspite(nuovaB);
    await aggiornaGoal(nuovaA, nuovaB);

    // --- RIPRISTINO LOGICA: rimuovi ultima riga marcatore se Montecarlo ---
    const sideIsMontecarlo =
      tipo === "casa"
        ? isMontecarlo(partita.squadra_casa_id, squadraCasa?.nome)
        : isMontecarlo(partita.squadra_ospite_id, squadraOspite?.nome);

    if (sideIsMontecarlo) {
      const attuali = marcatori[tempo] || [];
      const ultimo = attuali[attuali.length - 1];
      if (ultimo?.id_supabase) {
        await supabase.from("marcatori").delete().eq("id", ultimo.id_supabase);
      }
      aggiornaMarcatori(tempo, attuali.slice(0, -1));
    }
  };

  // selezione marcatore nel dropdown
  const selezionaMarcatore = async (periodo: number, goal_tempo: number, gStagioneId: string) => {
    if (!partita) return;

    const lista = marcatori[periodo] || [];
    const marcatore = lista.find((m) => m.goal_tempo === goal_tempo);
    const giocatore = giocatori.find((g) => g.id === gStagioneId);

    setMarcatori((prev) => {
      const aggiornata = (prev[periodo] || []).map((m) =>
        m.goal_tempo === goal_tempo ? { ...m, giocatore_stagione_id: gStagioneId } : m
      );
      return { ...prev, [periodo]: aggiornata };
    });

    if (marcatore?.id_supabase) {
      await supabase
        .from("marcatori")
        .update({
          giocatore_stagione_id: gStagioneId,
          giocatore_uid: giocatore?.giocatore_uid || null,
        })
        .eq("id", marcatore.id_supabase);
    } else {
      const { data, error } = await supabase
        .from("marcatori")
        .insert({
          partita_id: partita.id,
          stagione_id: partita.stagione_id,
          periodo,
          goal_tempo,
          giocatore_stagione_id: gStagioneId,
          giocatore_uid: giocatore?.giocatore_uid || null,
        })
        .select("id")
        .single();

      if (!error && data) {
        setMarcatori((prev) => {
          const aggiornata = (prev[periodo] || []).map((m) =>
            m.goal_tempo === goal_tempo ? { ...m, id_supabase: data.id } : m
          );
          return { ...prev, [periodo]: aggiornata };
        });
      }
    }
  };

  const avviaInCorso = async () => {
    if (!partita) return;
    await supabase.from("partite").update({ stato: "InCorso" }).eq("id", partita.id);
    setPartita({ ...partita, stato: "InCorso" });
  };

  const salvaStato = async () => {
    if (!partita) return;
    await supabase.from("partite").update({ stato: "Giocata" }).eq("id", partita.id);
    navigate("/risultati");
  };

  // render dropdown marcatori SOLO per Montecarlo e SOLO per il tempo selezionato
  const renderMarcatori = (squadraId: string) => {
    if (!tempo || !squadraId) return null;
    const sideIsMontecarloRender =
      squadraId === MONTECARLO_ID ||
      isMontecarlo(
        squadraId,
        squadraId === squadraCasa?.id ? squadraCasa?.nome : squadraOspite?.nome
      );
    if (!sideIsMontecarloRender) return null;

    const lista = marcatori[tempo] || [];
    const convocatiSet = new Set(convocati);
    const opzioni = giocatori.filter((g) => convocatiSet.has(g.id));

    return (
      <div className="mt-2 space-y-1">
        {lista.map((m) => (
          <select
            key={m.goal_tempo}
            value={m.giocatore_stagione_id || ""}
            onChange={(e) => selezionaMarcatore(tempo, m.goal_tempo, e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">-- Seleziona marcatore --</option>
            {opzioni.map((g) => (
              <option key={g.id} value={g.id}>
                {(g.cognome || "").trim()} {(g.nome || "").trim()}
              </option>
            ))}
          </select>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen p-6">
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-montecarlo overflow-hidden">
          <div className="bg-montecarlo-red-50 p-4 border-l-4 border-montecarlo-secondary flex items-center justify-center space-x-4">
            <span className="bg-montecarlo-accent text-montecarlo-secondary px-3 py-1 rounded-full text-sm font-medium shadow-gold">
              {partita?.campionato_torneo}
            </span>
            {partita?.stato === "DaGiocare" && (
              <button
                onClick={avviaInCorso}
                className="bg-gradient-montecarlo text-white px-3 py-1 rounded-full text-sm font-medium hover:scale-105 transition"
              >
                Partita In Corso
              </button>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Timer */}
            <div className="flex flex-col items-center space-y-2">
              <TimerCircolare
                elapsed={elapsed}
                initialDuration={currentDuration}
                onDurationChange={changeDuration}
              />
              <div className="flex space-x-2">
                <button onClick={startTimer} className="bg-green-500 text-white px-3 py-1 rounded">Avvia</button>
                <button onClick={pauseTimer} className="bg-yellow-500 text-white px-3 py-1 rounded">Pausa</button>
                <button onClick={resetTimer} className="bg-red-500 text-white px-3 py-1 rounded">Reset</button>
              </div>
            </div>

            {/* Pulsante apertura formazione */}
            <button
              onClick={() => setFormazioneAperta(true)}
              className="bg-gradient-montecarlo text-white px-6 py-2 rounded-lg w-full hover:scale-105 transition"
            >
              Formazione
            </button>

            {/* Modal Formazione */}
            {formazioneAperta && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-montecarlo max-w-md w-full space-y-4">
                  <h2 className="text-center text-lg font-semibold">Seleziona Formazione</h2>
                  <div className="max-h-64 overflow-y-auto">
                    {giocatori.map((g) => (
                      <label key={g.id} className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={convocati.includes(g.id)}
                          onChange={() =>
                            setConvocati((prev) =>
                              prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id]
                            )
                          }
                        />
                        {(g.cognome || "").trim()} {(g.nome || "").trim()}
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      if (!partita) return;
                      await supabase.from("presenze").delete().eq("partita_id", id);
                      const rows = convocati.map((gid) => {
                        const g = giocatori.find((x) => x.id === gid);
                        return {
                          partita_id: id,
                          giocatore_stagione_id: gid,
                          stagione_id: partita.stagione_id,
                          nome: (g?.nome || "").trim(),
                          cognome: (g?.cognome || "").trim(),
                        };
                      });
                      if (rows.length > 0) await supabase.from("presenze").insert(rows);
                      setFormazioneAperta(false);
                    }}
                    className="w-full bg-montecarlo-secondary text-white py-2 rounded-lg"
                  >
                    Salva
                  </button>
                </div>
              </div>
            )}

            {/* Bottoni tempi + parziali */}
            <div className="flex justify-center space-x-4">
              {[1, 2, 3, 4].map((t) => (
                <div key={t} className="flex flex-col items-center">
                  <button
                    onClick={() => setTempo(t)}
                    className={`px-7 py-2 rounded-full font-medium ${
                      tempo === t
                        ? "bg-montecarlo-secondary text-white"
                        : "bg-montecarlo-gray-50 text-gray-900 hover:bg-montecarlo-gray-100"
                    }`}
                  >
                    {t}T
                  </button>
                  <span className="text-sm text-gray-900 mt-1">
                    {goalCasa[t - 1]} – {goalOspite[t - 1]}
                  </span>
                </div>
              ))}
            </div>

            {/* Sezione gestione goal */}
            {tempo && (
              <div className="space-y-6">
                {/* Squadra Casa */}
                <div>
                  <div className="flex items-center justify-between p-4 bg-montecarlo-red-50 rounded-lg border border-montecarlo-red-200">
                    <div className="flex items-center space-x-4">
                      {squadraCasa?.logo_url ? (
                        <img
                          src={squadraCasa.logo_url}
                          alt={`${squadraCasa.nome} logo`}
                          className="w-12 h-12 rounded-full border-2 border-montecarlo-accent"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-montecarlo-secondary rounded-full flex items-center justify-center text-white font-bold">
                          {squadraCasa?.nome?.charAt(0)}
                        </div>
                      )}
                      <span className="text-lg font-bold text-montecarlo-secondary">
                        {squadraCasa?.nome} ({totale(goalCasa)})
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => decrementa("casa")} className="text-3xl">−</button>
                      <span className="text-lg font-bold">{goalCasa[tempo - 1]}</span>
                      <button onClick={() => incrementa("casa")} className="text-3xl">+</button>
                    </div>
                  </div>
                  {renderMarcatori(squadraCasa?.id)}
                </div>

                {/* Squadra Ospite */}
                <div>
                  <div className="flex items-center justify-between p-4 bg-montecarlo-gray-50 rounded-lg border border-montecarlo-gray-200">
                    <div className="flex items-center space-x-4">
                      {squadraOspite?.logo_url ? (
                        <img
                          src={squadraOspite.logo_url}
                          alt={`${squadraOspite.nome} logo`}
                          className="w-12 h-12 rounded-full border-2 border-montecarlo-accent"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-montecarlo-secondary rounded-full flex items-center justify-center text-white font-bold">
                          {squadraOspite?.nome?.charAt(0)}
                        </div>
                      )}
                      <span className="text-lg font-bold text-montecarlo-secondary">
                        {squadraOspite?.nome} ({totale(goalOspite)})
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => decrementa("ospite")} className="text-3xl">−</button>
                      <span className="text-lg font-bold">{goalOspite[tempo - 1]}</span>
                      <button onClick={() => incrementa("ospite")} className="text-3xl">+</button>
                    </div>
                  </div>
                  {renderMarcatori(squadraOspite?.id)}
                </div>
              </div>
            )}

            {/* Salva stato partita */}
            <button
              onClick={salvaStato}
              className="w-full bg-montecarlo-secondary text-white py-2 rounded-lg mt-4"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
