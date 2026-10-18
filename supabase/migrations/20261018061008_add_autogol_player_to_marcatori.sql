-- 1. Aggiunge un riferimento dedicato al giocatore che realizza un autogol.
ALTER TABLE public.marcatori
ADD COLUMN autogol_giocatore_stagione_id uuid NULL;

ALTER TABLE public.marcatori
ADD CONSTRAINT marcatori_autogol_giocatore_stagione_id_fkey
FOREIGN KEY (autogol_giocatore_stagione_id)
REFERENCES public.giocatori_stagioni(id)
ON DELETE SET NULL;

-- 2. Espone il nome del giocatore responsabile dell'autogol nella vista partita.
CREATE OR REPLACE VIEW public.marcatori_alias AS
SELECT m.id,
    m.partita_id,
    m.periodo,
    m.created_at,
    m.stagione_id,
    m.goal_tempo,
    m.giocatore_uid,
    m.giocatore_stagione_id,
    gs.nome AS giocatore_nome,
    gs.cognome AS giocatore_cognome,
    m.portiere_subisce_id,
    gp.nome AS portiere_nome,
    gp.cognome AS portiere_cognome,
    m.squadra_segnante_id,
    m.tempo_sec,
    m.giocatore_avversario_id,
    ga.nome AS avversario_nome,
    ga.cognome AS avversario_cognome,
    ga.numero_maglia AS avversario_numero_maglia,
    m.tipo_goal,
    m.assist_giocatore_stagione_id,
    ags.nome AS assist_nome,
    ags.cognome AS assist_cognome,
    m.autogol_giocatore_stagione_id,
    autogol.nome AS autogol_nome,
    autogol.cognome AS autogol_cognome
FROM public.marcatori m
LEFT JOIN public.giocatori_stagioni gs ON gs.id = m.giocatore_stagione_id
LEFT JOIN public.giocatori_stagioni gp ON gp.id = m.portiere_subisce_id
LEFT JOIN public.giocatori_avversari_partita ga ON ga.id = m.giocatore_avversario_id
LEFT JOIN public.giocatori_stagioni ags ON ags.id = m.assist_giocatore_stagione_id
LEFT JOIN public.giocatori_stagioni autogol ON autogol.id = m.autogol_giocatore_stagione_id;
