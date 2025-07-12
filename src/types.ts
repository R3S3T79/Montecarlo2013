// src/types.ts

export interface Team {
  id: string;
  nome: string;
  logo_url: string | null;
}

export interface MatchData {
  id: string;
  lettera?: string;
  squadra_casa_id: string | null;
  squadra_ospite_id: string | null;
  goal_casa: number | null;
  goal_ospite: number | null;
  data_ora: string | null;
  next_match_id: string | null;
  fase_id: string;
  stato: string;
  turno: number;          // 0 = primo turno, 1 = semifinali, 2 = finale...
  ordine_fase: number;    // ordine di visualizzazione nel turno
  is_finale?: boolean;    // flag per identificare la finale
  is_terzo_posto?: boolean; // flag per identificare la partita per il terzo posto
}