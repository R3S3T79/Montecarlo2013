// src/types.ts

/**
 * Rappresenta una squadra.
 * Corrisponde alla tabella “squadre” in Supabase.
 */
export interface Team {
  /** UUID della squadra (PK) */
  id: string;
  /** Nome della squadra */
  nome: string;
  /** URL del logo (può essere null) */
  logo_url: string | null;
}

/**
 * Rappresenta una partita della fase a eliminazione diretta.
 * Corrisponde alla tabella “tornei_eliminazione” in Supabase.
 */
export interface MatchData {
  /** UUID della partita (PK) */
  id: string;
  /** UUID del torneo a cui appartiene (FK) */
  torneo_id: string;
  /** Numero del turno (1 = primo turno, 2 = quarti, 3 = semifinali, 4 = finale) */
  round_number: number;
  /** Indice della partita all’interno di quel turno (1, 2, …) */
  match_number: number;
  /** Nome della fase, es. "Ottavi di Finale", "Quarti di Finale", etc. */
  fase_torneo: string;
  /** UUID della squadra di casa, o null se non ancora definita */
  squadra_casa_id: string | null;
  /** UUID della squadra ospite, o null se non ancora definita */
  squadra_ospite_id: string | null;
  /** Gol segnati dalla squadra di casa (default 0) */
  gol_casa: number;
  /** Gol segnati dalla squadra ospite (default 0) */
  gol_ospite: number;
  /** UUID del vincitore della partita, o null se pareggio o non ancora giocata */
  vincitore_id: string | null;
  /** UUID della squadra vincitrice ai rigori, o null se non applicabile */
  rigori_vincitore: string | null;
  /** Data/ora in formato ISO (o null se non ancora programmata) */
  data_ora: string | null;
  /** Lettera assegnata al match (A, B, C…) per il bracket */
  lettera: string | null;
  /** UUID del match successivo a cui si qualifica il vincitore, o null per la finale */
  next_match_id: string | null;
}
