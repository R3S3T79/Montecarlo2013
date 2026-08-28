// ===============================
// File: partitaTimer.ts
// Data creazione: 02/08/2026
// Gestione completa del cronometro della partita
// ===============================

import { SupabaseClient } from "@supabase/supabase-js";

// ===============================
// Tipi
// ===============================

export interface TimerState {
  partita_id: string;
  timer_started_at: string | null;
  timer_offset_ms: number;
  timer_status: "running" | "paused" | "stopped";
  timer_duration_min: number;
  run_index: number;
  total_elapsed_sec: number;
}

// ===============================
// Stati della partita
// ===============================

export enum StatoPartita {
  PREPARTITA = "PREPARTITA",
  PRIMO_TEMPO = "PRIMO_TEMPO",
  INTERVALLO = "INTERVALLO",
  SECONDO_TEMPO = "SECONDO_TEMPO",
  FINE_TEMPI_REGOLAMENTARI = "FINE_TEMPI_REGOLAMENTARI",
  PRIMO_TEMPO_SUPPLEMENTARE = "PRIMO_TEMPO_SUPPLEMENTARE",
  INTERVALLO_SUPPLEMENTARI = "INTERVALLO_SUPPLEMENTARI",
  SECONDO_TEMPO_SUPPLEMENTARE = "SECONDO_TEMPO_SUPPLEMENTARE",
  FINE_TEMPI_SUPPLEMENTARI = "FINE_TEMPI_SUPPLEMENTARI",
  RIGORI = "RIGORI",
  FINE_PARTITA = "FINE_PARTITA",
}


// ===============================
// Restituisce lo stato attuale della partita
// ===============================
export function getStatoPartita(
  timerState: TimerState | null
): StatoPartita {
  if (!timerState) {
    return StatoPartita.PREPARTITA;
  }

  const { run_index, total_elapsed_sec } = timerState;

  // Partita mai iniziata
  if (run_index === 0) {
    return StatoPartita.PREPARTITA;
  }

  // Primo tempo
  if (run_index === 1 && total_elapsed_sec === 0) {
    return StatoPartita.PRIMO_TEMPO;
  }

  // Intervallo
  if (run_index === 1 && total_elapsed_sec > 0) {
    return StatoPartita.INTERVALLO;
  }

    // Secondo tempo
  if (run_index === 2 && timerState.timer_status !== "stopped") {
    return StatoPartita.SECONDO_TEMPO;
  }


  // Fine tempi regolamentari
  if (run_index === 2 && timerState.timer_status === "stopped") {
    return StatoPartita.FINE_TEMPI_REGOLAMENTARI;
  }


 // Primo tempo supplementare
if (
  run_index === 3 &&
  timerState.timer_status !== "stopped"
) {
  return StatoPartita.PRIMO_TEMPO_SUPPLEMENTARE;
}


// Intervallo supplementari
if (
  run_index === 3 &&
  timerState.timer_status === "stopped"
) {
  return StatoPartita.INTERVALLO_SUPPLEMENTARI;
}


  // Secondo tempo supplementare
if (
  run_index === 4 &&
  timerState.timer_status !== "stopped"
) {
  return StatoPartita.SECONDO_TEMPO_SUPPLEMENTARE;
}


// Fine tempi supplementari
if (
  run_index === 4 &&
  timerState.timer_status === "stopped"
) {
  return StatoPartita.FINE_TEMPI_SUPPLEMENTARI;
}


// Rigori
if (run_index === 5) {
  return StatoPartita.RIGORI;
}


// Fine partita
return StatoPartita.FINE_PARTITA;
}

// ===============================
// Restituisce il tempo assoluto della partita
// (in secondi)
// ===============================
export function getTempoAssoluto(
  timerState: TimerState | null,
  elapsedMs: number
): number {
  if (!timerState) return 0;

  return (
    timerState.total_elapsed_sec +
    Math.floor(elapsedMs / 1000)
  );
}

// ===============================
// Calcola il tempo trascorso del tempo corrente
// (in millisecondi)
// ===============================
export function getElapsedCorrente(timerState: TimerState | null): number {
  if (!timerState) return 0;

  if (timerState.timer_status !== "running") {
    return timerState.timer_offset_ms;
  }

  if (!timerState.timer_started_at) {
    return timerState.timer_offset_ms;
  }

  return (
    timerState.timer_offset_ms +
    (Date.now() - new Date(timerState.timer_started_at).getTime())
  );
}