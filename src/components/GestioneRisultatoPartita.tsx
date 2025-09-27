// src/components/GestioneRisultatoPartita.tsx
// Data creazione: 18/08/2025 (rev: aggiunta gestione goal subiti portieri + squadra_segnante_id)

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import TimerCircolare from "./TimerCircolare";
import { FaArrowsRotate } from "react-icons/fa6";

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
    { id: string; nome: string | null; cognome: string | null; ruolo?: string | null; giocatore_uid?: string }[]
  >([]);
  const [convocati, setConvocati] = useState<string[]>([]);
  const [titolari, setTitolari] = useState<string[]>([]);

  const [sostituzioniAperte, setSostituzioniAperte] = useState(false);
const [sostituzioni, setSostituzioni] = useState<
  { uscente: string; entrante: string; minuto: number }[]
>([]);
const [giocatoreDaSostituire, setGiocatoreDaSostituire] = useState<string | null>(null);
const [minutiGiocati, setMinutiGiocati] = useState<Record<string, number>>({});

// 🔹 Righe raw da DB (entrata/uscita in secondi)
const [minutiRows, setMinutiRows] = useState<
  { giocatore_stagione_id: string; entrata_sec: number | null; uscita_sec: number | null }[]
>([]);



  const [formazioneAperta, setFormazioneAperta] = useState(false);
  const [goalCasa, setGoalCasa] = useState([0, 0, 0, 0]);
  const [goalOspite, setGoalOspite] = useState([0, 0, 0, 0]);
  const [tempo, setTempo] = useState<number | null>(null);

  const [marcatori, setMarcatori] = useState<
    Record<
      number,
      {
        goal_tempo: number;
        giocatore_stagione_id: string | null;
        portiere_subisce_id?: string | null;
        squadra_segnante_id?: string | null;
        id_supabase?: string;
      }[]
    >
  >({});

  // TIMER
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const totale = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const isMontecarlo = (teamId?: string, teamName?: string) =>
    teamId === MONTECARLO_ID || (teamName || "").toLowerCase().includes("montecarlo");

 // Converte secondi → "MM:SS"
const formatTempo = (sec: number) => {
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};


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
      .select("id, nome, cognome, ruolo, giocatore_uid")
      .eq("stagione_id", p.stagione_id);

    // ⬇️ BLOCCO MINUTI (secondi)
const { data: minutiDB, error: minErr } = await supabase
  .from("minuti_giocati")
  .select("giocatore_stagione_id, entrata_sec, uscita_sec")
  .eq("partita_id", p.id);

if (minErr) console.warn("[minuti_giocati] load:", minErr.message);
setMinutiRows(minutiDB || []);
// ⬆️ FINE BLOCCO MINUTI


    const mapGiocatori = new Map<
      string,
      { id: string; nome: string | null; cognome: string | null; ruolo?: string | null; giocatore_uid?: string }
    >();
    (giocatoriStagione || []).forEach((g) => {
      mapGiocatori.set(g.id, {
        id: g.id,
        nome: g.nome ?? null,
        cognome: g.cognome ?? null,
        ruolo: g.ruolo ?? null,
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
      .select(
        "giocatore_stagione_id, periodo, goal_tempo, portiere_subisce_id, squadra_segnante_id, id"
      )
      .eq("partita_id", p.id);

    const perPeriodo: Record<number, any[]> = {};
    marcatoriDB?.forEach((m) => {
      perPeriodo[m.periodo] = perPeriodo[m.periodo] || [];
      perPeriodo[m.periodo].push({
        goal_tempo: m.goal_tempo,
        giocatore_stagione_id: m.giocatore_stagione_id,
        portiere_subisce_id: m.portiere_subisce_id,
        squadra_segnante_id: m.squadra_segnante_id,
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

      // realtime marcatori
      subMarcatori = supabase
        .channel("realtime-marcatori")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "marcatori", filter: `partita_id=eq.${p.id}` },
          async () => {
            const { data: live } = await supabase
              .from("marcatori")
              .select(
                "giocatore_stagione_id, periodo, goal_tempo, portiere_subisce_id, squadra_segnante_id, id"
              )
              .eq("partita_id", p.id);
            const perLive: Record<number, any[]> = {};
            live?.forEach((m) => {
              perLive[m.periodo] = perLive[m.periodo] || [];
              perLive[m.periodo].push({
                goal_tempo: m.goal_tempo,
                giocatore_stagione_id: m.giocatore_stagione_id,
                portiere_subisce_id: m.portiere_subisce_id,
                squadra_segnante_id: m.squadra_segnante_id,
                id_supabase: m.id,
              });
            });
            setMarcatori(perLive);
          }
        )
        .subscribe();

      // stato timer iniziale
      const { data: t, error: tErr } = await supabase
  .from("partita_timer_state")
  .select("*")
  .eq("partita_id", p.id)
  .maybeSingle();
if (tErr) console.warn("[partita_timer_state] maybeSingle:", tErr.message);
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

  // 🔹 Ricalcolo continuo dei secondi giocati per ogni giocatore
useEffect(() => {
  if (!minutiRows) return;
  const nowSec = Math.floor(elapsed / 1000);
  const calcolati: Record<string, number> = {};

  minutiRows.forEach((r) => {
    const inSec = r.entrata_sec ?? 0;
    const outSec = r.uscita_sec ?? nowSec; // se è in campo, usa il timer attuale
    const diff = outSec - inSec;
    if (diff > 0) {
      calcolati[r.giocatore_stagione_id] =
        (calcolati[r.giocatore_stagione_id] || 0) + diff;
    }
  });

  setMinutiGiocati(calcolati); // valori in secondi
}, [minutiRows, elapsed]);


  // durata corrente "sorgente unica"
  const currentDuration = timerState?.timer_duration_min ?? 20;

  const startTimer = async () => {
  if (!id) return;

  // Avvia/aggiorna timer
  await supabase.from("partita_timer_state").upsert({
    partita_id: id,
    timer_duration_min: currentDuration,
    timer_started_at: new Date().toISOString(),
    timer_status: "running",
  });

  // Registra entrata dei titolari se non hanno già una riga "aperta"
  const nowSec = Math.floor(elapsed / 1000);

  if (titolari.length > 0) {
    // DB
    await supabase
      .from("minuti_giocati")
      .insert(
        titolari
          .filter(
            (gid) =>
              !minutiRows.some(
                (r) => r.giocatore_stagione_id === gid && r.uscita_sec === null
              )
          )
          .map((gid) => ({
            partita_id: id,
            giocatore_stagione_id: gid,
            entrata_sec: nowSec, // ⬅️ secondi correnti
            uscita_sec: null,
          }))
      );
  }

  // Stato locale
  setMinutiRows((prev) => {
    const aperti = new Set(
      prev.filter((r) => r.uscita_sec === null).map((r) => r.giocatore_stagione_id)
    );
    const toAdd = titolari
      .filter((gid) => !aperti.has(gid))
      .map((gid) => ({
        giocatore_stagione_id: gid,
        entrata_sec: nowSec,
        uscita_sec: null,
      }));
    return [...prev, ...toAdd];
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

  // =====================
  // MARCATORI / PORTIERI – helper locali & DB
  // =====================
  const aggiornaMarcatoriLocal = (periodo: number, nuovi: any[]) => {
    setMarcatori((prev) => ({ ...prev, [periodo]: nuovi }));
  };

  const aggiornaGoalDB = async (goalA: number[], goalB: number[]) => {
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

  // Inserisce una riga "gol segnato da Montecarlo" (marcatore da scegliere)
  const aggiungiMarcatore = async (periodo: number) => {
    if (!partita) return;
    const goal_tempo = (marcatori[periodo]?.length || 0) + 1;

    const { data, error } = await supabase
      .from("marcatori")
      .insert({
        partita_id: partita.id,
        stagione_id: partita.stagione_id,
        periodo,
        goal_tempo,
        giocatore_stagione_id: null,
        giocatore_uid: null,
        portiere_subisce_id: null,
        squadra_segnante_id: MONTECARLO_ID,
      })
      .select(
        "id, periodo, goal_tempo, giocatore_stagione_id, portiere_subisce_id, squadra_segnante_id"
      )
      .single();

    if (!error && data) {
      const attuali = marcatori[periodo] || [];
      aggiornaMarcatoriLocal(periodo, [
        ...attuali,
        {
          goal_tempo: data.goal_tempo,
          giocatore_stagione_id: data.giocatore_stagione_id,
          portiere_subisce_id: data.portiere_subisce_id,
          squadra_segnante_id: data.squadra_segnante_id,
          id_supabase: data.id,
        },
      ]);
    }
  };

  // Inserisce una riga "gol SUBITO da Montecarlo" (portiere da scegliere)
  const aggiungiGolSubito = async (periodo: number, side: "casa" | "ospite") => {
    if (!partita) return;
    const goal_tempo = (marcatori[periodo]?.length || 0) + 1;
    const squadraSegnanteId =
      side === "casa" ? partita.squadra_casa_id : partita.squadra_ospite_id;

    const { data, error } = await supabase
      .from("marcatori")
      .insert({
        partita_id: partita.id,
        stagione_id: partita.stagione_id,
        periodo,
        goal_tempo,
        giocatore_stagione_id: null, // non è un marcatore MC
        giocatore_uid: null,
        portiere_subisce_id: null, // lo scegli dopo
        squadra_segnante_id: squadraSegnanteId,
      })
      .select(
        "id, periodo, goal_tempo, giocatore_stagione_id, portiere_subisce_id, squadra_segnante_id"
      )
      .single();

    if (!error && data) {
      const attuali = marcatori[periodo] || [];
      aggiornaMarcatoriLocal(periodo, [
        ...attuali,
        {
          goal_tempo: data.goal_tempo,
          giocatore_stagione_id: data.giocatore_stagione_id,
          portiere_subisce_id: data.portiere_subisce_id,
          squadra_segnante_id: data.squadra_segnante_id,
          id_supabase: data.id,
        },
      ]);
    }
  };

  // Incrementa/decrementa punteggio + crea/elimina riga marcatori coerentemente
  const incrementa = async (side: "casa" | "ospite") => {
    if (!tempo || !partita) return;

    // aggiorna scoreboard locale
    const idx = tempo - 1;
    const nuovaA = [...goalCasa];
    const nuovaB = [...goalOspite];
    if (side === "casa") nuovaA[idx]++; else nuovaB[idx]++;
    setGoalCasa(nuovaA);
    setGoalOspite(nuovaB);
    await aggiornaGoalDB(nuovaA, nuovaB);

    // determina chi è Montecarlo su questo lato
    const haSegnatoMontecarlo =
      side === "casa"
        ? isMontecarlo(partita.squadra_casa_id, squadraCasa?.nome)
        : isMontecarlo(partita.squadra_ospite_id, squadraOspite?.nome);

    // crea riga marcatori coerente
    if (haSegnatoMontecarlo) {
      await aggiungiMarcatore(tempo);
    } else {
      await aggiungiGolSubito(tempo, side);
    }
  };

  const decrementa = async (side: "casa" | "ospite") => {
  if (!tempo || !partita) return;

  const idx = tempo - 1;

  // 1) individua quale squadra ha segnato (quella del lato su cui stiamo togliendo)
  const squadraSegnanteId =
    side === "casa" ? partita.squadra_casa_id : partita.squadra_ospite_id;

  const attuali = marcatori[tempo] || [];

  // 2) trova l’ULTIMA riga di quel periodo per quella squadra
  let targetIndex = -1;
  for (let i = attuali.length - 1; i >= 0; i--) {
    if (attuali[i].squadra_segnante_id === squadraSegnanteId) {
      targetIndex = i;
      break;
    }
  }

  // Se non c'è una riga coerente da togliere, non toccare lo score
  if (targetIndex === -1) return;

  const target = attuali[targetIndex];

  // 3) aggiorna lo scoreboard locale
  const nuovaA = [...goalCasa];
  const nuovaB = [...goalOspite];
  if (side === "casa" && nuovaA[idx] > 0) nuovaA[idx]--;
  if (side === "ospite" && nuovaB[idx] > 0) nuovaB[idx]--;
  setGoalCasa(nuovaA);
  setGoalOspite(nuovaB);

  // 4) elimina dal DB la riga corretta
  if (target?.id_supabase) {
    await supabase.from("marcatori").delete().eq("id", target.id_supabase);
  } else {
    await supabase
      .from("marcatori")
      .delete()
      .eq("partita_id", partita.id)
      .eq("periodo", tempo)
      .eq("goal_tempo", target.goal_tempo)
      .eq("squadra_segnante_id", squadraSegnanteId);
  }

  // 5) aggiorna lo stato locale dei marcatori e il totale DB
  const nuovaLista = [...attuali.slice(0, targetIndex), ...attuali.slice(targetIndex + 1)];
  aggiornaMarcatoriLocal(tempo, nuovaLista);
  await aggiornaGoalDB(nuovaA, nuovaB);
};


  // Assegna marcatore (solo per gol segnati da MC)
  const selezionaMarcatore = async (periodo: number, goal_tempo: number, gStagioneId: string) => {
    if (!partita) return;
    const gioc = giocatori.find((g) => g.id === gStagioneId);

    // update locale
    setMarcatori((prev) => {
      const aggiornata = (prev[periodo] || []).map((m) =>
        m.goal_tempo === goal_tempo ? { ...m, giocatore_stagione_id: gStagioneId } : m
      );
      return { ...prev, [periodo]: aggiornata };
    });

    // update DB
    const entry = (marcatori[periodo] || []).find((m) => m.goal_tempo === goal_tempo);
    if (entry?.id_supabase) {
      await supabase
        .from("marcatori")
        .update({
          giocatore_stagione_id: gStagioneId,
          giocatore_uid: gioc?.giocatore_uid || null,
        })
        .eq("id", entry.id_supabase);
    } else {
      await supabase
        .from("marcatori")
        .update({
          giocatore_stagione_id: gStagioneId,
          giocatore_uid: gioc?.giocatore_uid || null,
        })
        .eq("partita_id", partita.id)
        .eq("periodo", periodo)
        .eq("goal_tempo", goal_tempo);
    }
  };

  const salvaSostituzione = async (uscente: string, entrante: string, _minutoIgnored: number) => {
  if (!partita) return;

  const nowSec = Math.floor(elapsed / 1000);

  // Chi esce → chiudi la sua riga aperta
  await supabase
    .from("minuti_giocati")
    .update({ uscita_sec: nowSec })
    .eq("partita_id", partita.id)
    .eq("giocatore_stagione_id", uscente)
    .is("uscita_sec", null);

  // Chi entra → nuova riga
  await supabase.from("minuti_giocati").insert({
    partita_id: partita.id,
    giocatore_stagione_id: entrante,
    entrata_sec: nowSec,
    uscita_sec: null,
  });

  // Stato locale
  setMinutiRows((prev) => {
    const updated = prev.map((r) =>
      r.giocatore_stagione_id === uscente && r.uscita_sec === null
        ? { ...r, uscita_sec: nowSec }
        : r
    );
    updated.push({
      giocatore_stagione_id: entrante,
      entrata_sec: nowSec,
      uscita_sec: null,
    });
    return updated;
  });

  // Aggiorna elenco titolari
  setTitolari((prev) => {
    const senzaUscente = prev.filter((id) => id !== uscente);
    return [...senzaUscente, entrante];
  });
};




  // Assegna portiere che subisce (solo per gol NON MC)
  const selezionaPortiereSubisce = async (periodo: number, goal_tempo: number, gStagioneId: string) => {
    if (!partita) return;

    // update locale
    setMarcatori((prev) => {
      const aggiornata = (prev[periodo] || []).map((m) =>
        m.goal_tempo === goal_tempo ? { ...m, portiere_subisce_id: gStagioneId } : m
      );
      return { ...prev, [periodo]: aggiornata };
    });

    // update DB
    const entry = (marcatori[periodo] || []).find((m) => m.goal_tempo === goal_tempo);
    if (entry?.id_supabase) {
      await supabase
        .from("marcatori")
        .update({ portiere_subisce_id: gStagioneId || null })
        .eq("id", entry.id_supabase);
    } else {
      await supabase
        .from("marcatori")
        .update({ portiere_subisce_id: gStagioneId || null })
        .eq("partita_id", partita.id)
        .eq("periodo", periodo)
        .eq("goal_tempo", goal_tempo);
    }
  };

  // =====================
  // RENDER helper
  // =====================
  // Dropdown marcatori: SOLO sotto Montecarlo (mostra tutte le righe con squadra_segnante_id === MC)
  const renderMarcatori = (squadraId?: string) => {
    if (!tempo || !squadraId) return null;
    const isMC = isMontecarlo(
      squadraId,
      squadraId === squadraCasa?.id ? squadraCasa?.nome : squadraOspite?.nome
    );
    if (!isMC) return null;

    const lista = (marcatori[tempo] || []).filter(
      (m) => m.squadra_segnante_id === MONTECARLO_ID
    );
    const convocatiSet = new Set(convocati);
    const opzioni = giocatori.filter((g) => convocatiSet.has(g.id));

    return (
      <div className="container mx-auto px-2">
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

  // Dropdown portieri: SOLO sotto l’altra squadra (righe con squadra_segnante_id !== MC)
  const renderPortieriSubiti = (squadraId?: string) => {
    if (!tempo || !squadraId) return null;
    const isMC = isMontecarlo(
      squadraId,
      squadraId === squadraCasa?.id ? squadraCasa?.nome : squadraOspite?.nome
    );
    if (isMC) return null;

    const lista = (marcatori[tempo] || []).filter(
      (m) => m.squadra_segnante_id && m.squadra_segnante_id !== MONTECARLO_ID
    );
    const convocatiSet = new Set(convocati);

    const opzioniPortieri = giocatori.filter(
      (g) => convocatiSet.has(g.id) && (g.ruolo || "").toLowerCase() === "portiere"
    );

    

    return (
      <div className="container mx-auto px-2">
        {lista.map((m) => (
          <select
            key={m.goal_tempo}
            value={m.portiere_subisce_id || ""}
            onChange={(e) => selezionaPortiereSubisce(tempo, m.goal_tempo, e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">-- Seleziona portiere --</option>
            {opzioniPortieri.map((g) => (
              <option key={g.id} value={g.id}>
                {(g.cognome || "").trim()} {(g.nome || "").trim()}
              </option>
            ))}
          </select>
        ))}
      </div>
    );
  };

  // =====================
  // Altre azioni di pagina
  // =====================
    const avviaInCorso = async () => {
    if (!partita) return;
    await supabase.from("partite").update({ stato: "InCorso" }).eq("id", partita.id);
    setPartita({ ...partita, stato: "InCorso" });
  };

  const salvaStato = async () => {
  if (!partita) return;

  const nowSec = Math.floor(elapsed / 1000);

  // 1. Chiudi eventuali righe aperte in minuti_giocati
  await supabase
    .from("minuti_giocati")
    .update({ uscita_sec: nowSec })
    .eq("partita_id", partita.id)
    .is("uscita_sec", null);

  // 2. Ricarica minuti_giocati per calcolare i totali
  const { data: minutiDB } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id, entrata_sec, uscita_sec")
    .eq("partita_id", partita.id);

  if (minutiDB) {
    const totali: Record<string, number> = {};

    minutiDB.forEach((m) => {
      const inSec = m.entrata_sec ?? 0;
      const outSec = m.uscita_sec ?? nowSec;
      const diff = outSec - inSec;
      if (diff > 0) {
        totali[m.giocatore_stagione_id] =
          (totali[m.giocatore_stagione_id] || 0) + diff;
      }
    });

    // 3. Inserisci/aggiorna i totali nella nuova tabella
    const rows = Object.entries(totali).map(([gid, sec]) => ({
      partita_id: partita.id,
      giocatore_stagione_id: gid,
      tempo_giocato_sec: sec,
    }));

    if (rows.length > 0) {
      await supabase.from("minuti_giocati_totali").upsert(rows, {
        onConflict: "partita_id,giocatore_stagione_id",
      });
    }
  }

  // 4. Svuota la tabella minuti_giocati per questa partita
  await supabase.from("minuti_giocati").delete().eq("partita_id", partita.id);

  // 5. Aggiorna lo stato della partita
  await supabase.from("partite").update({ stato: "Giocata" }).eq("id", partita.id);

  navigate("/risultati");
};

const salvaStatoConferma = async () => {
  if (!window.confirm("Sei sicuro di voler salvare e chiudere la partita come 'Giocata'?")) {
    return;
  }
  await salvaStato();
};



  // =====================
  // RENDER
  // =====================
  return (
    <div className="bg-white p-6 mt-8">
      <div className="space-y-6">
        
          {/* Testata con campionato + pulsante stato */}
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
            {/* TIMER */}
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
  Convocati
</button>

<button
  onClick={() => setSostituzioniAperte(true)}
  className="bg-gradient-montecarlo text-white px-6 py-2 rounded-lg w-full hover:scale-105 transition"
>
  Sostituzioni
</button>

            {/* Modal Convocati + Titolari */}
{formazioneAperta && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-montecarlo max-w-md w-full mx-2 space-y-4">
      <h2 className="text-center text-lg font-semibold">Seleziona Convocati & Titolari</h2>

      {/* Pulsanti rapidi */}
      <div className="flex justify-between text-xs mb-2">
        <button
          onClick={() => {
            if (convocati.length === giocatori.length) {
              setConvocati([]); // deseleziona tutto
            } else {
              setConvocati(giocatori.map((g) => g.id)); // seleziona tutti
            }
          }}
          className="px-2 py-1 bg-montecarlo-gray-100 rounded hover:bg-montecarlo-gray-200"
        >
          {convocati.length === giocatori.length ? "Deseleziona Convocati" : "Seleziona Convocati"}
        </button>

        <button
          onClick={() => {
            if (titolari.length === giocatori.length) {
              setTitolari([]); // deseleziona tutto
            } else {
              setTitolari(giocatori.map((g) => g.id)); // seleziona tutti
            }
          }}
          className="px-2 py-1 bg-montecarlo-gray-100 rounded hover:bg-montecarlo-gray-200"
        >
          {titolari.length === giocatori.length ? "Deseleziona Titolari" : "Seleziona Titolari"}
        </button>
      </div>

      {/* Lista giocatori */}
<div className="max-h-64 overflow-y-auto">
  {giocatori.map((g) => (
    <div
  key={g.id}
  className="flex items-center py-1 border-b"
>
  {/* Nome + minuti giocati */}
  <span className="text-sm flex items-center w-2/3">
    {(g.cognome || "").trim()} {(g.nome || "").trim()}
    <span className="ml-2 text-xs text-gray-500">
      {minutiGiocati[g.id] ? formatTempo(minutiGiocati[g.id]) : "0:00"}
    </span>
  </span>

  {/* Checkbox Convocato + Titolare */}
  <div className="flex items-center gap-6 w-1/3 justify-start">
    {/* Convocato */}
    <label className="flex items-center gap-1 text-xs">
      <span>Conv</span>
      <input
        type="checkbox"
        checked={convocati.includes(g.id)}
        onChange={() =>
          setConvocati((prev) =>
            prev.includes(g.id)
              ? prev.filter((x) => x !== g.id)
              : [...prev, g.id]
          )
        }
      />
    </label>

    {/* Titolare */}
    <label className="flex items-center gap-1 text-xs">
      <span>Titol</span>
      <input
        type="checkbox"
        checked={titolari.includes(g.id)}
        disabled={!convocati.includes(g.id)} // disabilita se non convocato
        onChange={() =>
          setTitolari((prev) =>
            prev.includes(g.id)
              ? prev.filter((x) => x !== g.id)
              : [...prev, g.id]
          )
        }
      />
    </label>
  </div>
</div>

  ))}
</div>


      <button
        onClick={async () => {
          if (!partita) return;
          await supabase.from("presenze").delete().eq("partita_id", id);

          // Salva convocati
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

{/* Modal Sostituzioni */}
{sostituzioniAperte && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-montecarlo max-w-md w-full mx-2 space-y-4">
      <h2 className="text-center text-lg font-semibold">Gestione Sostituzioni</h2>

      <div className="max-h-64 overflow-y-auto space-y-3">
        {titolari.map((tid) => {
          const gioc = giocatori.find((g) => g.id === tid);
          if (!gioc) return null;

          return (
            <div key={tid} className="flex flex-col border-b pb-2">
              {/* Riga titolare + icona sostituzione */}
              <div className="flex items-center justify-between pr-2">
                <span className="text-sm flex items-center">
                  {(gioc.cognome || "").trim()} {(gioc.nome || "").trim()}
                  <span className="ml-2 text-xs text-gray-500">
  {formatTempo(minutiGiocati[tid] || 0)}
</span>
                </span>
                <FaArrowsRotate
                  className="w-5 h-5 text-green-600 cursor-pointer mr-2"
                  onClick={() => setGiocatoreDaSostituire(tid)}
                />
              </div>

              {/* Dropdown per selezionare il sostituto */}
              {giocatoreDaSostituire === tid && (
                <select
                  className="mt-2 border px-2 py-1 rounded"
                  onChange={(e) => {
                    const entrante = e.target.value;
                    if (entrante) {
                      const minuto = Math.floor(elapsed / 1000); // secondi correnti
                      setSostituzioni((prev) => [
                        ...prev,
                        { uscente: tid, entrante, minuto },
                      ]);
                      salvaSostituzione(tid, entrante, minuto);
                      setGiocatoreDaSostituire(null); // chiude il select
                    }
                  }}
                >
                  <option value="">-- Seleziona sostituto --</option>
                  {convocati
                    .filter((c) => !titolari.includes(c)) // SOLO panchinari
                    .map((pid) => {
                      const g = giocatori.find((gg) => gg.id === pid);
                      if (!g) return null;
                      return (
                        <option key={pid} value={pid}>
                          {(g.cognome || "").trim()} {(g.nome || "").trim()}
                        </option>
                      );
                    })}
                </select>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setSostituzioniAperte(false)}
        className="w-full bg-red-500 text-white py-2 rounded-lg"
      >
        Chiudi
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
                          alt={`${squadraCasa?.nome || "Casa"} logo`}
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
                  {/* SOTTO MONTECARLO: marcatori ; SOTTO NON-MC: portieri subiti */}
                  {isMontecarlo(squadraCasa?.id, squadraCasa?.nome)
                    ? renderMarcatori(squadraCasa?.id)
                    : renderPortieriSubiti(squadraCasa?.id)}
                </div>

                {/* Squadra Ospite */}
                <div>
                  <div className="flex items-center justify-between p-4 bg-montecarlo-gray-50 rounded-lg border border-montecarlo-gray-200">
                    <div className="flex items-center space-x-4">
                      {squadraOspite?.logo_url ? (
                        <img
                          src={squadraOspite.logo_url}
                          alt={`${squadraOspite?.nome || "Ospite"} logo`}
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
                  {/* SOTTO MONTECARLO: marcatori ; SOTTO NON-MC: portieri subiti */}
                  {isMontecarlo(squadraOspite?.id, squadraOspite?.nome)
                    ? renderMarcatori(squadraOspite?.id)
                    : renderPortieriSubiti(squadraOspite?.id)}
                </div>
              </div>
            )}



            {/* Salva stato */}
            <button
  onClick={salvaStatoConferma}
  className="w-full bg-montecarlo-secondary text-white py-2 rounded-lg mt-4"
>
  Salva
</button>
          </div>
        </div>
      </div>
   
  );
}