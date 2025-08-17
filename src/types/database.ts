export interface Giocatore {
  id: string;
  nome: string;
  cognome: string;
  numero_maglia?: number;
  ruolo?: string;
  foto_url?: string;
  data_nascita?: string;
  numero_cartellino?: number;
}

export interface Partita {
  id: string;
  stagione_id: string;
  data_ora: string;
  stato: 'Giocata' | 'DaGiocare';
  squadra_casa_id: string;
  squadra_ospite_id: string;
  campionato_torneo: string;
  luogo_torneo?: string;
  goal_a: number;
  goal_b: number;
  goal_a1: number;
  goal_a2: number;
  goal_a3: number;
  goal_a4: number;
  goal_b1: number;
  goal_b2: number;
  goal_b3: number;
  goal_b4: number;
  nome_casa?: string;
  nome_ospite?: string;
}

export interface Presenza {
  partita_id: string;
  giocatore_id: string;
}

export interface Marcatore {
  partita_id: string;
  giocatore_id: string;
  periodo: number;
}