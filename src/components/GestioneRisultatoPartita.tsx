// src/components/GestioneRisultatoPartita.tsx
// Data creazione: 18/08/2025 (rev: aggiunta gestione goal subiti portieri + squadra_segnante_id + minuti giocati)

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import TimerCircolare from "./TimerCircolare";
import { FaArrowsRotate } from "react-icons/fa6";
import CampoFormazione from "../components/CampoFormazione";

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

  // ========================
  // Stati partita e squadre
  // ========================
  const [partita, setPartita] = useState<any>(null);
  const [squadraCasa, setSquadraCasa] = useState<any>(null);
  const [squadraOspite, setSquadraOspite] = useState<any>(null);

  // ========================
  // Stati giocatori
  // ========================
  const [giocatori, setGiocatori] = useState<
    {
      id: string;
      nome: string | null;
      cognome: string | null;
      ruolo?: string | null;
      giocatore_uid?: string;
    }[]
  >([]);
  const [convocati, setConvocati] = useState<string[]>([]);
  const [titolari, setTitolari] = useState<string[]>([]);
  const [refreshCampo, setRefreshCampo] = useState(0);

  // ========================
  // Stati sostituzioni e minuti giocati
  // ========================
  const [sostituzioniAperte, setSostituzioniAperte] = useState(false);
  const [sostituzioni, setSostituzioni] = useState<
    { uscente: string; entrante: string; minuto: number }[]
  >([]);
  const [uscenteSelezionato, setUscenteSelezionato] = useState<string | null>(null);

  // minuti giocati calcolati (secondi)
  const [minutiGiocati, setMinutiGiocati] = useState<Record<string, number>>({});

  // tempo di riferimento interno del timer (in secondi)
  const [nowSec, setNowSec] = useState(0);

  // righe raw da DB (entrata/uscita in secondi)
  const [minutiRows, setMinutiRows] = useState<
    { giocatore_stagione_id: string; entrata_sec: number | null; uscita_sec: number | null }[]
  >([]);

  // per editing manuale dei minuti giocati
const [editingTime, setEditingTime] = useState<string | null>(null);
const [manualTime, setManualTime] = useState<string>("");

  // ========================
  // Stati UI
  // ========================
  const [formazioneAperta, setFormazioneAperta] = useState(false);
  const [goalCasa, setGoalCasa] = useState([0, 0, 0, 0]);
  const [goalOspite, setGoalOspite] = useState([0, 0, 0, 0]);
  const [tempo, setTempo] = useState<number | null>(null);

  // ========================
  // Stati marcatori
  // ========================
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

  // ========================
  // Timer
  // ========================
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // ========================
  // Helper
  // ========================
  const totale = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const isMontecarlo = (teamId?: string, teamName?: string) =>
    teamId === MONTECARLO_ID ||
    (teamName || "").toLowerCase().includes("montecarlo");

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
    // 1) Carico la partita
    const { data: p, error: errP } = await supabase
      .from("partite")
      .select("*")
      .eq("id", id)
      .single();
    if (errP || !p) {
      console.error("Errore fetch partita:", errP?.message);
      return;
    }
    setPartita(p);
    setGoalCasa([p.goal_a1, p.goal_a2, p.goal_a3, p.goal_a4]);
    setGoalOspite([p.goal_b1, p.goal_b2, p.goal_b3, p.goal_b4]);

    // 2) Squadre
    const [resCasa, resOspite] = await Promise.all([
      supabase.from("squadre").select("*").eq("id", p.squadra_casa_id).single(),
      supabase.from("squadre").select("*").eq("id", p.squadra_ospite_id).single(),
    ]);
    setSquadraCasa(resCasa.data);
    setSquadraOspite(resOspite.data);

    // 3) Presenze (convocati + titolari)
    const { data: presenze } = await supabase
      .from("presenze")
      .select("giocatore_stagione_id, nome, cognome, titolare")
      .eq("partita_id", id);

    if (presenze && presenze.length > 0) {
      setConvocati(presenze.map((p) => p.giocatore_stagione_id));
      setTitolari(presenze.filter((p) => p.titolare).map((p) => p.giocatore_stagione_id));
    } else {
      setConvocati([]);
      setTitolari([]);
    }

    // 4) Giocatori stagione (lista completa)
    const { data: giocatoriStagione, error: errG } = await supabase
      .from("giocatori_stagioni")
      .select("id, nome, cognome, ruolo, giocatore_uid")
      .eq("stagione_id", p.stagione_id);

    if (errG) console.error("Errore fetch giocatori_stagioni:", errG.message);

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

    // 5) Minuti giocati già registrati
    const { data: minutiDB, error: minErr } = await supabase
      .from("minuti_giocati")
      .select("giocatore_stagione_id, entrata_sec, uscita_sec")
      .eq("partita_id", p.id);

    if (minErr) console.warn("[minuti_giocati] load:", minErr.message);
    setMinutiRows(minutiDB || []);

    // 6) Marcatori
    const { data: marcatoriDB } = await supabase
      .from("marcatori")
      .select("giocatore_stagione_id, periodo, goal_tempo, portiere_subisce_id, squadra_segnante_id, id")
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

    // 7) Stato timer (non resetta al refresh)
    const { data: t, error: tErr } = await supabase
      .from("partita_timer_state")
      .select("*")
      .eq("partita_id", p.id)
      .maybeSingle();

    if (tErr) console.warn("[partita_timer_state] maybeSingle:", tErr.message);
    if (t) {
      setTimerState(t);
      if (t.timer_status === "running" && t.timer_started_at) {
        const started = new Date(t.timer_started_at).getTime();
        setElapsed(t.timer_offset_ms + (Date.now() - started));
      } else {
        setElapsed(t.timer_offset_ms);
      }
    }

    // 8) Realtime partite
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

    // 9) Realtime marcatori
    subMarcatori = supabase
      .channel("realtime-marcatori")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marcatori", filter: `partita_id=eq.${p.id}` },
        async () => {
          const { data: live } = await supabase
            .from("marcatori")
            .select("giocatore_stagione_id, periodo, goal_tempo, portiere_subisce_id, squadra_segnante_id, id")
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

    // 10) Realtime timer
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
  if (timerState?.timer_status === "running" && timerState.timer_started_at) {
    interval = setInterval(() => {
      const started = new Date(timerState.timer_started_at!).getTime();
      setElapsed(timerState.timer_offset_ms + (Date.now() - started));
    }, 1000);
  } else if (timerState) {
    setElapsed(timerState.timer_offset_ms);
  }
  return () => {
    if (interval) clearInterval(interval);
  };
}, [timerState]);

// 🔹 Aggiorna "nowSec" ogni secondo mentre il timer è attivo
useEffect(() => {
  let interval: NodeJS.Timeout | null = null;
  if (timerState?.timer_status === "running") {
    interval = setInterval(() => {
      setNowSec((prev) => prev + 1);
    }, 1000);
  } else {
    if (timerState?.timer_status === "paused") {
      // conserva il valore attuale
      setNowSec((prev) => prev);
    } else if (timerState?.timer_status === "stopped") {
      setNowSec(0);
    }
  }
  return () => {
    if (interval) clearInterval(interval);
  };
}, [timerState?.timer_status]);


// 🔹 Ricalcolo continuo dei minuti giocati visibili nel menu convocati
useEffect(() => {
  if (!partita || timerState?.timer_status !== "running") return;

  setMinutiGiocati((prev) => {
    const aggiornati: Record<string, number> = { ...prev };
    titolari.forEach((id) => {
      aggiornati[id] = (aggiornati[id] || 0) + 1;
    });
    return aggiornati;
  });
}, [nowSec]);






  /// durata corrente "sorgente unica"
const currentDuration = timerState?.timer_duration_min ?? 20;

// Avvia o riprende il timer (con debug)
const startTimer = async () => {
  if (!id) {
    console.error("❌ startTimer chiamato senza id partita");
    return;
  }

  console.log("▶️ startTimer avviato | partitaId:", id, " | titolari:", titolari);

  const now = new Date().toISOString();
  const nowSec = Math.floor(elapsed / 1000);

  // 1️⃣ Recupera giocatori attualmente in campo dalla formazione
  const { data: formazione, error: formErr } = await supabase
    .from("formazioni_partita")
    .select("giocatore_stagione_id")
    .eq("partita_id", id);

  if (formErr) console.error("❌ Errore fetch formazione:", formErr.message);
  console.log("📋 formazione inCampoIds:", formazione);

  let inCampoIds = formazione?.map((f) => f.giocatore_stagione_id) || [];

  // 🔹 Se la formazione non è ancora stata salvata (es. primo tempo), usa i titolari
  if (inCampoIds.length === 0 && titolari.length > 0) {
    console.log("⚠️ formazione vuota, uso titolari come fallback");
    inCampoIds = [...titolari];
  }

  console.log("✅ Giocatori considerati in campo:", inCampoIds);

  // 2️⃣ Recupera righe già aperte in minuti_giocati
  const { data: righeAperte, error: apertiErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id")
    .eq("partita_id", id)
    .is("uscita_sec", null);

  if (apertiErr) console.error("❌ Errore fetch righeAperte:", apertiErr.message);
  console.log("📊 righeAperte (uscita_sec=null):", righeAperte);

  const apertiSet = new Set(righeAperte?.map((r) => r.giocatore_stagione_id) || []);

  // 3️⃣ Crea righe nuove solo per chi è in campo ma non ha riga aperta
  const nuoveRighe = inCampoIds
    .filter((gid) => !apertiSet.has(gid))
    .map((gid) => ({
      partita_id: id,
      giocatore_stagione_id: gid,
      entrata_sec: nowSec,
      uscita_sec: null,
    }));

  console.log("🆕 nuoveRighe da inserire:", nuoveRighe);

  if (nuoveRighe.length > 0) {
    const { error: insErr } = await supabase.from("minuti_giocati").insert(nuoveRighe);
    if (insErr) console.error("❌ Errore insert minuti_giocati:", insErr.message);
    else console.log("✅ nuove righe inserite con successo");
  } else {
    console.log("ℹ️ Nessuna nuova riga da inserire (tutti già in campo)");
  }

  // 4️⃣ Ricarica righe aggiornate
  const { data: minutiAggiornati, error: minErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id, entrata_sec, uscita_sec")
    .eq("partita_id", id);

  if (minErr) console.error("❌ Errore fetch minutiAggiornati:", minErr.message);
  console.log("⏱️ minutiAggiornati dal DB:", minutiAggiornati);

  setMinutiRows(minutiAggiornati || []);

  // 5️⃣ Aggiorna timer nel DB
  const { error: timerErr } = await supabase.from("partita_timer_state").upsert({
    partita_id: id,
    timer_duration_min: currentDuration,
    timer_started_at: now,
    timer_status: "running",
    timer_offset_ms: timerState?.timer_offset_ms || 0,
  });

  if (timerErr) console.error("❌ Errore upsert timer:", timerErr.message);
  else console.log("⏱️ Timer DB aggiornato correttamente");

  // 6️⃣ Aggiorna stato locale
  setTimerState((prev) => ({
    ...(prev || {}),
    partita_id: id,
    timer_duration_min: currentDuration,
    timer_started_at: now,
    timer_status: "running",
    timer_offset_ms: prev?.timer_offset_ms || 0,
  }));

  console.log("🏁 Stato locale timer aggiornato");
};


// Metti in pausa il timer
const pauseTimer = async () => {
  if (!id || !timerState?.timer_started_at) return;

  const diff = Date.now() - new Date(timerState.timer_started_at).getTime();

  await supabase
    .from("partita_timer_state")
    .update({
      timer_offset_ms: (timerState.timer_offset_ms || 0) + diff,
      timer_started_at: null,
      timer_status: "paused",
    })
    .eq("partita_id", id);

  setTimerState((prev) => ({
    ...(prev || {}),
    timer_offset_ms: (prev?.timer_offset_ms || 0) + diff,
    timer_started_at: null,
    timer_status: "paused",
  }));
};

// 🔹 Reset Timer + chiusura delle run aperte (fine tempo)
const resetTimer = async () => {
  try {
    if (!id) return;

    // Se elapsed non è ancora definito, interrompi
    if (typeof elapsed !== "number" || isNaN(elapsed)) {
      console.warn("⏹ resetTimer ignorato: elapsed non valido");
      return;
    }

    // 1️⃣ Calcola il tempo totale trascorso (in secondi)
    const nowSec = Math.floor(elapsed / 1000);
    console.log("⏱️ Chiusura run aperte al secondo:", nowSec);

    // 2️⃣ Chiudi tutte le run ancora aperte in minuti_giocati
    const { error: closeErr } = await supabase
      .from("minuti_giocati")
      .update({ uscita_sec: nowSec })
      .eq("partita_id", id)
      .is("uscita_sec", null);

    if (closeErr) {
      console.error("❌ Errore chiusura run aperte al reset:", closeErr.message);
    } else {
      console.log("✅ Tutte le run aperte chiuse correttamente a", nowSec);
    }

    // 3️⃣ Aggiorna lo stato del timer nel DB
    const { error: timerErr } = await supabase
      .from("partita_timer_state")
      .update({
        timer_offset_ms: 0,
        timer_started_at: null,
        timer_status: "stopped",
      })
      .eq("partita_id", id);

    if (timerErr) {
      console.error("⚠️ Errore aggiornamento timer_state:", timerErr.message);
    } else {
      console.log("🕒 Timer resettato correttamente");
    }

    // 4️⃣ Aggiorna stato locale del timer
    setTimerState((prev) => ({
      ...(prev || {}),
      timer_offset_ms: 0,
      timer_started_at: null,
      timer_status: "stopped",
    }));

    // 5️⃣ Azzera cronometro visivo
    setElapsed(0);

    // 6️⃣ Ricarica righe aggiornate (per sicurezza)
    const { data: aggiornate, error: reloadErr } = await supabase
      .from("minuti_giocati")
      .select("giocatore_stagione_id, entrata_sec, uscita_sec")
      .eq("partita_id", id);

    if (reloadErr) {
      console.warn("⚠️ Errore reload minuti_giocati:", reloadErr.message);
    } else {
      setMinutiRows(aggiornate || []);
      console.log("♻️ minuti_giocati ricaricati dopo reset:", aggiornate);
    }
  } catch (err) {
    console.error("💥 Errore imprevisto in resetTimer:", err);
  }
};


// 🔹 Quando resetti il timer, azzera anche il conteggio minuti
useEffect(() => {
  if (timerState?.timer_status === "stopped") {
    setMinutiGiocati({});
    setNowSec(0);
  }
}, [timerState?.timer_status]);


// Cambia la durata (minuti)
const changeDuration = async (minutes: number) => {
  if (!id) return;

  await supabase.from("partita_timer_state").upsert({
    partita_id: id,
    timer_duration_min: minutes,
    timer_offset_ms: 0,
    timer_started_at: null,
    timer_status: "stopped",
  });

  setTimerState((prev) => ({
    ...(prev || {}),
    timer_duration_min: minutes,
    timer_offset_ms: 0,
    timer_started_at: null,
    timer_status: "stopped",
  }));

  setElapsed(0);
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

  // Chi esce → chiudi la sua riga aperta nei minuti
  await supabase
    .from("minuti_giocati")
    .update({ uscita_sec: nowSec })
    .eq("partita_id", partita.id)
    .eq("giocatore_stagione_id", uscente)
    .is("uscita_sec", null);

  // Chi entra → nuova riga nei minuti
  await supabase.from("minuti_giocati").insert({
    partita_id: partita.id,
    giocatore_stagione_id: entrante,
    entrata_sec: nowSec,
    uscita_sec: null,
  });

  // 🔹 Aggiorna anche formazioni_partita (sostituzione sul campo)
  await supabase
    .from("formazioni_partita")
    .update({ giocatore_stagione_id: entrante })
    .eq("partita_id", partita.id)
    .eq("giocatore_stagione_id", uscente);

  // Stato locale minuti
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

  // Aggiorna elenco titolari (logica interna)
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
    <div className="bg-white p-6 mt-8 w-full max-w-5xl mx-auto">
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
              <div className="bg-white p-6 rounded-lg shadow-montecarlo max-w-md w-full h-[80vh] flex flex-col">

                {/* Pulsanti rapidi */}
                <div className="flex justify-between text-xs mb-2">
                  <button
                    onClick={() => {
                      if (convocati.length === giocatori.length) {
                        setConvocati([]);
                      } else {
                        setConvocati(giocatori.map((g) => g.id));
                      }
                    }}
                    className="px-2 py-1 bg-montecarlo-gray-100 rounded hover:bg-montecarlo-gray-200"
                  >
                    Seleziona Convocati ({convocati.length})
                  </button>

                  <button
                    onClick={() => {
                      if (titolari.length === convocati.length) {
                        setTitolari([]);
                      } else {
                        setTitolari(convocati);
                      }
                    }}
                    className="px-2 py-1 bg-montecarlo-gray-100 rounded hover:bg-montecarlo-gray-200"
                  >
                    Seleziona Titolari ({titolari.length})
                  </button>
                </div>

                {/* Lista giocatori scrollabile */}
                <div className="flex-1 overflow-y-auto">
                  {giocatori.map((g) => (
                    <div
                      key={g.id}
                      className="grid grid-cols-[minmax(150px,max-content)_auto_auto_auto] items-center py-1 border-b text-sm gap-2"
                    >
                      {/* Nome */}
                      <span>
                        {(g.cognome || "").trim()} {(g.nome || "").trim()}
                      </span>

                      {/* Convocato */}
                      <label className="flex items-center gap-1 text-xs">
                        <span>Conv</span>
                        <input
                          type="checkbox"
                          checked={convocati.includes(g.id)}
                          onChange={() => {
                            if (convocati.includes(g.id)) {
                              setConvocati((prev) => prev.filter((x) => x !== g.id));
                            } else {
                              setConvocati((prev) => [...prev, g.id]);
                            }
                          }}
                        />
                      </label>

                      {/* Titolare */}
                      <label className="flex items-center gap-1 text-xs">
                        <span>Titol</span>
                        <input
                          type="checkbox"
                          checked={titolari.includes(g.id)}
                          disabled={!convocati.includes(g.id)}
                          onChange={() => {
                            if (titolari.includes(g.id)) {
                              setTitolari((prev) => prev.filter((x) => x !== g.id));
                            } else {
                              setTitolari((prev) => [...prev, g.id]);
                            }
                          }}
                        />
                      </label>

                      {/* Minuti giocati */}
                      <span className="text-xs text-gray-600">
                        {formatTempo(minutiGiocati[g.id] || 0)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Salva su DB */}
<div className="mt-4">
  <button
    onClick={async () => {
      if (!partita) return;

      // pulizia vecchi dati
      await supabase.from("presenze").delete().eq("partita_id", id);
      await supabase.from("minuti_giocati").delete().eq("partita_id", id);

      // salva convocati
      const rows = convocati.map((gid) => {
        const g = giocatori.find((x) => x.id === gid);
        return {
          partita_id: id,
          giocatore_stagione_id: gid,
          stagione_id: partita.stagione_id,
          nome: (g?.nome || "").trim(),
          cognome: (g?.cognome || "").trim(),
          titolare: titolari.includes(gid),
        };
      });
      if (rows.length > 0) {
        await supabase.from("presenze").insert(rows);
      }

      // sincronizza formazione
      const { data: oldForm } = await supabase
        .from("formazioni_partita")
        .select("id, giocatore_stagione_id")
        .eq("partita_id", id);

      const oldIds = new Set((oldForm || []).map((f) => f.giocatore_stagione_id));
      const newIds = new Set(titolari);

      // rimuovi i giocatori non più titolari
      const toRemove = (oldForm || []).filter((f) => !newIds.has(f.giocatore_stagione_id));
      if (toRemove.length > 0) {
        await supabase
          .from("formazioni_partita")
          .delete()
          .in("id", toRemove.map((f) => f.id));
      }

      // aggiungi i nuovi titolari non presenti
      const toInsert = titolari.filter((gid) => !oldIds.has(gid));
      if (toInsert.length > 0) {
        const formazioneRows = toInsert.map((gid, idx) => {
          const g = giocatori.find((x) => x.id === gid);

          let y = 40, baseX = 50;
          switch ((g?.ruolo || "").toLowerCase()) {
            case "portiere": y = 80; break;
            case "difensore": y = 60; break;
            case "centrocampista": y = 40; break;
            case "attaccante": y = 25; break;
          }

          return {
            partita_id: id,
            giocatore_stagione_id: gid,
            titolare: true,
            posizione: idx + 1,
            posizione_x: baseX,
            posizione_y: y,
          };
        });
        await supabase.from("formazioni_partita").insert(formazioneRows);
      }

      // minuti iniziali titolari
      const nowSec = Math.floor(elapsed / 1000);
      const iniziali = titolari.map((gid) => ({
        partita_id: id,
        giocatore_stagione_id: gid,
        entrata_sec: nowSec,
        uscita_sec: null,
      }));
      if (iniziali.length > 0) {
        await supabase.from("minuti_giocati").insert(iniziali);
      }

      // 🔹 forza refresh del CampoFormazione
      setRefreshCampo((prev) => prev + 1);

      // 🔹 fetch immediato dei dati reali dopo le modifiche
      const { data: updated } = await supabase
        .from("formazioni_partita")
        .select("*")
        .eq("partita_id", id);
      console.log("✅ Formazione aggiornata su Supabase:", updated);

      // chiudi la modale
      setFormazioneAperta(false);
    }}
    className="w-full bg-montecarlo-secondary text-white py-2 rounded-lg"
  >
    Salva
  </button>
</div>



</div>
</div>
)}

{/* Modal Sostituzioni */}
{sostituzioniAperte && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-montecarlo max-w-xs w-full h-[80vh] flex flex-col">

      {/* Contenuto scrollabile */}
      <div className="flex-1 overflow-y-auto">
        {/* TITOLARI */}
        <h3 className="text-lg font-bold text-montecarlo-secondary mt-2 mb-1">
          Schierati
        </h3>
        {[...titolari]
          .map((tid) => giocatori.find((g) => g.id === tid))
          .filter(Boolean)
          .map((gioc) => (
            <div
              key={gioc!.id}
              onClick={() =>
                setUscenteSelezionato((prev) =>
                  prev === gioc!.id ? null : gioc!.id
                )
              }
              className={`cursor-pointer flex items-center justify-between pr-2 border-b py-1 ${
                uscenteSelezionato === gioc!.id
                  ? "bg-montecarlo-gray-200 font-bold"
                  : "hover:bg-montecarlo-gray-100"
              }`}
            >
              <span>
                {(gioc!.cognome || "").trim()} {(gioc!.nome || "").trim()}
              </span>
              <span className="text-sm text-gray-600">
                {formatTempo(minutiGiocati[gioc!.id] || 0)}
              </span>
            </div>
          ))}

        {/* PANCHINA */}
        <h3 className="text-lg font-bold text-gray-600 mt-4 mb-1">
          A disposizione
        </h3>
        {convocati
          .filter((cid) => !titolari.includes(cid))
          .map((cid) => giocatori.find((g) => g.id === cid))
          .filter(Boolean)
          .map((gioc) => (
            <div
              key={gioc!.id}
              onClick={() => {
                if (uscenteSelezionato) {
                  const minuto = Math.floor(elapsed / 1000);
                  salvaSostituzione(uscenteSelezionato, gioc!.id, minuto);
                  setUscenteSelezionato(null);
                }
              }}
              className="cursor-pointer flex items-center justify-between pr-2 border-b py-1 hover:bg-montecarlo-gray-100"
            >
              <span>
                {(gioc!.cognome || "").trim()} {(gioc!.nome || "").trim()}
              </span>
              <span className="text-sm text-gray-600">
                {formatTempo(minutiGiocati[gioc!.id] || 0)}
              </span>
            </div>
          ))}
      </div>

      <button
        onClick={() => setSostituzioniAperte(false)}
        className="w-full bg-red-500 text-white py-2 rounded-lg mt-4"
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
  onClick={() => setTempo((prev) => (prev === t ? null : t))}
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
        <span className="text-lg font-bold text-montecarlo-secondary">
          {squadraCasa?.nome} ({totale(goalCasa)})
        </span>
        <div className="flex items-center space-x-2">
          <button onClick={() => decrementa("casa")} className="text-3xl">−</button>
          <span className="text-lg font-bold">{goalCasa[tempo - 1]}</span>
          <button onClick={() => incrementa("casa")} className="text-3xl">+</button>
        </div>
      </div>
      {isMontecarlo(squadraCasa?.id, squadraCasa?.nome)
        ? renderMarcatori(squadraCasa?.id)
        : renderPortieriSubiti(squadraCasa?.id)}
    </div>

    {/* Squadra Ospite */}
    <div>
      <div className="flex items-center justify-between p-4 bg-montecarlo-gray-50 rounded-lg border border-montecarlo-gray-200">
        <span className="text-lg font-bold text-montecarlo-secondary">
          {squadraOspite?.nome} ({totale(goalOspite)})
        </span>
        <div className="flex items-center space-x-2">
          <button onClick={() => decrementa("ospite")} className="text-3xl">−</button>
          <span className="text-lg font-bold">{goalOspite[tempo - 1]}</span>
          <button onClick={() => incrementa("ospite")} className="text-3xl">+</button>
        </div>
      </div>
      {isMontecarlo(squadraOspite?.id, squadraOspite?.nome)
        ? renderMarcatori(squadraOspite?.id)
        : renderPortieriSubiti(squadraOspite?.id)}
    </div>
  </div>
)}


{/* Campo con i giocatori */}
<CampoFormazione
  partitaId={id!}
  editable={true}
  refreshKey={refreshCampo}
/>



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