// src/components/GestioneRisultatoPartita.tsx
// Data creazione: 18/08/2025 (rev: aggiunta gestione goal subiti portieri + squadra_segnante_id + minuti giocati)

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import CronometroPartita from "./CronometroPartita";
import CampoFormazione from "../components/CampoFormazione";
import {
  getElapsedCorrente,
  getTempoAssoluto,
  getStatoPartita,
  StatoPartita,
} from "../partita/partitaTimer";

interface TimerState {
  partita_id: string;
  timer_started_at: string | null;
  timer_offset_ms: number;
  timer_status: "running" | "paused" | "stopped";
  timer_duration_min: number;
  run_index: number;
  total_elapsed_sec: number;
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
  const [entranteSelezionato, setEntranteSelezionato] = useState<string | null>(null);
  const [ordineUsciti, setOrdineUsciti] = useState<string[]>([]);
  const [ordineEntrati, setOrdineEntrati] = useState<string[]>([]);

  // minuti giocati calcolati (secondi)
  const [minutiGiocati, setMinutiGiocati] = useState<Record<string, number>>({});

  // tempo di riferimento interno del timer (in secondi)
  const [nowSec, setNowSec] = useState(0);

  const [highlightedSubs, setHighlightedSubs] = useState<Set<string>>(new Set());

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
  const [rigoriCasa, setRigoriCasa] = useState(0);
const [rigoriOspite, setRigoriOspite] = useState(0);
const [rigoristaSelezionato, setRigoristaSelezionato] = useState("");
// ========================
// Stato sequenza rigori
// ========================
const [tiriRigori, setTiriRigori] = useState<
  {
    id: string;
    squadra_id: string;
    giocatore_stagione_id: string | null;
    ordine: number;
    esito: "segnato" | "sbagliato";
  }[]
>([]);
  const [tempo, setTempo] = useState<number | null>(null);
  const [tipoEvento, setTipoEvento] = useState<"gol" | "giallo" | "rosso" | null>(null);
  const [periodoCartellino, setPeriodoCartellino] = useState<number | null>(null);
  const [minutoCartellino, setMinutoCartellino] = useState<string>("");

  const [marcatori, setMarcatori] = useState<
  Record<
    number,
    {
  goal_tempo: number;
  tempo_sec?: number | null;
  tipo_goal?: "azione" | "rigore";
  giocatore_stagione_id: string | null;
  assist_giocatore_stagione_id?: string | null;
  portiere_subisce_id?: string | null;
  squadra_segnante_id?: string | null;
  id_supabase?: string;
}[]
  >
>({});

// ========================
// PERIODI CARTELLINI
// ========================
// 1 = 1° Tempo
// 2 = Intervallo
// 3 = 2° Tempo
// 4 = Intervallo prima supplementari
// 5 = 1° Tempo Supplementare
// 6 = Intervallo supplementari
// 7 = 2° Tempo Supplementare
// 8 = Rigori
// 9 = Dopo partita
// ========================

// ========================
// Stati cartellini
// ========================
const [cartellini, setCartellini] = useState<
  {
    id?: string;
    giocatore_stagione_id: string;
    tipo: "giallo" | "rosso";
    periodo: number;
    tempo_sec: number;
  }[]
>([]);

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
  .select(`
    *,
    stagione:stagione_id (
      formato_calcio
    )
  `)
  .eq("id", id)
  .single();
    if (errP || !p) {
      console.error("Errore fetch partita:", errP?.message);
      return;
    }
    setPartita(p);
    setGoalCasa([p.goal_a1, p.goal_a2, p.goal_a3, p.goal_a4]);
    setGoalOspite([p.goal_b1, p.goal_b2, p.goal_b3, p.goal_b4]);
    setRigoriCasa(p.rigori_a ?? 0);
setRigoriOspite(p.rigori_b ?? 0);
    setRigoriCasa(p.rigori_a ?? 0);
setRigoriOspite(p.rigori_b ?? 0);
   

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
      .select("giocatore_stagione_id, assist_giocatore_stagione_id, periodo, goal_tempo, tempo_sec, tipo_goal, portiere_subisce_id, squadra_segnante_id, id")
      .eq("partita_id", p.id);

    const perPeriodo: Record<number, any[]> = {};
    marcatoriDB?.forEach((m) => {
      perPeriodo[m.periodo] = perPeriodo[m.periodo] || [];
      perPeriodo[m.periodo].push({
  goal_tempo: m.goal_tempo,
  tempo_sec: m.tempo_sec,
  giocatore_stagione_id: m.giocatore_stagione_id,
  assist_giocatore_stagione_id: m.assist_giocatore_stagione_id,
  portiere_subisce_id: m.portiere_subisce_id,
  squadra_segnante_id: m.squadra_segnante_id,
  id_supabase: m.id,
});
    });
    setMarcatori(perPeriodo);

    // ========================
// 7) Rigori già registrati
// ========================
const { data: rigoriDB, error: rigoriErr } = await supabase
  .from("rigori_partita")
  .select("id, squadra_id, giocatore_stagione_id, ordine, esito")
  .eq("partita_id", p.id)
  .order("ordine", { ascending: true });

if (rigoriErr) {
  console.error("❌ Errore fetch rigori_partita:", rigoriErr.message);
} else {
  setTiriRigori(rigoriDB || []);
}

    // 7) Cartellini
const { data: cartelliniDB, error: cartelliniErr } = await supabase
  .from("cartellini")
  .select("id, giocatore_stagione_id, tipo, periodo, tempo_sec")
  .eq("partita_id", p.id)
  .order("created_at", { ascending: true });

if (cartelliniErr) {
  console.error("Errore fetch cartellini:", cartelliniErr.message);
} else {
  setCartellini(cartelliniDB || []);
}

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
      .channel(`realtime-partite-${p.id}`)
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
  .channel(`realtime-marcatori-${p.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marcatori", filter: `partita_id=eq.${p.id}` },
        async () => {
          const { data: live } = await supabase
            .from("marcatori")
            .select("giocatore_stagione_id, assist_giocatore_stagione_id, periodo, goal_tempo, tempo_sec, tipo_goal, portiere_subisce_id, squadra_segnante_id, id")
            .eq("partita_id", p.id);
          const perLive: Record<number, any[]> = {};
          live?.forEach((m) => {
            perLive[m.periodo] = perLive[m.periodo] || [];
            perLive[m.periodo].push({
  goal_tempo: m.goal_tempo,
  tempo_sec: m.tempo_sec,
  tipo_goal: m.tipo_goal,
  giocatore_stagione_id: m.giocatore_stagione_id,
  assist_giocatore_stagione_id: m.assist_giocatore_stagione_id,
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
  .channel(`realtime-timer-${p.id}`)
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


// =====================
// Calcolo elapsed tramite motore partita
// =====================
useEffect(() => {
  let interval: NodeJS.Timeout | null = null;

  const aggiornaElapsed = () => {
    setElapsed(getElapsedCorrente(timerState));
  };

  aggiornaElapsed();

  if (timerState?.timer_status === "running") {
    interval = setInterval(aggiornaElapsed, 1000);
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
const currentDuration = timerState?.timer_duration_min ?? 35;

// Avvia o riprende il timer (con debug)
const startTimer = async () => {
  if (!id) {
    console.error("❌ startTimer chiamato senza id partita");
    return;
  }

  console.log("▶️ startTimer avviato | partitaId:", id, " | titolari:", titolari);

  const now = new Date().toISOString();
  const nowSec = getTempoAssoluto(timerState, elapsed);

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
  const { error: timerErr } = await supabase
  .from("partita_timer_state")
  .upsert({
    partita_id: id,
    timer_duration_min: currentDuration,
    timer_started_at: now,
    timer_status: "running",
    timer_offset_ms: timerState?.timer_offset_ms || 0,
    run_index: (timerState?.run_index ?? 0) === 0 ? 1 : timerState!.run_index,
    total_elapsed_sec: timerState?.total_elapsed_sec ?? 0,
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
total_elapsed_sec: prev?.total_elapsed_sec ?? 0,

run_index:
  (prev?.run_index ?? 0) === 0
    ? 1
    : prev!.run_index,
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

 setTimerState((prev) => {
  if (!prev) return prev;

  return {
    ...prev,
    timer_offset_ms: prev.timer_offset_ms + diff,
    timer_started_at: null,
    timer_status: "paused",
  };
});
};

// Fine 1° tempo → Intervallo
const intervallo = async () => {
  if (!id) return;

  // Calcola il tempo effettivo del 1° tempo PRIMA di fermare il timer
  const elapsedCorrente = getElapsedCorrente(timerState);
  const tempoGiocato = Math.floor(elapsedCorrente / 1000);

  console.log("🏁 Fine 1° tempo | tempo giocato:", tempoGiocato, "secondi");

  // 1. Chiude tutte le righe ancora aperte dei giocatori in campo
  const { error: chiusuraErr } = await supabase
    .from("minuti_giocati")
    .update({ uscita_sec: tempoGiocato })
    .eq("partita_id", id)
    .is("uscita_sec", null);

  if (chiusuraErr) {
    console.error(
      "❌ Errore chiusura minuti_giocati a fine 1° tempo:",
      chiusuraErr.message
    );
    return;
  }

  // 2. Ricarica le righe aggiornate
  const { data: minutiAggiornati, error: minutiErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id, entrata_sec, uscita_sec")
    .eq("partita_id", id);

  if (minutiErr) {
    console.error(
      "❌ Errore rilettura minuti_giocati a fine 1° tempo:",
      minutiErr.message
    );
    return;
  }

  setMinutiRows(minutiAggiornati || []);

  // 3. Salva stato di intervallo
  const { error } = await supabase
    .from("partita_timer_state")
    .update({
      run_index: 1,
      total_elapsed_sec: tempoGiocato,
      timer_status: "stopped",
      timer_started_at: null,
      timer_offset_ms: 0,
    })
    .eq("partita_id", id);

  if (error) {
    console.error("Errore aggiornamento intervallo:", error);
    return;
  }

  setTimerState((prev) =>
    prev
      ? {
          ...prev,
          run_index: 1,
          total_elapsed_sec: tempoGiocato,
          timer_status: "stopped",
          timer_started_at: null,
          timer_offset_ms: 0,
        }
      : prev
  );

  setElapsed(0);

  console.log("✅ Primo tempo chiuso correttamente");
};

// Inizio 2° tempo
const inizioSecondoTempo = async () => {
  if (!id) return;

  const now = new Date().toISOString();

  // Tempo assoluto raggiunto alla fine del 1° tempo
  const tempoInizioSecondo = timerState?.total_elapsed_sec ?? 0;

  // 1. Recupera i giocatori attualmente presenti in campo
  const { data: formazione, error: formErr } = await supabase
    .from("formazioni_partita")
    .select("giocatore_stagione_id")
    .eq("partita_id", id);

  if (formErr) {
    console.error(
      "❌ Errore lettura formazione a inizio 2° tempo:",
      formErr.message
    );
    return;
  }

  let inCampoIds =
    formazione?.map((f) => f.giocatore_stagione_id) || [];

  // Fallback sui titolari se la formazione non contiene giocatori
  if (inCampoIds.length === 0 && titolari.length > 0) {
    inCampoIds = [...titolari];
  }

    // 2. Chiude eventuali righe rimaste aperte dal 1° tempo
  const { error: chiusuraResidueErr } = await supabase
    .from("minuti_giocati")
    .update({ uscita_sec: tempoInizioSecondo })
    .eq("partita_id", id)
    .is("uscita_sec", null);

  if (chiusuraResidueErr) {
    console.error(
      "❌ Errore chiusura righe residue a inizio 2° tempo:",
      chiusuraResidueErr.message
    );
    return;
  }

  // 3. Crea un nuovo intervallo per tutti i giocatori in campo
  const nuoveRighe = inCampoIds.map((gid) => ({
    partita_id: id,
    giocatore_stagione_id: gid,
    entrata_sec: tempoInizioSecondo,
    uscita_sec: null,
    run_index: 2,
  }));

  if (nuoveRighe.length > 0) {
    const { error: minutiErr } = await supabase
      .from("minuti_giocati")
      .insert(nuoveRighe);

    if (minutiErr) {
      console.error(
        "❌ Errore apertura minuti 2° tempo:",
        minutiErr.message
      );
      return;
    }
  }

  // 3. Ricarica minuti_giocati
  const { data: minutiAggiornati, error: reloadErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id, entrata_sec, uscita_sec")
    .eq("partita_id", id);

  if (reloadErr) {
    console.error(
      "❌ Errore rilettura minuti 2° tempo:",
      reloadErr.message
    );
    return;
  }

  setMinutiRows(minutiAggiornati || []);

  // 4. Avvia il secondo tempo
  const { error } = await supabase
    .from("partita_timer_state")
    .update({
      timer_started_at: now,
      timer_status: "running",
      timer_offset_ms: 0,
      run_index: 2,
    })
    .eq("partita_id", id);

  if (error) {
    console.error("Errore avvio 2° tempo:", error);
    return;
  }

  setTimerState((prev) =>
    prev
      ? {
          ...prev,
          timer_started_at: now,
          timer_status: "running",
          timer_offset_ms: 0,
          run_index: 2,
        }
      : prev
  );

  setElapsed(0);

  console.log(
    "▶️ Secondo tempo avviato | tempo assoluto:",
    tempoInizioSecondo,
    "| giocatori in campo:",
    inCampoIds.length
  );
};

// =====================
// Fine tempi regolamentari
// =====================
const fineTempiRegolamentari = async () => {
  if (!id || !timerState) return;

  // Tempo effettivamente giocato nel 2° tempo
  const tempoSecondoTempo = Math.floor(
    getElapsedCorrente(timerState) / 1000
  );

  // Tempo assoluto raggiunto alla fine dei tempi regolamentari
  const tempoAssoluto =
    (timerState?.total_elapsed_sec || 0) + tempoSecondoTempo;

  console.log(
    "🏁 Fine tempi regolamentari | tempo assoluto:",
    tempoAssoluto
  );

  // 1. Chiude tutte le righe ancora aperte del 2° tempo
  const { error: chiusuraErr } = await supabase
    .from("minuti_giocati")
    .update({ uscita_sec: tempoAssoluto })
    .eq("partita_id", id)
    .is("uscita_sec", null);

  if (chiusuraErr) {
    console.error(
      "❌ Errore chiusura minuti a fine tempi regolamentari:",
      chiusuraErr.message
    );
    return;
  }

  // 2. Ricarica minuti_giocati
  const { data: minutiAggiornati, error: minutiErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id, entrata_sec, uscita_sec")
    .eq("partita_id", id);

  if (minutiErr) {
    console.error(
      "❌ Errore rilettura minuti a fine tempi regolamentari:",
      minutiErr.message
    );
    return;
  }

  setMinutiRows(minutiAggiornati || []);

  // 3. Ferma il timer mantenendo run_index = 2
  const { error: timerErr } = await supabase
    .from("partita_timer_state")
    .update({
      timer_status: "stopped",
      timer_started_at: null,
      timer_offset_ms: 0,
      run_index: 2,
      total_elapsed_sec: tempoAssoluto,
    })
    .eq("partita_id", id);

  if (timerErr) {
    console.error(
      "❌ Errore fine tempi regolamentari:",
      timerErr.message
    );
    return;
  }

  setTimerState((prev) =>
    prev
      ? {
          ...prev,
          timer_status: "stopped",
          timer_started_at: null,
          timer_offset_ms: 0,
          run_index: 2,
          total_elapsed_sec: tempoAssoluto,
        }
      : prev
  );

  setElapsed(0);

  console.log("✅ Tempi regolamentari terminati");
};

// Fine partita
const finePartita = async () => {
  if (!id) return;

  // Tempo effettivamente giocato nel 2° tempo
  const tempoSecondoTempo = Math.floor(getElapsedCorrente(timerState) / 1000);

  // Tempo assoluto raggiunto alla fine della partita
  const tempoAssoluto =
    (timerState?.total_elapsed_sec || 0) + tempoSecondoTempo;

  console.log(
    "🏁 Fine partita | 1° tempo:",
    timerState?.total_elapsed_sec || 0,
    "| 2° tempo:",
    tempoSecondoTempo,
    "| tempo assoluto:",
    tempoAssoluto
  );

  // 1. Chiude tutte le righe ancora aperte del 2° tempo
  const { error: chiusuraErr } = await supabase
    .from("minuti_giocati")
    .update({ uscita_sec: tempoAssoluto })
    .eq("partita_id", id)
    .is("uscita_sec", null);

  if (chiusuraErr) {
    console.error(
      "❌ Errore chiusura minuti_giocati a fine partita:",
      chiusuraErr.message
    );
    return;
  }

  // 2. Legge tutti gli intervalli giocati della partita
  const { data: minutiDB, error: minutiErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id, entrata_sec, uscita_sec")
    .eq("partita_id", id);

  if (minutiErr) {
    console.error(
      "❌ Errore lettura minuti_giocati a fine partita:",
      minutiErr.message
    );
    return;
  }

  setMinutiRows(minutiDB || []);

  // 3. Somma tutti gli intervalli per ogni giocatore
  const totali: Record<string, number> = {};

  (minutiDB || []).forEach((m) => {
    const entrata = m.entrata_sec ?? 0;
    const uscita = m.uscita_sec;

    if (uscita === null) return;

    const diff = uscita - entrata;

    if (diff > 0) {
      totali[m.giocatore_stagione_id] =
        (totali[m.giocatore_stagione_id] || 0) + diff;
    }
  });

  // 4. Prepara i totali definitivi
  const rowsTotali = Object.entries(totali).map(([gid, sec]) => ({
    partita_id: id,
    giocatore_stagione_id: gid,
    tempo_giocato_sec: sec,
  }));

  // 5. Scrive una sola volta i totali definitivi
  if (rowsTotali.length > 0) {
    const { error: totaliErr } = await supabase
      .from("minuti_giocati_totali")
      .upsert(rowsTotali, {
        onConflict: "partita_id,giocatore_stagione_id",
      });

    if (totaliErr) {
      console.error(
        "❌ Errore salvataggio minuti_giocati_totali:",
        totaliErr.message
      );
      return;
    }
  }

  // 6. Ferma definitivamente il timer
  const { error: timerErr } = await supabase
    .from("partita_timer_state")
    .update({
      timer_status: "stopped",
      timer_started_at: null,
      timer_offset_ms: 0,
      run_index: 6,
      total_elapsed_sec: tempoAssoluto,
    })
    .eq("partita_id", id);

  if (timerErr) {
    console.error("❌ Errore fine partita:", timerErr.message);
    return;
  }

  setTimerState((prev) =>
    prev
      ? {
          ...prev,
          timer_status: "stopped",
          timer_started_at: null,
          timer_offset_ms: 0,
          run_index: 6,
          total_elapsed_sec: tempoAssoluto,
        }
      : prev
  );

  setElapsed(0);

  console.log(
    "✅ Partita terminata | minuti totali salvati:",
    rowsTotali
  );
};

// =====================
// Inizio 1° Tempo Supplementare
// =====================
const inizioPrimoTempoSupplementare = async () => {
  if (!id || !timerState) return;

  const now = new Date().toISOString();

  // Tempo assoluto raggiunto alla fine dei tempi regolamentari
  const tempoInizioSupplementari = timerState.total_elapsed_sec;
    // 1. Recupera i giocatori attualmente presenti in campo
  const { data: formazione, error: formErr } = await supabase
    .from("formazioni_partita")
    .select("giocatore_stagione_id")
    .eq("partita_id", id);

  if (formErr) {
    console.error(
      "❌ Errore lettura formazione a inizio 1° supplementare:",
      formErr.message
    );
    return;
  }

  let inCampoIds =
    formazione?.map((f) => f.giocatore_stagione_id) || [];

  // Fallback sui titolari se la formazione non contiene giocatori
  if (inCampoIds.length === 0 && titolari.length > 0) {
    inCampoIds = [...titolari];
  }

   // 2. Recupera eventuali righe ancora aperte
  const { data: righeAperte, error: righeAperteErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id")
    .eq("partita_id", id)
    .is("uscita_sec", null);

  if (righeAperteErr) {
    console.error(
      "❌ Errore controllo righe aperte a inizio 1° supplementare:",
      righeAperteErr.message
    );
    return;
  }

  const apertiSet = new Set(
    righeAperte?.map((r) => r.giocatore_stagione_id) || []
  );

  // 3. Crea un nuovo intervallo solo per chi non ne ha già uno aperto
  const nuoveRighe = inCampoIds
    .filter((gid) => !apertiSet.has(gid))
    .map((gid) => ({
    partita_id: id,
    giocatore_stagione_id: gid,
    entrata_sec: tempoInizioSupplementari,
    uscita_sec: null,
    run_index: 3,
  }));

  if (nuoveRighe.length > 0) {
    const { error: minutiErr } = await supabase
      .from("minuti_giocati")
      .insert(nuoveRighe);

    if (minutiErr) {
      console.error(
        "❌ Errore apertura minuti 1° supplementare:",
        minutiErr.message
      );
      return;
    }
  }

  // 3. Ricarica minuti_giocati
  const { data: minutiAggiornati, error: reloadErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id, entrata_sec, uscita_sec")
    .eq("partita_id", id);

  if (reloadErr) {
    console.error(
      "❌ Errore rilettura minuti 1° supplementare:",
      reloadErr.message
    );
    return;
  }

  setMinutiRows(minutiAggiornati || []);

  const { error } = await supabase
    .from("partita_timer_state")
    .update({
      timer_started_at: now,
      timer_status: "running",
      timer_offset_ms: 0,
      run_index: 3,
      total_elapsed_sec: tempoInizioSupplementari,
    })
    .eq("partita_id", id);

  if (error) {
    console.error(
      "❌ Errore avvio 1° tempo supplementare:",
      error.message
    );
    return;
  }

  setTimerState((prev) =>
    prev
      ? {
          ...prev,
          timer_started_at: now,
          timer_status: "running",
          timer_offset_ms: 0,
          run_index: 3,
          total_elapsed_sec: tempoInizioSupplementari,
        }
      : prev
  );

  setElapsed(0);

  console.log(
    "▶️ 1° Tempo Supplementare avviato | tempo assoluto:",
    tempoInizioSupplementari
  );
};

// =====================
// Fine 1° Tempo Supplementare
// =====================
const finePrimoTempoSupplementare = async () => {
  if (!id || !timerState) return;

  const elapsedCorrente = getElapsedCorrente(timerState);

  const tempoAssoluto = getTempoAssoluto(
    timerState,
    elapsedCorrente
  );

  // 1. Chiude tutte le righe ancora aperte
  const { error: chiusuraErr } = await supabase
    .from("minuti_giocati")
    .update({ uscita_sec: tempoAssoluto })
    .eq("partita_id", id)
    .is("uscita_sec", null);

  if (chiusuraErr) {
    console.error(
      "❌ Errore chiusura minuti fine 1° supplementare:",
      chiusuraErr.message
    );
    return;
  }

  // 2. Ricarica minuti_giocati
  const { data: minutiAggiornati, error: minutiErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id, entrata_sec, uscita_sec")
    .eq("partita_id", id);

  if (minutiErr) {
    console.error(
      "❌ Errore rilettura minuti fine 1° supplementare:",
      minutiErr.message
    );
    return;
  }

  setMinutiRows(minutiAggiornati || []);

  // 3. Ferma il timer mantenendo run_index = 3
  const { error: timerErr } = await supabase
    .from("partita_timer_state")
    .update({
      timer_status: "stopped",
      timer_started_at: null,
      timer_offset_ms: 0,
      run_index: 3,
      total_elapsed_sec: tempoAssoluto,
    })
    .eq("partita_id", id);

  if (timerErr) {
    console.error(
      "❌ Errore fine 1° tempo supplementare:",
      timerErr.message
    );
    return;
  }

  setTimerState((prev) =>
    prev
      ? {
          ...prev,
          timer_status: "stopped",
          timer_started_at: null,
          timer_offset_ms: 0,
          run_index: 3,
          total_elapsed_sec: tempoAssoluto,
        }
      : prev
  );

  setElapsed(0);

  console.log(
    "⏸️ Fine 1° Tempo Supplementare | tempo assoluto:",
    tempoAssoluto
  );
};

// =====================
// Inizio 2° Tempo Supplementare
// =====================
const inizioSecondoTempoSupplementare = async () => {
  if (!id || !timerState) return;

  const now = new Date().toISOString();

  const tempoInizioSecondoSupplementare =
    timerState.total_elapsed_sec;

      // 1. Recupera i giocatori attualmente presenti in campo
  const { data: formazione, error: formErr } = await supabase
    .from("formazioni_partita")
    .select("giocatore_stagione_id")
    .eq("partita_id", id);

  if (formErr) {
    console.error(
      "❌ Errore lettura formazione a inizio 2° supplementare:",
      formErr.message
    );
    return;
  }

  let inCampoIds =
    formazione?.map((f) => f.giocatore_stagione_id) || [];

  // Fallback sui titolari se la formazione non contiene giocatori
  if (inCampoIds.length === 0 && titolari.length > 0) {
    inCampoIds = [...titolari];
  }

  // 2. Recupera eventuali righe ancora aperte
  const { data: righeAperte, error: righeAperteErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id")
    .eq("partita_id", id)
    .is("uscita_sec", null);

  if (righeAperteErr) {
    console.error(
      "❌ Errore controllo righe aperte a inizio 2° supplementare:",
      righeAperteErr.message
    );
    return;
  }

  const apertiSet = new Set(
    righeAperte?.map((r) => r.giocatore_stagione_id) || []
  );

  // 3. Crea un nuovo intervallo solo per chi non ne ha già uno aperto
  const nuoveRighe = inCampoIds
    .filter((gid) => !apertiSet.has(gid))
    .map((gid) => ({
    partita_id: id,
    giocatore_stagione_id: gid,
    entrata_sec: tempoInizioSecondoSupplementare,
    uscita_sec: null,
    run_index: 4,
  }));

  if (nuoveRighe.length > 0) {
    const { error: minutiErr } = await supabase
      .from("minuti_giocati")
      .insert(nuoveRighe);

    if (minutiErr) {
      console.error(
        "❌ Errore apertura minuti 2° supplementare:",
        minutiErr.message
      );
      return;
    }
  }

  // 3. Ricarica minuti_giocati
  const { data: minutiAggiornati, error: reloadErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id, entrata_sec, uscita_sec")
    .eq("partita_id", id);

  if (reloadErr) {
    console.error(
      "❌ Errore rilettura minuti 2° supplementare:",
      reloadErr.message
    );
    return;
  }

  setMinutiRows(minutiAggiornati || []);

  const { error } = await supabase
    .from("partita_timer_state")
    .update({
      timer_started_at: now,
      timer_status: "running",
      timer_offset_ms: 0,
      run_index: 4,
      total_elapsed_sec: tempoInizioSecondoSupplementare,
    })
    .eq("partita_id", id);

  if (error) {
    console.error(
      "❌ Errore avvio 2° tempo supplementare:",
      error.message
    );
    return;
  }

  setTimerState((prev) =>
    prev
      ? {
          ...prev,
          timer_started_at: now,
          timer_status: "running",
          timer_offset_ms: 0,
          run_index: 4,
          total_elapsed_sec: tempoInizioSecondoSupplementare,
        }
      : prev
  );

  setElapsed(0);

  console.log(
    "▶️ 2° Tempo Supplementare avviato | tempo assoluto:",
    tempoInizioSecondoSupplementare
  );
};

// =====================
// Fine 2° Tempo Supplementare
// =====================
const fineSecondoTempoSupplementare = async () => {
  if (!id || !timerState) return;

  const elapsedCorrente = getElapsedCorrente(timerState);

  const tempoAssoluto = getTempoAssoluto(
    timerState,
    elapsedCorrente
  );

  // 1. Chiude tutte le righe ancora aperte
  const { error: chiusuraErr } = await supabase
    .from("minuti_giocati")
    .update({ uscita_sec: tempoAssoluto })
    .eq("partita_id", id)
    .is("uscita_sec", null);

  if (chiusuraErr) {
    console.error(
      "❌ Errore chiusura minuti fine 2° supplementare:",
      chiusuraErr.message
    );
    return;
  }

  // 2. Ricarica minuti_giocati
  const { data: minutiAggiornati, error: minutiErr } = await supabase
    .from("minuti_giocati")
    .select("giocatore_stagione_id, entrata_sec, uscita_sec")
    .eq("partita_id", id);

  if (minutiErr) {
    console.error(
      "❌ Errore rilettura minuti fine 2° supplementare:",
      minutiErr.message
    );
    return;
  }

  setMinutiRows(minutiAggiornati || []);

  // 3. Ferma il timer e porta la partita allo stato finale
  const { error: timerErr } = await supabase
    .from("partita_timer_state")
    .update({
      timer_status: "stopped",
      timer_started_at: null,
      timer_offset_ms: 0,
      run_index: 4,
      total_elapsed_sec: tempoAssoluto,
    })
    .eq("partita_id", id);

  if (timerErr) {
    console.error(
      "❌ Errore fine 2° tempo supplementare:",
      timerErr.message
    );
    return;
  }

  setTimerState((prev) =>
    prev
      ? {
          ...prev,
          timer_status: "stopped",
          timer_started_at: null,
          timer_offset_ms: 0,
          run_index: 4,
          total_elapsed_sec: tempoAssoluto,
        }
      : prev
  );

  setElapsed(0);

  console.log(
    "🏁 Fine 2° Tempo Supplementare | tempo assoluto:",
    tempoAssoluto
  );
};

// =====================
// Inizio Rigori
// =====================
const inizioRigori = async () => {
  if (!id || !timerState) return;

  const { error } = await supabase
    .from("partita_timer_state")
    .update({
      timer_status: "stopped",
      timer_started_at: null,
      timer_offset_ms: 0,
      run_index: 5,
      total_elapsed_sec: timerState.total_elapsed_sec,
    })
    .eq("partita_id", id);

  if (error) {
    console.error(
      "❌ Errore avvio fase rigori:",
      error.message
    );
    return;
  }

  setTimerState((prev) =>
    prev
      ? {
          ...prev,
          timer_status: "stopped",
          timer_started_at: null,
          timer_offset_ms: 0,
          run_index: 5,
          total_elapsed_sec: prev.total_elapsed_sec,
        }
      : prev
  );

  setElapsed(0);

  console.log("⚽ Fase rigori avviata");
};

// 🔹 Reset completo cronometro + minuti giocati
const resetTimer = async () => {
  try {
    if (!id) return;

    const conferma = window.confirm(
      "Confermi il reset della partita?\n\n" +
      "Verranno azzerati:\n" +
      "- Cronometro\n" +
      "- Minuti giocati\n\n" +
      "La formazione NON verrà modificata."
    );

    if (!conferma) return;

    // 1️⃣ Elimina completamente i minuti giocati
    const { error: deleteErr } = await supabase
      .from("minuti_giocati")
      .delete()
      .eq("partita_id", id);

    // 2️⃣ Elimina anche i minuti giocati totali
const { error: deleteTotaliErr } = await supabase
  .from("minuti_giocati_totali")
  .delete()
  .eq("partita_id", id);

if (deleteTotaliErr) {
  console.error(
    "❌ Errore eliminazione minuti_giocati_totali:",
    deleteTotaliErr.message
  );
  return;
}

    // 2️⃣ Reset timer
    const { error: timerErr } = await supabase
      .from("partita_timer_state")
      .update({
        timer_offset_ms: 0,
        timer_started_at: null,
        timer_status: "stopped",
        run_index: 0,
        total_elapsed_sec: 0,
      })
      .eq("partita_id", id);

    if (timerErr) {
      console.error("❌ Errore reset timer:", timerErr.message);
      return;
    }

   // 3️⃣ Stato locale timer

setTimerState((prev) => {
  if (!prev) return prev;

  return {
    ...prev,
    timer_offset_ms: 0,
    timer_started_at: null,
    timer_status: "stopped",
    run_index: 0,
    total_elapsed_sec: 0,
  };
});

    // 4️⃣ Azzera cronometro
    setElapsed(0);

    // 5️⃣ Svuota dati locali minuti
    setMinutiRows([]);
    setMinutiGiocati({});
    setNowSec(0);
// 6️⃣ Azzera sostituzioni
setSostituzioni([]);
setUscenteSelezionato(null);
setEntranteSelezionato(null);
setOrdineUsciti([]);
setOrdineEntrati([]);
setHighlightedSubs(new Set());
setSostituzioniAperte(false);

    console.log("✅ Reset partita completato");

  } catch (err) {
    console.error("💥 Errore resetTimer:", err);
  }
};

// Cambia la durata (minuti)
const changeDuration = async (minutes: number) => {
  if (!id) return;

  const { error } = await supabase
    .from("partita_timer_state")
    .update({
      timer_duration_min: minutes,
      timer_offset_ms: 0,
      timer_started_at: null,
      timer_status: "stopped",
      run_index: 0,
      total_elapsed_sec: 0,
    })
    .eq("partita_id", id);

  if (error) {
    console.error("Errore cambio durata:", error.message);
    return;
  }

 setTimerState((prev) => {
  if (!prev) return prev;

  return {
    ...prev,
    timer_duration_min: minutes,
    timer_offset_ms: 0,
    timer_started_at: null,
    timer_status: "stopped",
    run_index: 0,
    total_elapsed_sec: 0,
  };
});

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

  // =====================
// Aggiornamento risultato rigori
// =====================
const aggiornaRigori = async (
  squadra: "casa" | "ospite",
  delta: number
) => {
  if (!id) return;

  const valoreAttuale =
    squadra === "casa" ? rigoriCasa : rigoriOspite;

  const nuovoValore = Math.max(0, valoreAttuale + delta);

  const campo =
    squadra === "casa" ? "rigori_a" : "rigori_b";

  const { error } = await supabase
    .from("partite")
    .update({
      [campo]: nuovoValore,
    })
    .eq("id", id);

  if (error) {
    console.error(
      "❌ Errore aggiornamento rigori:",
      error.message
    );
    return;
  }

  if (squadra === "casa") {
    setRigoriCasa(nuovoValore);
  } else {
    setRigoriOspite(nuovoValore);
  }
};

// =====================
// Registrazione tiro rigore Montecarlo
// =====================
const registraTiroRigore = async (
  esito: "segnato" | "sbagliato"
) => {
  if (!partita || !rigoristaSelezionato) return false;

  const { data: rigoriEsistenti, error: letturaErr } = await supabase
    .from("rigori_partita")
    .select("ordine")
    .eq("partita_id", partita.id)
    .eq("squadra_id", MONTECARLO_ID);

  if (letturaErr) {
    console.error(
      "❌ Errore lettura rigori:",
      letturaErr.message
    );
    return false;
  }

  const ordine = (rigoriEsistenti?.length || 0) + 1;

  const { data: tiroSalvato, error } = await supabase
  .from("rigori_partita")
  .insert({
    partita_id: partita.id,
    stagione_id: partita.stagione_id,
    giocatore_stagione_id: rigoristaSelezionato,
    squadra_id: MONTECARLO_ID,
    ordine,
    esito,
  })
  .select("id, squadra_id, giocatore_stagione_id, ordine, esito")
  .single();

  if (tiroSalvato) {
  setTiriRigori((prev) => [...prev, tiroSalvato]);
}

  setRigoristaSelezionato("");

  console.log(
    esito === "segnato"
      ? "⚽ Rigore segnato"
      : "❌ Rigore sbagliato"
  );

  return true;
};

// =====================
// Registrazione tiro rigore avversario
// =====================
const registraTiroRigoreAvversario = async (
  esito: "segnato" | "sbagliato"
) => {
if (!partita) return false;

  const squadraAvversariaId =
    isMontecarlo(squadraCasa?.id, squadraCasa?.nome)
      ? squadraOspite?.id
      : squadraCasa?.id;

 if (!squadraAvversariaId) return false;

  const { data: rigoriEsistenti, error: letturaErr } = await supabase
    .from("rigori_partita")
    .select("ordine")
    .eq("partita_id", partita.id)
    .eq("squadra_id", squadraAvversariaId);

  if (letturaErr) {
    console.error(
      "❌ Errore lettura rigori avversario:",
      letturaErr.message
    );
    return false;
  }

  const ordine = (rigoriEsistenti?.length || 0) + 1;

  const { data: tiroSalvato, error } = await supabase
  .from("rigori_partita")
  .insert({
    partita_id: partita.id,
    stagione_id: partita.stagione_id,
    giocatore_stagione_id: null,
    squadra_id: squadraAvversariaId,
    ordine,
    esito,
  })
  .select("id, squadra_id, giocatore_stagione_id, ordine, esito")
  .single();

 if (error) {
  console.error(
    "❌ Errore registrazione tiro rigore avversario:",
    error.message
  );
  return false;
}
if (tiroSalvato) {
  setTiriRigori((prev) => [...prev, tiroSalvato]);
}

console.log(
  esito === "segnato"
    ? "⚽ Rigore avversario segnato"
    : "❌ Rigore avversario sbagliato"
);

return true;
};

// =====================
// Eliminazione tiro rigore
// =====================
const eliminaTiroRigore = async (
  tiro: {
    id: string;
    squadra_id: string;
    giocatore_stagione_id: string | null;
    ordine: number;
    esito: "segnato" | "sbagliato";
  }
) => {
  if (!partita) return;

  const { error } = await supabase
    .from("rigori_partita")
    .delete()
    .eq("id", tiro.id);

  if (error) {
    console.error(
      "❌ Errore eliminazione tiro rigore:",
      error.message
    );
    return;
  }

  setTiriRigori((prev) =>
    prev.filter((r) => r.id !== tiro.id)
  );

    const rigoriRimanenti = tiriRigori
    .filter(
      (r) =>
        r.id !== tiro.id &&
        r.squadra_id === tiro.squadra_id
    )
    .sort((a, b) => a.ordine - b.ordine);

  for (let i = 0; i < rigoriRimanenti.length; i++) {
    const nuovoOrdine = i + 1;

    if (rigoriRimanenti[i].ordine !== nuovoOrdine) {
      const { error: ordineError } = await supabase
        .from("rigori_partita")
        .update({ ordine: nuovoOrdine })
        .eq("id", rigoriRimanenti[i].id);

      if (ordineError) {
        console.error(
          "❌ Errore riordino rigori:",
          ordineError.message
        );
        return;
      }
    }
  }

  setTiriRigori((prev) =>
    prev
      .filter((r) => r.id !== tiro.id)
      .map((r) => {
        if (r.squadra_id !== tiro.squadra_id) return r;

        const posizione = rigoriRimanenti.findIndex(
          (x) => x.id === r.id
        );

        return posizione >= 0
          ? { ...r, ordine: posizione + 1 }
          : r;
      })
  );

  if (tiro.esito === "segnato") {
    if (tiro.squadra_id === squadraCasa?.id) {
      await aggiornaRigori("casa", -1);
    } else if (tiro.squadra_id === squadraOspite?.id) {
      await aggiornaRigori("ospite", -1);
    }
  }
};

  // Inserisce una riga "gol segnato da Montecarlo" (marcatore da scegliere)
  const aggiungiMarcatore = async (periodo: number) => {
    if (!partita) return;
    const goal_tempo = (marcatori[periodo]?.length || 0) + 1;

    const tempoSec = getTempoAssoluto(
  timerState,
  getElapsedCorrente(timerState)
);

    const { data, error } = await supabase
      .from("marcatori")
      .insert({
        partita_id: partita.id,
        stagione_id: partita.stagione_id,
        periodo,
        goal_tempo,
        tempo_sec: tempoSec,
        giocatore_stagione_id: null,
        giocatore_uid: null,
        portiere_subisce_id: null,
        squadra_segnante_id: MONTECARLO_ID,
      })
      .select(
  "id, periodo, goal_tempo, tempo_sec, tipo_goal, giocatore_stagione_id, portiere_subisce_id, squadra_segnante_id"
)
      .single();

    if (!error && data) {
      const attuali = marcatori[periodo] || [];
      aggiornaMarcatoriLocal(periodo, [
        ...attuali,
        {
  goal_tempo: data.goal_tempo,
  tempo_sec: data.tempo_sec,
  tipo_goal: data.tipo_goal,
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
    const tempoSec = getTempoAssoluto(
  timerState,
  getElapsedCorrente(timerState)
);
    const squadraSegnanteId =
      side === "casa" ? partita.squadra_casa_id : partita.squadra_ospite_id;

    const { data, error } = await supabase
      .from("marcatori")
      .insert({
        partita_id: partita.id,
        stagione_id: partita.stagione_id,
                periodo,
        goal_tempo,
        tempo_sec: tempoSec,
        giocatore_stagione_id: null, // non è un marcatore MC
        giocatore_uid: null,
        portiere_subisce_id: null, // lo scegli dopo
        squadra_segnante_id: squadraSegnanteId,
      })
      .select(
  "id, periodo, goal_tempo, tempo_sec, tipo_goal, giocatore_stagione_id, portiere_subisce_id, squadra_segnante_id"
)
      .single();

    if (!error && data) {
      const attuali = marcatori[periodo] || [];
      aggiornaMarcatoriLocal(periodo, [
        ...attuali,
        {
  goal_tempo: data.goal_tempo,
  tempo_sec: data.tempo_sec,
  tipo_goal: data.tipo_goal,
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

  // Assegna assist (solo per gol segnati da Montecarlo)
const selezionaAssist = async (
  periodo: number,
  goal_tempo: number,
  gStagioneId: string
) => {
  if (!partita) return;

  const assistId = gStagioneId || null;

  // Update locale
  setMarcatori((prev) => {
    const aggiornata = (prev[periodo] || []).map((m) =>
      m.goal_tempo === goal_tempo
        ? { ...m, assist_giocatore_stagione_id: assistId }
        : m
    );

    return { ...prev, [periodo]: aggiornata };
  });

  // Update DB
  const entry = (marcatori[periodo] || []).find(
    (m) => m.goal_tempo === goal_tempo
  );

  if (entry?.id_supabase) {
    await supabase
      .from("marcatori")
      .update({
        assist_giocatore_stagione_id: assistId,
      })
      .eq("id", entry.id_supabase);
  } else {
    await supabase
      .from("marcatori")
      .update({
        assist_giocatore_stagione_id: assistId,
      })
      .eq("partita_id", partita.id)
      .eq("periodo", periodo)
      .eq("goal_tempo", goal_tempo);
  }
};

// =====================
// MARCATORI - Modifica tempo goal
// =====================
const modificaTempoGoal = async (
  periodo: number,
  goal_tempo: number,
  tempoSec: number
) => {
  if (!partita) return;

  setMarcatori((prev) => {
    const aggiornata = (prev[periodo] || []).map((m) =>
      m.goal_tempo === goal_tempo
        ? { ...m, tempo_sec: tempoSec }
        : m
    );

    return { ...prev, [periodo]: aggiornata };
  });

  const entry = (marcatori[periodo] || []).find(
    (m) => m.goal_tempo === goal_tempo
  );

  if (entry?.id_supabase) {
    const { error } = await supabase
      .from("marcatori")
      .update({ tempo_sec: tempoSec })
      .eq("id", entry.id_supabase);

    if (error) {
      console.error("❌ Errore modifica tempo goal:", error.message);
    }
  } else {
    const { error } = await supabase
      .from("marcatori")
      .update({ tempo_sec: tempoSec })
      .eq("partita_id", partita.id)
      .eq("periodo", periodo)
      .eq("goal_tempo", goal_tempo);

    if (error) {
      console.error("❌ Errore modifica tempo goal:", error.message);
    }
  }
};

// =====================
// MARCATORI - Modifica tipo goal
// =====================
const modificaTipoGoal = async (
  periodo: number,
  goal_tempo: number,
  tipoGoal: "azione" | "rigore"
) => {
  if (!partita) return;

  setMarcatori((prev) => {
    const aggiornata = (prev[periodo] || []).map((m) =>
      m.goal_tempo === goal_tempo
        ? { ...m, tipo_goal: tipoGoal }
        : m
    );

    return { ...prev, [periodo]: aggiornata };
  });

  const entry = (marcatori[periodo] || []).find(
    (m) => m.goal_tempo === goal_tempo
  );

  if (entry?.id_supabase) {
    const { error } = await supabase
      .from("marcatori")
      .update({ tipo_goal: tipoGoal })
      .eq("id", entry.id_supabase);

    if (error) {
      console.error("❌ Errore modifica tipo goal:", error.message);
    }
  } else {
    const { error } = await supabase
      .from("marcatori")
      .update({ tipo_goal: tipoGoal })
      .eq("partita_id", partita.id)
      .eq("periodo", periodo)
      .eq("goal_tempo", goal_tempo);

    if (error) {
      console.error("❌ Errore modifica tipo goal:", error.message);
    }
  }
};

  // =====================
// CARTELLINI - Salvataggio
// =====================
const salvaCartellino = async (
  giocatoreStagioneId: string,
  tipo: "giallo" | "rosso"
) => {
  if (!partita || periodoCartellino === null) return;

  const minuto = Number(minutoCartellino);

  if (!Number.isFinite(minuto) || minuto < 1) {
    alert("Inserisci un minuto valido.");
    return;
  }

  const tempoSec = minuto * 60;

  const { data, error } = await supabase
    .from("cartellini")
    .insert({
      partita_id: partita.id,
      stagione_id: partita.stagione_id,
      giocatore_stagione_id: giocatoreStagioneId,
      tipo,
      periodo: periodoCartellino,
      tempo_sec: tempoSec,
    })
    .select("id, giocatore_stagione_id, tipo, periodo, tempo_sec")
    .single();

  if (error) {
    console.error("❌ Errore salvataggio cartellino:", error.message);
    return;
  }

  if (data) {
    setCartellini((prev) => [...prev, data]);
  }

  console.log(
    tipo === "giallo" ? "🟨 Cartellino giallo salvato" : "🟥 Cartellino rosso salvato",
    data
  );
};

const salvaSostituzione = async (uscente: string, entrante: string, _minutoIgnored: number) => {
  if (!partita) return;

  const statoCorrente = getStatoPartita(timerState);
  const nowSec = getTempoAssoluto(timerState, elapsed);

  // Se la sostituzione avviene durante un tempo di gioco
  if (
    statoCorrente === StatoPartita.PRIMO_TEMPO ||
    statoCorrente === StatoPartita.SECONDO_TEMPO
  ) {
    // Chi esce → chiudi la sua riga aperta nei minuti
    await supabase
      .from("minuti_giocati")
      .update({ uscita_sec: nowSec })
      .eq("partita_id", partita.id)
      .eq("giocatore_stagione_id", uscente)
      .is("uscita_sec", null);

          const { data: righeEntranteAperte } = await supabase
      .from("minuti_giocati")
      .select("id")
      .eq("partita_id", partita.id)
      .eq("giocatore_stagione_id", entrante)
      .is("uscita_sec", null)
      .limit(1);

    const rigaEntranteAperta =
      righeEntranteAperte && righeEntranteAperte.length > 0;

    // Chi entra → nuova riga nei minuti solo se non ne ha già una aperta
    if (!rigaEntranteAperta) {
      await supabase.from("minuti_giocati").insert({
        partita_id: partita.id,
        giocatore_stagione_id: entrante,
        entrata_sec: nowSec,
        uscita_sec: null,
        run_index: timerState?.run_index ?? 1,
      });
    }

    // Stato locale minuti
    setMinutiRows((prev) => {
      const updated = prev.map((r) =>
        r.giocatore_stagione_id === uscente && r.uscita_sec === null
          ? { ...r, uscita_sec: nowSec }
          : r
      );

           if (!rigaEntranteAperta) {
        updated.push({
          giocatore_stagione_id: entrante,
          entrata_sec: nowSec,
          uscita_sec: null,
        });
      }

      return updated;
    });
  }

  // Durante l'INTERVALLO non tocchiamo minuti_giocati.
  // Il nuovo giocatore verrà aperto da inizioSecondoTempo()
  // con run_index = 2.

  // Aggiorna formazioni_partita (sostituzione sul campo)
  await supabase
    .from("formazioni_partita")
    .update({ giocatore_stagione_id: entrante })
    .eq("partita_id", partita.id)
    .eq("giocatore_stagione_id", uscente);

  // Aggiorna elenco giocatori attualmente in campo
  setTitolari((prev) => {
    const senzaUscente = prev.filter((id) => id !== uscente);
    return [...senzaUscente, entrante];
  });

  setOrdineUsciti((prev) => [
  ...prev.filter((id) => id !== uscente),
  uscente,
]);

setOrdineEntrati((prev) => [
  ...prev.filter((id) => id !== entrante),
  entrante,
]);
  
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
      <div className="container mx-auto px-0">
        {lista.map((m) => (
  <div key={m.goal_tempo} className="space-y-1 mb-2">

    {/* Tempo del goal */}
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Minuto:</span>

      <input
        type="text"
        value={
  m.tempo_sec == null
    ? ""
    : Math.max(1, Math.ceil(m.tempo_sec / 60))
}
        onChange={(e) => {
          const valore = e.target.value.trim();
          const parti = valore.split(":");

          let secondi = 0;

          if (parti.length === 2) {
            const minuti = Number(parti[0]);
            const sec = Number(parti[1]);

            if (
              Number.isFinite(minuti) &&
              Number.isFinite(sec) &&
              minuti >= 0 &&
              sec >= 0 &&
              sec <= 59
            ) {
              secondi = minuti * 60 + sec;
            } else {
              return;
            }
          } else {
            const minuti = Number(valore);

            if (!Number.isFinite(minuti) || minuti < 0) return;

            secondi = minuti * 60;
          }

          modificaTempoGoal(
            tempo,
            m.goal_tempo,
            secondi
          );
        }}
        className="w-24 border rounded px-2 py-1"
      />
    </div>

    {/* Tipo goal */}
<div className="flex items-center gap-2">
  <span className="text-sm font-medium">Tipo:</span>

  <select
    value={m.tipo_goal || "azione"}
    onChange={(e) =>
      modificaTipoGoal(
        tempo,
        m.goal_tempo,
        e.target.value as "azione" | "rigore"
      )
    }
    className="border rounded px-2 py-1"
  >
    <option value="azione">⚽ Azione</option>
    <option value="rigore">🥅 Rigore</option>
  </select>
</div>

        {/* Marcatore */}
    <select
      value={m.giocatore_stagione_id || ""}
      onChange={(e) =>
        selezionaMarcatore(tempo, m.goal_tempo, e.target.value)
      }
      className="w-full border rounded px-2 py-1"
    >
      <option value="">-- Seleziona marcatore --</option>
      {opzioni.map((g) => (
        <option key={g.id} value={g.id}>
          {(g.cognome || "").trim()} {(g.nome || "").trim()}
        </option>
      ))}
    </select>

    {/* Assist */}
    <select
      value={m.assist_giocatore_stagione_id || ""}
      onChange={(e) =>
        selezionaAssist(tempo, m.goal_tempo, e.target.value)
      }
      className="w-full border rounded px-2 py-1"
    >
      <option value="">-- Nessun assist --</option>
      {opzioni.map((g) => (
        <option key={g.id} value={g.id}>
          {(g.cognome || "").trim()} {(g.nome || "").trim()}
        </option>
      ))}
    </select>
  </div>
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
      <div className="container mx-auto px-0">
        {lista.map((m) => (
  <div key={m.goal_tempo} className="space-y-1 mb-2">

    {/* Tipo goal subito */}
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Tipo:</span>

      <select
        value={m.tipo_goal || "azione"}
        onChange={(e) =>
          modificaTipoGoal(
            tempo,
            m.goal_tempo,
            e.target.value as "azione" | "rigore"
          )
        }
        className="border rounded px-2 py-1"
      >
        <option value="azione">⚽ Azione</option>
        <option value="rigore">🥅 Rigore</option>
      </select>
    </div>

    {/* Portiere che subisce */}
    <select
      value={m.portiere_subisce_id || ""}
      onChange={(e) =>
        selezionaPortiereSubisce(
          tempo,
          m.goal_tempo,
          e.target.value
        )
      }
      className="w-full border rounded px-2 py-1"
    >
      <option value="">-- Seleziona portiere --</option>
      {opzioniPortieri.map((g) => (
        <option key={g.id} value={g.id}>
          {(g.cognome || "").trim()} {(g.nome || "").trim()}
        </option>
      ))}
    </select>

  </div>
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

  // 1. Aggiorna lo stato della partita
  const { error } = await supabase
    .from("partite")
    .update({ stato: "Giocata" })
    .eq("id", partita.id);

  if (error) {
    console.error("❌ Errore salvataggio stato partita:", error.message);
    return;
  }

  // 2. Vai alla pagina risultati
  navigate("/risultati");
};

const salvaStatoConferma = async () => {
  if (!window.confirm("Sei sicuro di voler salvare e chiudere la partita come 'Giocata'?")) {
    return;
  }
  await salvaStato();
};
const statoPartita = getStatoPartita(timerState);
// ========================
// Minuto complessivo partita
// ========================
const minutoPartita = Math.max(
  0,
  Math.floor(
    ((timerState?.total_elapsed_sec || 0) + Math.floor(elapsed / 1000)) / 60
  )
);

let timerLabel = "PRONTO PER IL 1° TEMPO";

if (statoPartita === StatoPartita.PRIMO_TEMPO) {
  timerLabel =
    timerState?.timer_status === "paused"
      ? "1° TEMPO (IN PAUSA)"
      : "1° TEMPO";
}

if (statoPartita === StatoPartita.INTERVALLO) {
  timerLabel = "INTERVALLO";
}

if (statoPartita === StatoPartita.SECONDO_TEMPO) {
  timerLabel =
    timerState?.timer_status === "paused"
      ? "2° TEMPO (IN PAUSA)"
      : "2° TEMPO";
}

if (statoPartita === StatoPartita.FINE_TEMPI_REGOLAMENTARI) {
  timerLabel = "FINE TEMPI REGOLAMENTARI";
}

if (statoPartita === StatoPartita.PRIMO_TEMPO_SUPPLEMENTARE) {
  timerLabel =
    timerState?.timer_status === "paused"
      ? "1° TEMPO SUPPLEMENTARE (IN PAUSA)"
      : "1° TEMPO SUPPLEMENTARE";
}

if (statoPartita === StatoPartita.INTERVALLO_SUPPLEMENTARI) {
  timerLabel = "INTERVALLO SUPPLEMENTARI";
}

if (statoPartita === StatoPartita.SECONDO_TEMPO_SUPPLEMENTARE) {
  timerLabel =
    timerState?.timer_status === "paused"
      ? "2° TEMPO SUPPLEMENTARE (IN PAUSA)"
      : "2° TEMPO SUPPLEMENTARE";
}

if (statoPartita === StatoPartita.FINE_TEMPI_SUPPLEMENTARI) {
  timerLabel = "FINE TEMPI SUPPLEMENTARI";
}

if (statoPartita === StatoPartita.RIGORI) {
  timerLabel = "RIGORI";
}

if (statoPartita === StatoPartita.FINE_PARTITA) {
  timerLabel = "PARTITA TERMINATA";
}

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
    <CronometroPartita
      elapsed={elapsed}
      initialDuration={currentDuration}
      onDurationChange={changeDuration}
      label={timerLabel}
    />

    <div
      className="w-[74px] h-[38px] flex items-center justify-center border border-gray-300 rounded text-lg font-bold bg-white"
      style={{ marginTop: "-12px" }}
    >
      {minutoPartita}'
    </div>
  

  <div className="flex flex-wrap gap-2 justify-center">

    {/* Prepartita */}
    {statoPartita === StatoPartita.PREPARTITA && (
      <button
        onClick={startTimer}
        className="bg-green-600 text-white px-3 py-1 rounded"
      >
        ▶ Inizio 1° Tempo
      </button>
    )}

{/* Primo tempo */}
{statoPartita === StatoPartita.PRIMO_TEMPO && (
  <>
    {timerState?.timer_status === "running" ? (
      <button
        onClick={pauseTimer}
        className="bg-yellow-500 text-white px-3 py-1 rounded"
      >
        ⏸ Pausa
      </button>
    ) : (
      <button
        onClick={startTimer}
        className="bg-green-600 text-white px-3 py-1 rounded"
      >
        ▶ Riprendi
      </button>
    )}

    <button
      onClick={intervallo}
      className="bg-blue-600 text-white px-3 py-1 rounded"
    >
      🏁 Fine 1° Tempo
    </button>
  </>
)}

{/* Intervallo */}
{statoPartita === StatoPartita.INTERVALLO && (
  <button
    onClick={inizioSecondoTempo}
    className="bg-green-600 text-white px-3 py-1 rounded"
  >
    ▶ Inizio 2° Tempo
  </button>
)}

{/* Secondo tempo */}
{statoPartita === StatoPartita.SECONDO_TEMPO && (
  <>
    {timerState?.timer_status === "running" ? (
      <button
        onClick={pauseTimer}
        className="bg-yellow-500 text-white px-3 py-1 rounded"
      >
        ⏸ Pausa
      </button>
    ) : (
      <button
        onClick={startTimer}
        className="bg-green-600 text-white px-3 py-1 rounded"
      >
        ▶ Riprendi
      </button>
    )}

    <button
  onClick={fineTempiRegolamentari}
  className="bg-blue-600 text-white px-3 py-1 rounded"
>
  🏁 Fine Tempi Regolamentari
</button>
  </>
)}

{/* Fine tempi regolamentari */}
{statoPartita === StatoPartita.FINE_TEMPI_REGOLAMENTARI && (
  <>
    <button
      onClick={finePartita}
      className="bg-blue-600 text-white px-3 py-1 rounded"
    >
      🏁 Termina Partita
    </button>

    <button
      onClick={inizioPrimoTempoSupplementare}
      className="bg-green-600 text-white px-3 py-1 rounded"
    >
      ▶ Tempi Supplementari
    </button>

    <button
  onClick={inizioRigori}
  className="bg-orange-600 text-white px-3 py-1 rounded"
>
  ⚽ Rigori
</button>
  </>
)}

{/* Primo tempo supplementare */}
{statoPartita === StatoPartita.PRIMO_TEMPO_SUPPLEMENTARE && (
  <>
    {timerState?.timer_status === "running" && (
      <button
       onClick={pauseTimer}
        className="bg-yellow-500 text-white px-3 py-1 rounded"
      >
        ⏸ Pausa
      </button>
    )}

    {timerState?.timer_status === "paused" && (
      <button
        onClick={startTimer}
        className="bg-green-600 text-white px-3 py-1 rounded"
      >
        ▶ Riprendi
      </button>
    )}

    <button
      onClick={finePrimoTempoSupplementare}
      className="bg-blue-600 text-white px-3 py-1 rounded"
    >
      ⏹ Fine 1° Tempo Supplementare
    </button>
  </>
)}

{/* Intervallo supplementari */}
{statoPartita === StatoPartita.INTERVALLO_SUPPLEMENTARI && (
  <button
    onClick={inizioSecondoTempoSupplementare}
    className="bg-green-600 text-white px-3 py-1 rounded"
  >
    ▶ Inizia 2° Tempo Supplementare
  </button>
)}

{/* Secondo tempo supplementare */}
{statoPartita === StatoPartita.SECONDO_TEMPO_SUPPLEMENTARE && (
  <>
    {timerState?.timer_status === "running" && (
      <button
        onClick={pauseTimer}
        className="bg-yellow-500 text-white px-3 py-1 rounded"
      >
        ⏸ Pausa
      </button>
    )}

    {timerState?.timer_status === "paused" && (
      <button
        onClick={startTimer}
        className="bg-green-600 text-white px-3 py-1 rounded"
      >
        ▶ Riprendi
      </button>
    )}

    <button
      onClick={fineSecondoTempoSupplementare}
      className="bg-blue-600 text-white px-3 py-1 rounded"
    >
      🏁 Fine 2° Tempo Supplementare
    </button>
  </>
)}

{/* Fine tempi supplementari */}
{statoPartita === StatoPartita.FINE_TEMPI_SUPPLEMENTARI && (
  <>
    <button
      onClick={finePartita}
      className="bg-blue-600 text-white px-3 py-1 rounded"
    >
      🏁 Termina Partita
    </button>

    <button
  onClick={inizioRigori}
  className="bg-green-600 text-white px-3 py-1 rounded"
>
  ⚽ Rigori
</button>
  </>
)}

{/* Rigori */}
{statoPartita === StatoPartita.RIGORI && (
  <div className="w-full space-y-3">

        {/* Scelta rigorista Montecarlo */}
    <div className="space-y-1">
      <label className="block text-sm font-medium">
        Rigorista Montecarlo
      </label>

      <select
        value={rigoristaSelezionato}
        onChange={(e) => setRigoristaSelezionato(e.target.value)}
        className="w-full border rounded px-2 py-1"
      >
        <option value="">-- Seleziona rigorista --</option>

        {giocatori
  .filter((g) => convocati.includes(g.id))
  .map((g) => (
    <option key={g.id} value={g.id}>
      {(g.cognome || "").trim()} {(g.nome || "").trim()}
    </option>
  ))}
      </select>
    </div>

        {/* Esito rigore Montecarlo */}
    <div className="flex justify-center gap-3">
      <button
        onClick={async () => {
  if (!rigoristaSelezionato) return;

  const salvato = await registraTiroRigore("segnato");

  if (!salvato) return;

  if (isMontecarlo(squadraCasa?.id, squadraCasa?.nome)) {
    await aggiornaRigori("casa", 1);
  } else {
    await aggiornaRigori("ospite", 1);
  }
}}
        disabled={!rigoristaSelezionato}
        className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        ⚽ Segnato
      </button>

      <button
        onClick={async () => {
          if (!rigoristaSelezionato) return;

          await registraTiroRigore("sbagliato");
        }}
        disabled={!rigoristaSelezionato}
        className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        ❌ Sbagliato
      </button>
    </div>

        {/* Esito rigore avversario */}
    <div className="space-y-2">
      <div className="text-sm font-medium text-center">
        Rigore {isMontecarlo(squadraCasa?.id, squadraCasa?.nome)
          ? squadraOspite?.nome
          : squadraCasa?.nome}
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={async () => {
  const salvato = await registraTiroRigoreAvversario("segnato");

  if (!salvato) return;

  if (isMontecarlo(squadraCasa?.id, squadraCasa?.nome)) {
    await aggiornaRigori("ospite", 1);
  } else {
    await aggiornaRigori("casa", 1);
  }
}}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          ⚽ Segnato
        </button>

        <button
          onClick={() => registraTiroRigoreAvversario("sbagliato")}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          ❌ Sbagliato
        </button>
      </div>
    </div>

        {/* ========================
        Sequenza rigori
    ======================== */}
    {tiriRigori.length > 0 && (
      <div className="border rounded p-3 space-y-2">
        <div className="font-bold text-center">
          Sequenza rigori
        </div>

        {tiriRigori.map((tiro) => {
          const montecarlo = tiro.squadra_id === MONTECARLO_ID;

          const giocatore = montecarlo
            ? giocatori.find(
                (g) => g.id === tiro.giocatore_stagione_id
              )
            : null;

          const nome = montecarlo
            ? `${(giocatore?.cognome || "").trim()} ${(giocatore?.nome || "").trim()}`.trim()
            : isMontecarlo(squadraCasa?.id, squadraCasa?.nome)
              ? squadraOspite?.nome
              : squadraCasa?.nome;

          return (
            <div
              key={tiro.id}
              className="flex items-center justify-between border-b pb-1"
            >
              <span>
                {tiro.ordine}. {nome || "Giocatore"}
              </span>

              <div className="flex items-center gap-2">
  <span className="font-bold">
    {tiro.esito === "segnato" ? "⚽ Segnato" : "❌ Sbagliato"}
  </span>

  <button
    onClick={() => eliminaTiroRigore(tiro)}
    className="text-red-600 font-bold px-2"
    title="Elimina tiro"
  >
    🗑️
  </button>
</div>
            </div>
          );
        })}
      </div>
    )}

    <div className="flex items-center justify-between gap-4">
      <span className="font-bold">
        {squadraCasa?.nome}
      </span>

      <div className="flex items-center gap-3">
        <button
          onClick={() => aggiornaRigori("casa", -1)}
          className="text-3xl"
        >
          −
        </button>

        <span className="text-xl font-bold">
          {rigoriCasa}
        </span>

        <button
          onClick={() => aggiornaRigori("casa", 1)}
          className="text-3xl"
        >
          +
        </button>
      </div>
    </div>

    <div className="flex items-center justify-between gap-4">
      <span className="font-bold">
        {squadraOspite?.nome}
      </span>

      <div className="flex items-center gap-3">
        <button
          onClick={() => aggiornaRigori("ospite", -1)}
          className="text-3xl"
        >
          −
        </button>

        <span className="text-xl font-bold">
          {rigoriOspite}
        </span>

        <button
          onClick={() => aggiornaRigori("ospite", 1)}
          className="text-3xl"
        >
          +
        </button>
      </div>
    </div>

    <button
      onClick={finePartita}
      className="bg-blue-600 text-white px-3 py-1 rounded"
    >
      🏁 Termina Partita
    </button>

  </div>
)}

<button
  onClick={resetTimer}
  className="bg-red-600 text-white px-3 py-1 rounded"
>
  🔄 Reset Partita
</button>

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

      if (titolari.length !== 11) {
        alert(
          `Devi selezionare esattamente 11 titolari.\nAttualmente ne hai selezionati ${titolari.length}.`
        );
        return;
      }

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
        {[
  ...titolari.filter((tid) => !ordineEntrati.includes(tid)),
  ...ordineEntrati.filter((tid) => titolari.includes(tid)),
]
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
  highlightedSubs.has(gioc!.id)
    ? "bg-red-200 font-bold"
    : uscenteSelezionato === gioc!.id
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
        {[
  ...convocati.filter(
    (cid) => !titolari.includes(cid) && !ordineUsciti.includes(cid)
  ),
  ...ordineUsciti.filter(
    (cid) => convocati.includes(cid) && !titolari.includes(cid)
  ),
]
  .map((cid) => giocatori.find((g) => g.id === cid))
          .filter(Boolean)
          .map((gioc) => (
            <div
              key={gioc!.id}
              onClick={() => {
                if (uscenteSelezionato) {
                  setEntranteSelezionato((prev) =>
                    prev === gioc!.id ? null : gioc!.id
                  );
                }
              }}
              className={`cursor-pointer flex items-center justify-between pr-2 border-b py-1 ${
                entranteSelezionato === gioc!.id
                  ? "bg-green-200 font-bold"
                  : highlightedSubs.has(gioc!.id)
                    ? "bg-red-200 font-bold"
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
      </div>

      <button
  onClick={() => {
  setUscenteSelezionato(null);
  setEntranteSelezionato(null);
  setSostituzioniAperte(false);
}}

        className="w-full bg-red-500 text-white py-2 rounded-lg mt-4"

        
      >
      <button
        onClick={async () => {
          if (!uscenteSelezionato || !entranteSelezionato) return;

          const minuto = Math.floor(elapsed / 1000);

          await salvaSostituzione(
            uscenteSelezionato,
            entranteSelezionato,
            minuto
          );

          setHighlightedSubs((prev) => {
            const nuovo = new Set(prev);
            nuovo.add(uscenteSelezionato);
            nuovo.add(entranteSelezionato);
            return nuovo;
          });

          setUscenteSelezionato(null);
          setEntranteSelezionato(null);
        }}
        disabled={!uscenteSelezionato || !entranteSelezionato}
        className="w-full bg-green-600 text-white py-2 rounded-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Sostituisci
      </button>

        Chiudi
      </button>
    </div>
  </div>
)}


{/* Pulsanti eventi partita */}
<div className="flex justify-center space-x-4">
  <button
    onClick={() => {
  setTipoEvento((prev) => (prev === "gol" ? null : "gol"));
  setTempo(null);
}}
    className={`px-5 py-2 rounded-full text-2xl ${
      tipoEvento === "gol"
        ? "bg-montecarlo-secondary text-white"
        : "bg-montecarlo-gray-50 hover:bg-montecarlo-gray-100"
    }`}
    title="Gol"
  >
    ⚽
  </button>

  <button
    onClick={() =>
      setTipoEvento((prev) => (prev === "giallo" ? null : "giallo"))
    }
    className={`px-5 py-2 rounded-full text-2xl ${
      tipoEvento === "giallo"
        ? "bg-montecarlo-secondary text-white"
        : "bg-montecarlo-gray-50 hover:bg-montecarlo-gray-100"
    }`}
    title="Cartellino giallo"
  >
    🟨
  </button>

    <button
    onClick={() =>
      setTipoEvento((prev) => (prev === "rosso" ? null : "rosso"))
    }
    className={`px-5 py-2 rounded-full text-2xl ${
      tipoEvento === "rosso"
        ? "bg-montecarlo-secondary text-white"
        : "bg-montecarlo-gray-50 hover:bg-montecarlo-gray-100"
    }`}
    title="Cartellino rosso"
  >
    🟥
  </button>
</div>

{/* Scelta manuale tempo per goal */}
{tipoEvento === "gol" && (
  <div className="flex flex-wrap justify-center gap-2">
    <button
      onClick={() => setTempo(1)}
      className={`px-5 py-2 rounded-full font-medium ${
        tempo === 1
          ? "bg-montecarlo-secondary text-white"
          : "bg-montecarlo-gray-50 text-gray-900 hover:bg-montecarlo-gray-100"
      }`}
    >
      1° Tempo
    </button>

    <button
      onClick={() => setTempo(2)}
      className={`px-5 py-2 rounded-full font-medium ${
        tempo === 2
          ? "bg-montecarlo-secondary text-white"
          : "bg-montecarlo-gray-50 text-gray-900 hover:bg-montecarlo-gray-100"
      }`}
    >
      2° Tempo
    </button>

    <button
      onClick={() => setTempo(3)}
      className={`px-5 py-2 rounded-full font-medium ${
        tempo === 3
          ? "bg-montecarlo-secondary text-white"
          : "bg-montecarlo-gray-50 text-gray-900 hover:bg-montecarlo-gray-100"
      }`}
    >
      1° Suppl.
    </button>

    <button
      onClick={() => setTempo(4)}
      className={`px-5 py-2 rounded-full font-medium ${
        tempo === 4
          ? "bg-montecarlo-secondary text-white"
          : "bg-montecarlo-gray-50 text-gray-900 hover:bg-montecarlo-gray-100"
      }`}
    >
      2° Suppl.
    </button>
  </div>
)}

{/* Sezione gestione cartellini */}
{(tipoEvento === "giallo" || tipoEvento === "rosso") && (
  <div className="space-y-3">
        {/* Scelta periodo cartellino */}
    <select
      value={periodoCartellino ?? ""}
      onChange={(e) =>
        setPeriodoCartellino(
          e.target.value === "" ? null : Number(e.target.value)
        )
      }
      className="w-full border rounded px-2 py-2"
    >
      <option value="">-- Seleziona periodo --</option>
      <option value={1}>1° Tempo</option>
      <option value={2}>Intervallo</option>
      <option value={3}>2° Tempo</option>
      <option value={4}>Intervallo prima supplementari</option>
      <option value={5}>1° Tempo Supplementare</option>
      <option value={6}>Intervallo supplementari</option>
      <option value={7}>2° Tempo Supplementare</option>
      <option value={8}>Rigori</option>
      <option value={9}>Dopo partita</option>
    </select>
        {/* Minuto cartellino */}
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Minuto:</span>

      <input
        type="number"
        min="1"
        value={minutoCartellino}
        onChange={(e) => setMinutoCartellino(e.target.value)}
        placeholder="es. 35"
        className="w-24 border rounded px-2 py-1"
      />
    </div>
    <div className="text-center font-bold text-montecarlo-secondary">
      {tipoEvento === "giallo"
        ? "🟨 Seleziona giocatore ammonito"
        : "🟥 Seleziona giocatore espulso"}
    </div>

    <select
      value=""
      disabled={
  periodoCartellino === null ||
  !minutoCartellino ||
  Number(minutoCartellino) < 1
}
      onChange={async (e) => {
        const giocatoreId = e.target.value;

        if (!giocatoreId) return;

        await salvaCartellino(giocatoreId, tipoEvento);

        setTipoEvento(null);
      }}
      className={`w-full border rounded px-2 py-2 ${
  periodoCartellino === null ||
  !minutoCartellino ||
  Number(minutoCartellino) < 1
    ? "bg-gray-100 cursor-not-allowed"
    : ""
}`}
    >
      <option value="">-- Seleziona giocatore --</option>

      {giocatori
        .filter((g) => convocati.includes(g.id))
        .map((g) => (
          <option key={g.id} value={g.id}>
            {(g.cognome || "").trim()} {(g.nome || "").trim()}
          </option>
        ))}
    </select>
  </div>
)}

{/* Sezione gestione goal */}
{tipoEvento === "gol" && tempo && (
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