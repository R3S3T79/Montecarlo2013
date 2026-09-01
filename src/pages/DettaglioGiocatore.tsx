// src/pages/DettaglioGiocatore.tsx
// Data creazione chat: 14/08/2025 (rev: aggiunto campo Goal Subiti per portieri + medie voti utenti/mister + minuti giocati totali)

import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';


interface Giocatore {
  giocatore_stagione_id: string;
  giocatore_uid: string;
  stagione_id: string;
  nome: string;
  cognome: string;
  ruolo: string | null;
  foto_url: string | null;
video_url: string | null;
data_nascita: string | null;
  numero_cartellino: number | null;
}

interface StatisticheGiocatore {
  goalTotali: number;
  presenzeTotali: number;
  goalSubiti?: number;
  mediaVotoUtenti?: number;
  mediaVotoMister?: number;
   minutiGiocatiTotali?: number;
  assistTotali?: number;
  gialliTotali?: number;
  rossiTotali?: number;
  rigoriTirati?: number;
  rigoriSegnati?: number;
  rigoriSbagliati?: number;
  rigoriRicevuti?: number;
rigoriParati?: number;
rigoriSubiti?: number;
  allenamentiFatti?: number;
  allenamentiSaltati?: number;
}

interface Stagione {
  id: string;
  stagione_nome: string;
}

export default function DettaglioGiocatore() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(UserRole.Authenticated);

useEffect(() => {
  if (!user?.id) return;
  (async () => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("role::text")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data?.role) {
      const r = (data.role as string).toLowerCase();
      if (r === "admin") setRole(UserRole.Admin);
      else if (r === "creator") setRole(UserRole.Creator);
      else setRole(UserRole.Authenticated);
    }
  })();
}, [user?.id]);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { stagioneId?: string } };

  const [giocatore, setGiocatore] = useState<Giocatore | null>(null);
  const [statistiche, setStatistiche] = useState<StatisticheGiocatore>({
  goalTotali: 0,
  presenzeTotali: 0,
  goalSubiti: 0,
  mediaVotoUtenti: 0,
  mediaVotoMister: 0,
  minutiGiocatiTotali: 0,
  assistTotali: 0,
  gialliTotali: 0,
rossiTotali: 0,
rigoriTirati: 0,
rigoriSegnati: 0,
rigoriSbagliati: 0,
rigoriRicevuti: 0,
rigoriParati: 0,
rigoriSubiti: 0,
  allenamentiFatti: 0,
  allenamentiSaltati: 0,
});
  const [stagioniDisponibili, setStagioniDisponibili] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // 8. Dettaglio presenze
const [mostraPresenze, setMostraPresenze] = useState(false);
const [partitePresenze, setPartitePresenze] = useState<any[]>([]);
// 11. Dettaglio goal fatti
const [mostraGoal, setMostraGoal] = useState(false);
const [partiteGoal, setPartiteGoal] = useState<any[]>([]);
// 14. Dettaglio assist
const [mostraAssist, setMostraAssist] = useState(false);
const [partiteAssist, setPartiteAssist] = useState<any[]>([]);
// 17. Dettaglio rigori tirati
const [mostraRigoriTirati, setMostraRigoriTirati] = useState(false);
const [partiteRigoriTirati, setPartiteRigoriTirati] = useState<any[]>([]);

  // Eliminazione giocatore
  const handleElimina = async () => {
    if (!id) return;
    if (!window.confirm('Sei sicuro di voler eliminare questo giocatore e tutti i suoi dati?')) return;

    const { error } = await supabase.from('giocatori').delete().eq('id', id);
    if (error) {
      console.error('Errore eliminazione:', error);
      alert("Errore durante l'eliminazione.");
      return;
    }
    navigate('/rosa');
  };

  useEffect(() => {
    (window as any).__deleteCurrent = handleElimina;
    return () => {
      if ((window as any).__deleteCurrent === handleElimina) {
        (window as any).__deleteCurrent = undefined;
      }
    };
  }, [id]);

  const fetchStatistiche = async (giocatoreUid: string, stagioneId: string) => {
  try {
    // 🔹 Statistiche base (goal, presenze, subiti)
    const { data: stats } = await supabase
      .from('v_stat_giocatore_stagione')
      .select('goal_totali, presenze_totali, goal_subiti')
      .eq('giocatore_uid', giocatoreUid)
      .eq('stagione_id', stagioneId)
      .maybeSingle();

    // 🔹 Medie voti mister
    const { data: voti } = await supabase
      .from('voti_giocatori_media')
      .select('media_voto_mister')
      .eq('giocatore_uid', giocatoreUid)
      .eq('stagione_id', stagioneId)
      .maybeSingle();

    // 🔹 Trova la riga in giocatori_stagioni per calcolare i minuti totali
    const { data: stagioneRow } = await supabase
      .from('giocatori_stagioni')
      .select('id')
      .eq('giocatore_uid', giocatoreUid)
      .eq('stagione_id', stagioneId)
      .maybeSingle();

    let totaleMinuti = 0;
let assistTotali = 0;
let gialliTotali = 0;
let rossiTotali = 0;
let rigoriTirati = 0;
let rigoriSegnati = 0;
let rigoriSbagliati = 0;
let rigoriRicevuti = 0;
let rigoriParati = 0;
let rigoriSubiti = 0;

if (stagioneRow?.id) {
      const { data: minuti } = await supabase
        .from('minuti_giocati_totali')
        .select('tempo_giocato_sec')
        .eq('giocatore_stagione_id', stagioneRow.id);

      const totaleSec = minuti?.reduce((acc, m) => acc + (m.tempo_giocato_sec || 0), 0) || 0;
      totaleMinuti = Math.floor(totaleSec / 60);
      const { count } = await supabase
  .from('marcatori')
  .select('*', { count: 'exact', head: true })
  .eq('assist_giocatore_stagione_id', stagioneRow.id)
  .eq('stagione_id', stagioneId);

assistTotali = count ?? 0;
const { data: cartellini } = await supabase
  .from('cartellini')
  .select('tipo')
  .eq('giocatore_stagione_id', stagioneRow.id)
  .eq('stagione_id', stagioneId);

gialliTotali =
  cartellini?.filter((c) => c.tipo?.toLowerCase() === 'giallo').length ?? 0;

rossiTotali =
  cartellini?.filter((c) => c.tipo?.toLowerCase() === 'rosso').length ?? 0;
    

    const { data: rigoriPortiere } = await supabase
  .from('rigori_partita')
  .select('esito')
  .eq('portiere_stagione_id', stagioneRow.id)
  .eq('stagione_id', stagioneId);

rigoriParati =
  rigoriPortiere?.filter((r) => r.esito === 'sbagliato').length ?? 0;

rigoriSubiti =
  rigoriPortiere?.filter((r) => r.esito === 'segnato').length ?? 0;

rigoriRicevuti = rigoriParati + rigoriSubiti;

    const { data: rigori } = await supabase
  .from('rigori_partita')
  .select('esito')
  .eq('giocatore_stagione_id', stagioneRow.id)
  .eq('stagione_id', stagioneId);

rigoriSegnati =
  rigori?.filter((r) => r.esito === 'segnato').length ?? 0;

rigoriSbagliati =
  rigori?.filter((r) => r.esito === 'sbagliato').length ?? 0;

rigoriTirati = rigoriSegnati + rigoriSbagliati;
}

// 🔹 Allenamenti fatti e saltati
let fatti = 0;
let saltati = 0;

// Il campo giocatore_uid in "allenamenti" fa riferimento a "giocatori.id"
// quindi possiamo usare direttamente il valore di giocatoreUid come ID del giocatore
const { data: allenamenti, error: errAll } = await supabase
  .from('allenamenti')
  .select('presente')
  .eq('giocatore_uid', giocatoreUid)
  .eq('stagione_id', stagioneId);

if (errAll) {
  console.error("Errore query allenamenti:", errAll);
}

if (allenamenti && allenamenti.length > 0) {
  fatti = allenamenti.filter(a => a.presente === true).length;
  saltati = allenamenti.filter(a => a.presente === false).length;
}




    // 🔹 Aggiorna lo stato finale
    setStatistiche({
      goalTotali: stats?.goal_totali || 0,
      presenzeTotali: stats?.presenze_totali || 0,
      goalSubiti: stats?.goal_subiti || 0,
      mediaVotoMister: voti?.media_voto_mister || 0,
      minutiGiocatiTotali: totaleMinuti,
assistTotali: assistTotali,
gialliTotali: gialliTotali,
rossiTotali: rossiTotali,
rigoriTirati: rigoriTirati,
rigoriSegnati: rigoriSegnati,
rigoriSbagliati: rigoriSbagliati,
rigoriRicevuti: rigoriRicevuti,
rigoriParati: rigoriParati,
rigoriSubiti: rigoriSubiti,
allenamentiFatti: fatti,
allenamentiSaltati: saltati,
    });
  } catch (error) {
    console.error("Errore fetchStatistiche:", error);
  }
};

// 9. Recupera le partite in cui il giocatore risulta presente
const fetchPartitePresenze = async (
  giocatoreStagioneId: string,
  stagioneId: string
) => {
  const { data, error } = await supabase
    .from("presenze")
    .select(`
      partita_id,
      partite (
        id,
        data_ora,
        squadra_casa_id,
        squadra_ospite_id,
        goal_a,
        goal_b,
        squadre_casa:squadre!partite_squadra_casa_id_fkey (nome),
        squadre_ospite:squadre!partite_squadra_ospite_id_fkey (nome)
      )
    `)
    .eq("giocatore_stagione_id", giocatoreStagioneId)
    .eq("stagione_id", stagioneId);

  if (error) {
    console.error("Errore caricamento partite presenze:", error);
    setPartitePresenze([]);
    return;
  }

  setPartitePresenze(data || []);
};

// 12. Recupera le partite in cui il giocatore ha segnato
const fetchPartiteGoal = async (
  giocatoreStagioneId: string,
  stagioneId: string
) => {
  const { data, error } = await supabase
    .from("marcatori")
    .select(`
      partita_id,
      partite (
        id,
        data_ora,
        goal_a,
        goal_b,
        squadre_casa:squadre!partite_squadra_casa_id_fkey (nome),
        squadre_ospite:squadre!partite_squadra_ospite_id_fkey (nome)
      )
    `)
    .eq("giocatore_stagione_id", giocatoreStagioneId)
    .eq("stagione_id", stagioneId);

  if (error) {
    console.error("Errore caricamento partite goal:", error);
    setPartiteGoal([]);
    return;
  }

  setPartiteGoal(data || []);
};

// 15. Recupera le partite in cui il giocatore ha fatto assist
const fetchPartiteAssist = async (
  giocatoreStagioneId: string,
  stagioneId: string
) => {
  const { data, error } = await supabase
    .from("marcatori")
    .select(`
      partita_id,
      partite (
        id,
        data_ora,
        goal_a,
        goal_b,
        squadre_casa:squadre!partite_squadra_casa_id_fkey (nome),
        squadre_ospite:squadre!partite_squadra_ospite_id_fkey (nome)
      )
    `)
    .eq("assist_giocatore_stagione_id", giocatoreStagioneId)
    .eq("stagione_id", stagioneId);

  if (error) {
    console.error("Errore caricamento partite assist:", error);
    setPartiteAssist([]);
    return;
  }

  setPartiteAssist(data || []);
};

// 18. Recupera i singoli rigori tirati dal giocatore
const fetchPartiteRigoriTirati = async (
  giocatoreStagioneId: string,
  stagioneId: string
) => {
  const { data, error } = await supabase
    .from("rigori_partita")
    .select(`
      id,
      esito,
      ordine,
      partita_id,
      partite (
        id,
        data_ora,
        goal_a,
        goal_b,
        squadre_casa:squadre!partite_squadra_casa_id_fkey (nome),
        squadre_ospite:squadre!partite_squadra_ospite_id_fkey (nome)
      )
    `)
    .eq("giocatore_stagione_id", giocatoreStagioneId)
    .eq("stagione_id", stagioneId);

  if (error) {
    console.error("Errore caricamento rigori tirati:", error);
    setPartiteRigoriTirati([]);
    return;
  }

  setPartiteRigoriTirati(data || []);
};

  const fetchGiocatore = async (stagioneId: string) => {
    if (!id) return;
    const { data: recordStagione } = await supabase
      .from('v_giocatori_completo')
      .select('*')
      .eq('giocatore_uid', id)
      .eq('stagione_id', stagioneId)
      .maybeSingle();

if (recordStagione) {
  setGiocatore(recordStagione as Giocatore);

  await fetchStatistiche(
    recordStagione.giocatore_uid,
    stagioneId
  );

  await fetchPartitePresenze(
    recordStagione.giocatore_stagione_id,
    stagioneId
  );

  await fetchPartiteGoal(
    recordStagione.giocatore_stagione_id,
    stagioneId
  );

  await fetchPartiteAssist(
    recordStagione.giocatore_stagione_id,
    stagioneId
  );

  await fetchPartiteRigoriTirati(
    recordStagione.giocatore_stagione_id,
    stagioneId
  );
}
};

  useEffect(() => {
    const init = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const { data: tutteStagioni } = await supabase
          .from('v_giocatori_completo')
          .select('stagione_id, stagione_nome')
          .eq('giocatore_uid', id)
          .order('stagione_nome', { ascending: true });

        if (tutteStagioni) {
          const stagioniUniche = tutteStagioni.reduce((acc: Stagione[], cur) => {
            if (!acc.find((s) => s.id === cur.stagione_id)) {
              acc.push({ id: cur.stagione_id, stagione_nome: cur.stagione_nome });
            }
            return acc;
          }, []);
          setStagioniDisponibili(stagioniUniche);

          // 🔹 priorità: stagione passata da navigate → ultima stagione disponibile
          const stagioneIdDaState = location.state?.stagioneId;

if (stagioneIdDaState && stagioniUniche.find(s => s.id === stagioneIdDaState)) {
  setStagioneSelezionata(stagioneIdDaState);
          } else if (stagioniUniche.length > 0) {
            setStagioneSelezionata(stagioniUniche[stagioniUniche.length - 1].id);
          }
        }
      } catch (error) {
        console.error('Errore inizializzazione:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, location.state]);

  useEffect(() => {
    if (stagioneSelezionata) {
      fetchGiocatore(stagioneSelezionata);
    }
  }, [stagioneSelezionata]);

  const formatData = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '';

  const calcolaEta = (d: string | null) => {
    if (!d) return null;
    const oggi = new Date();
    const nascita = new Date(d);
    let eta = oggi.getFullYear() - nascita.getFullYear();
    const diffMesi = oggi.getMonth() - nascita.getMonth();
    if (diffMesi < 0 || (diffMesi === 0 && oggi.getDate() < nascita.getDate())) eta--;
    return eta;
  };

  const eta = calcolaEta(giocatore?.data_nascita || null);

  if (authLoading || loading || !giocatore) {
    return <div className="p-4 text-center">Caricamento...</div>;
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto pt-2 px-2 py-6">
        {stagioniDisponibili.length > 0 && (
          <div className="mb-4">
            <select
              value={stagioneSelezionata}
              onChange={(e) => setStagioneSelezionata(e.target.value)}
              className="bg-white/90 border rounded px-3 py-2 w-full"
            >
              {stagioniDisponibili.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.stagione_nome}
                </option>
              ))}
            </select>
          </div>
        )}

       <div className="bg-white/90 rounded-xl shadow-montecarlo p-6">
  <div className="flex items-start gap-5">
  <div className="w-36 h-44 rounded-lg overflow-hidden mb-4 border-2 border-montecarlo-accent shadow-lg bg-black flex items-center justify-center">
  {giocatore.video_url && giocatore.video_url.trim() !== "" ? (
    <video
      key={giocatore.video_url} // forza reload video se cambia
      src={giocatore.video_url}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onCanPlay={(e) => e.currentTarget.play()}
      className="w-full h-full object-contain"
      style={{
        transform: 'scale(0.9) translateY(3%)',
        transformOrigin: 'center center',
      }}
    />
  ) : giocatore.foto_url ? (
    <img
      src={giocatore.foto_url}
      alt={`${giocatore.cognome} ${giocatore.nome}`}
      className="w-full h-full object-cover"
    />
  ) : (
      <div className="w-full h-full bg-montecarlo-secondary text-white flex items-center justify-center text-5xl font-bold">
    {giocatore.cognome[0]}
  </div>
)}
</div>

<div className="flex-1">
  <h1 className="text-xl font-bold text-montecarlo-secondary mb-4">
    {giocatore.cognome} {giocatore.nome}
  </h1>

  {giocatore.data_nascita && (
    <div className="text-sm text-black mb-2">
      <span className="font-semibold">Data di nascita:</span>{' '}
      {formatData(giocatore.data_nascita)} ({eta} anni)
    </div>
  )}

  {giocatore.ruolo && (
    <div className="text-sm text-black mb-2">
      <span className="font-semibold">Ruolo:</span>{' '}
      {giocatore.ruolo}
    </div>
  )}

  {giocatore.numero_cartellino != null && (
    <div className="text-sm text-black">
      <span className="font-semibold">Numero cartellino:</span>{' '}
      {giocatore.numero_cartellino}
    </div>
  )}
</div>

</div>

{/* 🔹 Sezione statistiche principali */}
<div className="w-full max-w-md mx-auto mb-6">
  {/* 1. Presenze e minuti giocati */}
  <div className="space-y-2">
    <button
  type="button"
  onClick={() => setMostraPresenze((prev) => !prev)}
  className="w-full flex justify-between items-center text-left"
>
  <span className="font-semibold text-black underline">
    Presenze
  </span>

  <span className="font-bold text-montecarlo-gold-600">
    {statistiche.presenzeTotali}
  </span>
</button>

{/* 10. Lista partite delle presenze */}
{mostraPresenze && (
  <div className="mt-2 mb-3 pl-3 border-l-2 border-gray-300 space-y-2">
    {partitePresenze.length === 0 ? (
      <div className="text-sm text-gray-500">
        Nessuna presenza in questa stagione.
      </div>
    ) : (
      partitePresenze
        .slice()
        .sort(
          (a, b) =>
            new Date(a.partite.data_ora).getTime() -
            new Date(b.partite.data_ora).getTime()
        )
        .map((riga) => {
          const p = riga.partite;

          return (
            <div key={p.id} className="text-sm text-black">
              <div className="font-semibold">
                {new Date(p.data_ora).toLocaleDateString("it-IT")}
              </div>

              <div>
                {p.squadre_casa?.nome} - {p.squadre_ospite?.nome}
                {" "}
                <span className="font-bold">
                  {p.goal_a ?? 0} - {p.goal_b ?? 0}
                </span>
              </div>
            </div>
          );
        })
    )}
  </div>
)}

    <div className="flex justify-between items-center">
      <span className="font-semibold text-black">Minuti Giocati</span>
      <span className="font-bold text-montecarlo-gold-600">
        {statistiche.minutiGiocatiTotali ?? 0}
      </span>
    </div>
  </div>

  <hr className="border-t border-gray-300 my-4" />

  {/* 2. Goal, assist e goal subiti */}
<div className="space-y-2">
  <button
  type="button"
  onClick={() => setMostraGoal((prev) => !prev)}
  className="w-full flex justify-between items-center text-left"
>
  <span className="font-semibold text-black underline">
    Goal Fatti
  </span>

  <span className="font-bold text-montecarlo-accent">
    {statistiche.goalTotali}
  </span>
</button>

{/* 13. Lista partite dei goal */}
{mostraGoal && (
  <div className="mt-2 mb-3 pl-3 border-l-2 border-gray-300 space-y-2">
    {partiteGoal.length === 0 ? (
      <div className="text-sm text-gray-500">
        Nessun goal in questa stagione.
      </div>
    ) : (
      Object.values(
        partiteGoal.reduce((acc: Record<string, any>, riga: any) => {
          const p = riga.partite;

          if (!acc[p.id]) {
            acc[p.id] = {
              partita: p,
              numeroGoal: 0,
            };
          }

          acc[p.id].numeroGoal += 1;
          return acc;
        }, {})
      )
        .sort(
          (a: any, b: any) =>
            new Date(a.partita.data_ora).getTime() -
            new Date(b.partita.data_ora).getTime()
        )
        .map((riga: any) => {
          const p = riga.partita;

          return (
            <div key={p.id} className="text-sm text-black">
              <div className="font-semibold">
                {new Date(p.data_ora).toLocaleDateString("it-IT")}
              </div>

              <div>
                {p.squadre_casa?.nome} - {p.squadre_ospite?.nome}{" "}
                <span className="font-bold">
                  {p.goal_a ?? 0} - {p.goal_b ?? 0}
                </span>
                {" — "}
                <span className="font-bold text-montecarlo-accent">
                  {riga.numeroGoal} {riga.numeroGoal === 1 ? "Goal" : "Goal"}
                </span>
              </div>
            </div>
          );
        })
    )}
  </div>
)}

  <button
  type="button"
  onClick={() => setMostraAssist((prev) => !prev)}
  className="w-full flex justify-between items-center text-left"
>
  <span className="font-semibold text-black underline">
    Assist
  </span>

  <span className="font-bold text-montecarlo-green-600">
    {statistiche.assistTotali ?? 0}
  </span>
</button>

{/* 16. Lista partite degli assist */}
{mostraAssist && (
  <div className="mt-2 mb-3 pl-3 border-l-2 border-gray-300 space-y-2">
    {partiteAssist.length === 0 ? (
      <div className="text-sm text-gray-500">
        Nessun assist in questa stagione.
      </div>
    ) : (
      Object.values(
        partiteAssist.reduce((acc: Record<string, any>, riga: any) => {
          const p = riga.partite;

          if (!acc[p.id]) {
            acc[p.id] = {
              partita: p,
              numeroAssist: 0,
            };
          }

          acc[p.id].numeroAssist += 1;
          return acc;
        }, {})
      )
        .sort(
          (a: any, b: any) =>
            new Date(a.partita.data_ora).getTime() -
            new Date(b.partita.data_ora).getTime()
        )
        .map((riga: any) => {
          const p = riga.partita;

          return (
            <div key={p.id} className="text-sm text-black">
              <div className="font-semibold">
                {new Date(p.data_ora).toLocaleDateString("it-IT")}
              </div>

              <div>
                {p.squadre_casa?.nome} - {p.squadre_ospite?.nome}{" "}
                <span className="font-bold">
                  {p.goal_a ?? 0} - {p.goal_b ?? 0}
                </span>
                {" — "}
                <span className="font-bold text-montecarlo-green-600">
                  {riga.numeroAssist}{" "}
                  {riga.numeroAssist === 1 ? "Assist" : "Assist"}
                </span>
              </div>
            </div>
          );
        })
    )}
  </div>
)}

  {giocatore.ruolo === "Portiere" && (
    <div className="flex justify-between items-center">
      <span className="font-semibold text-black">Goal Subiti</span>
      <span className="font-bold text-montecarlo-red-600">
        {statistiche.goalSubiti ?? 0}
      </span>
    </div>
  )}
</div>

<hr className="border-t border-gray-300 my-4" />

{/* 3. Cartellini */}
<div className="space-y-2">
  <div className="flex justify-between items-center">
    <span className="text-xl">🟨</span>
    <span className="font-bold text-black">
      {statistiche.gialliTotali ?? 0}
    </span>
  </div>

  <div className="flex justify-between items-center">
    <span className="text-xl">🟥</span>
    <span className="font-bold text-black">
      {statistiche.rossiTotali ?? 0}
    </span>
  </div>
</div>

<hr className="border-t border-gray-300 my-4" />

{/* 4. Rigori tirati */}
<div className="space-y-2">
  <button
  type="button"
  onClick={() => setMostraRigoriTirati((prev) => !prev)}
  className="w-full flex justify-between items-center text-left"
>
  <span className="font-semibold text-black underline">
    Rigori Tirati
  </span>

  <span className="font-bold text-black">
    {statistiche.rigoriTirati ?? 0}
  </span>
</button>

{/* 19. Lista singoli rigori tirati */}
{mostraRigoriTirati && (
  <div className="mt-2 mb-3 pl-3 border-l-2 border-gray-300 space-y-2">
    {partiteRigoriTirati.length === 0 ? (
      <div className="text-sm text-gray-500">
        Nessun rigore tirato in questa stagione.
      </div>
    ) : (
      partiteRigoriTirati
        .slice()
        .sort(
          (a, b) =>
            new Date(a.partite.data_ora).getTime() -
            new Date(b.partite.data_ora).getTime()
        )
        .map((riga) => {
          const p = riga.partite;

          return (
            <div
              key={riga.id}
              className="flex justify-between items-center text-sm"
            >
              <div className="text-black">
                <div className="font-semibold">
                  {new Date(p.data_ora).toLocaleDateString("it-IT")}
                </div>

                <div>
                  {p.squadre_casa?.nome} - {p.squadre_ospite?.nome}
                </div>
              </div>

              <span
                className={`text-xl font-bold ${
                  riga.esito === "segnato"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {riga.esito === "segnato" ? "✓" : "✕"}
              </span>
            </div>
          );
        })
    )}
  </div>
)}

  <div className="flex justify-between items-center">
    <span className="text-black">Fatti</span>
    <span className="font-bold text-green-600">
      {statistiche.rigoriSegnati ?? 0}
    </span>
  </div>

  <div className="flex justify-between items-center">
    <span className="text-black">Sbagliati</span>
    <span className="font-bold text-red-600">
      {statistiche.rigoriSbagliati ?? 0}
    </span>
  </div>
</div>

<hr className="border-t border-gray-300 my-4" />

{/* 5. Rigori ricevuti - solo portiere */}
{giocatore.ruolo === "Portiere" && (
  <>
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-black">Rigori Ricevuti</span>
        <span className="font-bold text-black">
          {statistiche.rigoriRicevuti ?? 0}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-black">Parati</span>
        <span className="font-bold text-green-600">
          {statistiche.rigoriParati ?? 0}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-black">Subiti</span>
        <span className="font-bold text-red-600">
          {statistiche.rigoriSubiti ?? 0}
        </span>
      </div>
    </div>

    <hr className="border-t border-gray-300 my-4" />
  </>
)}
</div>

{/* 🔸 Separatore */}
<hr className="w-2/3 border-t border-gray-300 my-3" />

{/* 6. Allenamenti */}
<div className="w-full max-w-md mx-auto mb-6">
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className="font-semibold text-black">Allen. Fatti</span>
      <span className="font-bold text-green-600">
        {statistiche.allenamentiFatti ?? 0}
      </span>
    </div>

    <div className="flex justify-between items-center">
      <span className="font-semibold text-black">Allen. Saltati</span>
      <span className="font-bold text-red-600">
        {statistiche.allenamentiSaltati ?? 0}
      </span>
    </div>
  </div>
</div>

{/* 🔸 Separatore */}
<hr className="w-2/3 border-t border-gray-300 my-3" />

{/* 7. Media Voto Mister — visibile solo ad Admin o Creator */}
{(role === UserRole.Admin || role === UserRole.Creator) && (
  <div className="w-full max-w-md mx-auto mb-6">
    <hr className="border-t border-gray-300 mb-4" />

    <div className="flex justify-between items-center">
      <span className="font-semibold text-black">Media Voto Mister</span>
      <span className="font-bold text-blue-500">
        {statistiche.mediaVotoMister?.toFixed(2) ?? "0.00"}
      </span>
    </div>
  </div>
)}


      </div>
    </div>
  </div>
  );
}
