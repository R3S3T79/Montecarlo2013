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
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl bg-white px-6 py-4 font-bold text-[#222] shadow-xl">
          Caricamento...
        </div>
      </div>
    );
  }

  const dettaglioClass =
    "w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.16)]";

  const dettaglioHeaderClass =
    "w-full flex items-center justify-between gap-3 px-4 py-4 text-left";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] px-[2px] pt-2 pb-6 box-border">
      <div className="w-full">

        {/* 20. Scheda giocatore */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_26px_rgba(0,0,0,0.42)]">

          <div className="bg-gradient-to-r from-red-600 via-red-700 to-[#373737] px-4 py-3">
            <h1 className="text-center text-[17px] font-extrabold uppercase tracking-wide text-white">
              Dettaglio Giocatore
            </h1>
          </div>

          <div className="relative overflow-hidden p-4">

            <div className="pointer-events-none absolute -right-12 top-5 text-[145px] font-black leading-none text-gray-100">
              M
            </div>

            <div className="relative flex items-center gap-4">

              <div className="relative flex-shrink-0">
                <div className="flex h-[126px] w-[108px] items-center justify-center overflow-hidden rounded-2xl border-2 border-red-600 bg-black shadow-lg">
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
                      className="h-full w-full object-contain"
                      style={{
                        transform: 'scale(0.9) translateY(3%)',
                        transformOrigin: 'center center',
                      }}
                    />
                  ) : giocatore.foto_url ? (
                    <img
                      src={giocatore.foto_url}
                      alt={`${giocatore.cognome} ${giocatore.nome}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#262626] text-5xl font-bold text-white">
                      {giocatore.cognome[0]}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative min-w-0 flex-1">
                <div className="text-[17px] font-extrabold uppercase leading-none text-[#252525]">
                  {giocatore.nome}
                </div>

                <div className="mt-1 break-words text-[25px] font-black uppercase leading-none text-red-600">
                  {giocatore.cognome}
                </div>

                {giocatore.ruolo && (
                  <div className="mt-3 flex items-center gap-2 text-[12px] font-extrabold uppercase text-[#333]">
                    <span>⚽</span>
                    <span>{giocatore.ruolo}</span>
                  </div>
                )}

                {giocatore.data_nascita && (
                  <div className="mt-2 flex items-start gap-2 text-[11px] font-semibold text-gray-600">
                    <span>📅</span>
                    <span>
                      {formatData(giocatore.data_nascita)}
                      {eta != null ? ` (${eta} anni)` : ''}
                    </span>
                  </div>
                )}

                {giocatore.numero_cartellino != null && (
                  <div className="mt-2 flex items-start gap-2 text-[11px] font-semibold text-gray-600">
                    <span>▣</span>
                    <span>
                      N. Cartellino:{" "}
                      <strong className="text-[#222]">
                        {giocatore.numero_cartellino}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>

        {/* 21. Selettore stagione */}
        {stagioniDisponibili.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-red-500 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.22)]">
            <div className="flex items-center gap-3 px-4">
              <span className="text-lg">📅</span>

              <select
                value={stagioneSelezionata}
                onChange={(e) => setStagioneSelezionata(e.target.value)}
                className="w-full appearance-none bg-white py-3 text-[14px] font-extrabold uppercase text-[#252525] outline-none"
              >
                {stagioniDisponibili.map((s) => (
                  <option key={s.id} value={s.id}>
                    Stagione {s.stagione_nome}
                  </option>
                ))}
              </select>

              <span className="text-lg font-bold text-[#333]">⌄</span>
            </div>
          </div>
        )}

        {/* 22. Statistiche principali */}
        <section className="mt-4">
          <div className="grid grid-cols-3 gap-2">

            <div className="flex min-h-[103px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#454545] to-[#171717] px-2 py-3 text-center shadow-lg">
              <div className="text-[22px]">🎯</div>
              <div className="mt-1 text-[25px] font-black leading-none text-red-500">
                {statistiche.goalTotali}
              </div>
              <div className="mt-2 text-[10px] font-extrabold uppercase text-white">
                Goal
              </div>
            </div>

            <div className="flex min-h-[103px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#454545] to-[#171717] px-2 py-3 text-center shadow-lg">
              <div className="text-[22px]">👕</div>
              <div className="mt-1 text-[25px] font-black leading-none text-red-500">
                {statistiche.presenzeTotali}
              </div>
              <div className="mt-2 text-[10px] font-extrabold uppercase text-white">
                Presenze
              </div>
            </div>

            <div className="flex min-h-[103px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#454545] to-[#171717] px-2 py-3 text-center shadow-lg">
              <div className="text-[22px]">⏱️</div>
              <div className="mt-1 text-[22px] font-black leading-none text-red-500">
                {statistiche.minutiGiocatiTotali ?? 0}'
              </div>
              <div className="mt-2 text-[10px] font-extrabold uppercase leading-tight text-white">
                Minuti
              </div>
            </div>

            <div className="flex min-h-[103px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#454545] to-[#171717] px-2 py-3 text-center shadow-lg">
              <div className="text-[22px]">👟</div>
              <div className="mt-1 text-[25px] font-black leading-none text-red-500">
                {statistiche.assistTotali ?? 0}
              </div>
              <div className="mt-2 text-[10px] font-extrabold uppercase text-white">
                Assist
              </div>
            </div>

            <div className="flex min-h-[103px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#454545] to-[#171717] px-2 py-3 text-center shadow-lg">
              <div className="text-[22px]">🟨</div>
              <div className="mt-1 text-[25px] font-black leading-none text-red-500">
                {statistiche.gialliTotali ?? 0}
              </div>
              <div className="mt-2 text-[10px] font-extrabold uppercase text-white">
                Ammonizioni
              </div>
            </div>

            <div className="flex min-h-[103px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#454545] to-[#171717] px-2 py-3 text-center shadow-lg">
              <div className="text-[22px]">🟥</div>
              <div className="mt-1 text-[25px] font-black leading-none text-red-500">
                {statistiche.rossiTotali ?? 0}
              </div>
              <div className="mt-2 text-[10px] font-extrabold uppercase text-white">
                Espulsioni
              </div>
            </div>

            <div className="flex min-h-[103px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#454545] to-[#171717] px-2 py-3 text-center shadow-lg">
              <div className="text-[22px]">🥅</div>
              <div className="mt-1 text-[22px] font-black leading-none text-red-500">
                {statistiche.rigoriSegnati ?? 0}/{statistiche.rigoriTirati ?? 0}
              </div>
              <div className="mt-2 text-[10px] font-extrabold uppercase leading-tight text-white">
                Rigori
              </div>
            </div>

            <div className="flex min-h-[103px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#454545] to-[#171717] px-2 py-3 text-center shadow-lg">
              <div className="text-[22px]">🏋️</div>
              <div className="mt-1 text-[20px] font-black leading-none text-red-500">
                {statistiche.allenamentiFatti ?? 0}/{statistiche.allenamentiSaltati ?? 0}
              </div>
              <div className="mt-2 text-[9px] font-extrabold uppercase leading-tight text-white">
                Allenamenti
              </div>
            </div>

            {giocatore.ruolo === "Portiere" ? (
              <div className="flex min-h-[103px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#454545] to-[#171717] px-2 py-3 text-center shadow-lg">
                <div className="text-[22px]">🧤</div>
                <div className="mt-1 text-[25px] font-black leading-none text-red-500">
                  {statistiche.goalSubiti ?? 0}
                </div>
                <div className="mt-2 text-[10px] font-extrabold uppercase text-white">
                  Goal subiti
                </div>
              </div>
            ) : (
              <div className="flex min-h-[103px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#454545] to-[#171717] px-2 py-3 text-center shadow-lg">
                <div className="text-[22px]">⚽</div>
                <div className="mt-1 text-[25px] font-black leading-none text-red-500">
                  {statistiche.rigoriSbagliati ?? 0}
                </div>
                <div className="mt-2 text-[10px] font-extrabold uppercase text-white">
                  Rigori sbagliati
                </div>
              </div>
            )}

          </div>
        </section>

        {/* 23. Dettagli statistiche */}
        <section className="mt-4 space-y-2">

          <div className={dettaglioClass}>
            <button
              type="button"
              onClick={() => setMostraPresenze((prev) => !prev)}
              className={dettaglioHeaderClass}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-lg text-white">
                  📅
                </div>

                <div className="min-w-0">
                  <div className="text-[13px] font-extrabold uppercase text-[#252525]">
                    Dettaglio Presenze
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Visualizza tutte le partite giocate
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-red-600">
                  {statistiche.presenzeTotali}
                </span>
                <span className="text-xl text-gray-500">
                  {mostraPresenze ? "⌃" : "›"}
                </span>
              </div>
            </button>

            {mostraPresenze && (
              <div className="border-t border-gray-200 bg-[#f7f7f7] px-4 py-3 space-y-2">
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
                        <div
                          key={p.id}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black"
                        >
                          <div className="font-bold text-red-600">
                            {new Date(p.data_ora).toLocaleDateString("it-IT")}
                          </div>

                          <div className="mt-1">
                            {p.squadre_casa?.nome} - {p.squadre_ospite?.nome}
                            {" "}
                            <span className="font-extrabold">
                              {p.goal_a ?? 0} - {p.goal_b ?? 0}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>

          <div className={dettaglioClass}>
            <button
              type="button"
              onClick={() => setMostraGoal((prev) => !prev)}
              className={dettaglioHeaderClass}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-lg text-white">
                  🎯
                </div>

                <div className="min-w-0">
                  <div className="text-[13px] font-extrabold uppercase text-[#252525]">
                    Dettaglio Goal Fatti
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Visualizza tutti i goal segnati
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-red-600">
                  {statistiche.goalTotali}
                </span>
                <span className="text-xl text-gray-500">
                  {mostraGoal ? "⌃" : "›"}
                </span>
              </div>
            </button>

            {mostraGoal && (
              <div className="border-t border-gray-200 bg-[#f7f7f7] px-4 py-3 space-y-2">
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
                        <div
                          key={p.id}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black"
                        >
                          <div className="font-bold text-red-600">
                            {new Date(p.data_ora).toLocaleDateString("it-IT")}
                          </div>

                          <div className="mt-1">
                            {p.squadre_casa?.nome} - {p.squadre_ospite?.nome}{" "}
                            <span className="font-extrabold">
                              {p.goal_a ?? 0} - {p.goal_b ?? 0}
                            </span>
                            {" — "}
                            <span className="font-extrabold text-red-600">
                              {riga.numeroGoal} {riga.numeroGoal === 1 ? "Goal" : "Goal"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>

          <div className={dettaglioClass}>
            <button
              type="button"
              onClick={() => setMostraAssist((prev) => !prev)}
              className={dettaglioHeaderClass}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#292929] text-lg text-white">
                  👟
                </div>

                <div className="min-w-0">
                  <div className="text-[13px] font-extrabold uppercase text-[#252525]">
                    Dettaglio Assist
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Visualizza tutti gli assist forniti
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-red-600">
                  {statistiche.assistTotali ?? 0}
                </span>
                <span className="text-xl text-gray-500">
                  {mostraAssist ? "⌃" : "›"}
                </span>
              </div>
            </button>

            {mostraAssist && (
              <div className="border-t border-gray-200 bg-[#f7f7f7] px-4 py-3 space-y-2">
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
                        <div
                          key={p.id}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black"
                        >
                          <div className="font-bold text-red-600">
                            {new Date(p.data_ora).toLocaleDateString("it-IT")}
                          </div>

                          <div className="mt-1">
                            {p.squadre_casa?.nome} - {p.squadre_ospite?.nome}{" "}
                            <span className="font-extrabold">
                              {p.goal_a ?? 0} - {p.goal_b ?? 0}
                            </span>
                            {" — "}
                            <span className="font-extrabold text-red-600">
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
          </div>

          <div className={dettaglioClass}>
            <button
              type="button"
              onClick={() => setMostraRigoriTirati((prev) => !prev)}
              className={dettaglioHeaderClass}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#292929] text-lg text-white">
                  🥅
                </div>

                <div className="min-w-0">
                  <div className="text-[13px] font-extrabold uppercase text-[#252525]">
                    Dettaglio Rigori Tirati
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Visualizza tutti i rigori tirati
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-red-600">
                  {statistiche.rigoriTirati ?? 0}
                </span>
                <span className="text-xl text-gray-500">
                  {mostraRigoriTirati ? "⌃" : "›"}
                </span>
              </div>
            </button>

            {mostraRigoriTirati && (
              <div className="border-t border-gray-200 bg-[#f7f7f7] px-4 py-3 space-y-2">
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
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                          <div className="text-black">
                            <div className="font-bold text-red-600">
                              {new Date(p.data_ora).toLocaleDateString("it-IT")}
                            </div>

                            <div className="mt-1">
                              {p.squadre_casa?.nome} - {p.squadre_ospite?.nome}
                            </div>
                          </div>

                          <span
                            className={`text-xl font-black ${
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

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white px-3 py-2 text-center">
                    <div className="text-[10px] font-bold uppercase text-gray-500">
                      Fatti
                    </div>
                    <div className="text-lg font-black text-green-600">
                      {statistiche.rigoriSegnati ?? 0}
                    </div>
                  </div>

                  <div className="rounded-lg bg-white px-3 py-2 text-center">
                    <div className="text-[10px] font-bold uppercase text-gray-500">
                      Sbagliati
                    </div>
                    <div className="text-lg font-black text-red-600">
                      {statistiche.rigoriSbagliati ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 24. Statistiche portiere */}
          {giocatore.ruolo === "Portiere" && (
            <div className={dettaglioClass}>
              <div className={dettaglioHeaderClass}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#292929] text-lg text-white">
                    🧤
                  </div>

                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold uppercase text-[#252525]">
                      Dettaglio Portiere
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Goal subiti, rigori parati e subiti
                    </div>
                  </div>
                </div>

                <span className="text-xl text-gray-500">›</span>
              </div>

              <div className="grid grid-cols-3 border-t border-gray-200 bg-[#f7f7f7]">
                <div className="px-2 py-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-gray-500">
                    Ricevuti
                  </div>
                  <div className="mt-1 text-lg font-black text-[#222]">
                    {statistiche.rigoriRicevuti ?? 0}
                  </div>
                </div>

                <div className="border-x border-gray-200 px-2 py-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-gray-500">
                    Parati
                  </div>
                  <div className="mt-1 text-lg font-black text-green-600">
                    {statistiche.rigoriParati ?? 0}
                  </div>
                </div>

                <div className="px-2 py-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-gray-500">
                    Subiti
                  </div>
                  <div className="mt-1 text-lg font-black text-red-600">
                    {statistiche.rigoriSubiti ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}

        </section>

        {/* 25. Allenamenti */}
        <section className="mt-4 overflow-hidden rounded-xl bg-white shadow-[0_4px_14px_rgba(0,0,0,0.22)]">
          <div className="bg-gradient-to-r from-red-600 to-[#3b3b3b] px-4 py-2.5">
            <div className="text-[12px] font-extrabold uppercase tracking-wide text-white">
              Allenamenti
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-gray-200">
            <div className="px-4 py-3 text-center">
              <div className="text-[10px] font-bold uppercase text-gray-500">
                Fatti
              </div>
              <div className="mt-1 text-xl font-black text-green-600">
                {statistiche.allenamentiFatti ?? 0}
              </div>
            </div>

            <div className="px-4 py-3 text-center">
              <div className="text-[10px] font-bold uppercase text-gray-500">
                Saltati
              </div>
              <div className="mt-1 text-xl font-black text-red-600">
                {statistiche.allenamentiSaltati ?? 0}
              </div>
            </div>
          </div>
        </section>

        {/* 26. Media Voto Mister — visibile solo ad Admin o Creator */}
        {(role === UserRole.Admin || role === UserRole.Creator) && (
          <section className="mt-4 overflow-hidden rounded-xl bg-white shadow-[0_4px_14px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <div className="text-[12px] font-extrabold uppercase text-[#252525]">
                  Media Voto Mister
                </div>
                <div className="mt-1 text-[10px] text-gray-500">
                  Valutazione riservata
                </div>
              </div>

              <div className="rounded-lg bg-[#292929] px-4 py-2 text-xl font-black text-red-500">
                {statistiche.mediaVotoMister?.toFixed(2) ?? "0.00"}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}