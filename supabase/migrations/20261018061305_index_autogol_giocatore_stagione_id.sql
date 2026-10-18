-- 1. Indicizza il riferimento del giocatore per i join e i controlli della chiave esterna.
CREATE INDEX IF NOT EXISTS idx_marcatori_autogol_giocatore_stagione_id
ON public.marcatori (autogol_giocatore_stagione_id);
