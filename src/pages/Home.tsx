// 1) prendo stagione corrente (ultima inserita)
let stagioneCorrente: Stagione | null = null;
{
  const { data: last, error: e2 } = await supabase
    .from("stagioni")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (e2) {
    console.warn("[HomePage] stagioni last warn:", e2.message);
  }

  if (last?.id) {
    stagioneCorrente = last as Stagione;
  }
}

if (!stagioneCorrente?.id) {
  console.warn("[HomePage] nessuna stagione trovata, fallback: nessun compleanno");
  if (mounted) setNextBirthday(null);
  return;
}

// 2) prendo direttamente i giocatori della stagione dalla view completa
const { data, error } = await supabase
  .from("v_giocatori_completo")
  .select("giocatore_uid, nome, cognome, data_nascita, foto_url")
  .eq("stagione_id", stagioneCorrente.id)
  .not("data_nascita", "is", null);

if (error) {
  console.error("[HomePage] Errore caricamento compleanni:", error.message);
  if (mounted) setNextBirthday(null);
  return;
}

const rows = (data || []) as GiocatoreView[];

const today = new Date();
const y = today.getFullYear();

let bestDate: Date | null = null;
let playersForBest: NextBirthdayInfo["players"] = [];
