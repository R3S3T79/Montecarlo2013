// src/pages/DettaglioGiocatore.tsx
// Data creazione chat: 14/08/2025 (rev: aggiunto campo Goal Subiti per portieri + medie voti utenti/mister + minuti giocati totali)

import React, { useEffect, useState } from 'react';
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
  allenamentiFatti: 0,
  allenamentiSaltati: 0,
});
  const [stagioniDisponibili, setStagioniDisponibili] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
    if (stagioneRow?.id) {
      const { data: minuti } = await supabase
        .from('minuti_giocati_totali')
        .select('tempo_giocato_sec')
        .eq('giocatore_stagione_id', stagioneRow.id);

      const totaleSec = minuti?.reduce((acc, m) => acc + (m.tempo_giocato_sec || 0), 0) || 0;
      totaleMinuti = Math.floor(totaleSec / 60);
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
      allenamentiFatti: fatti,
      allenamentiSaltati: saltati,
    });
  } catch (error) {
    console.error("Errore fetchStatistiche:", error);
  }
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
      await fetchStatistiche(recordStagione.giocatore_uid, stagioneId);
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
          if (location.state?.stagioneId && stagioniUniche.find(s => s.id === location.state.stagioneId)) {
            setStagioneSelezionata(location.state.stagioneId);
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

        <div className="bg-white/90 rounded-xl shadow-montecarlo p-6 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden mb-4 border-2 border-montecarlo-accent">
            {giocatore.foto_url ? (
              <img
                src={giocatore.foto_url}
                alt={`${giocatore.cognome} ${giocatore.nome}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-montecarlo-secondary text-white flex items-center justify-center text-4xl font-bold">
                {giocatore.cognome[0]}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-montecarlo-secondary mb-4">
            {giocatore.cognome} {giocatore.nome}
          </h1>

          {/* 🔹 Sezione statistiche principali */}
<div className="flex flex-wrap justify-center gap-8 mb-6">
  {/* Goal fatti */}
  <div className="text-center">
    <div className="text-2xl font-bold text-montecarlo-accent">
      {statistiche.goalTotali}
    </div>
    <div className="text-sm text-black">Goal</div>
  </div>

  {/* Presenze */}
  <div className="text-center">
    <div className="text-2xl font-bold text-montecarlo-gold-600">
      {statistiche.presenzeTotali}
    </div>
    <div className="text-sm text-black">Presenze</div>
  </div>

  {/* Goal Subiti solo se Portiere */}
  {giocatore.ruolo === "Portiere" && (
    <div className="text-center">
      <div className="text-2xl font-bold text-montecarlo-red-600">
        {statistiche.goalSubiti}
      </div>
      <div className="text-sm text-black">Goal Subiti</div>
    </div>
  )}

  {/* Media Goal solo se NON portiere */}
  {statistiche.presenzeTotali > 0 && giocatore.ruolo !== "Portiere" && (
    <div className="text-center">
      <div className="text-2xl font-bold text-montecarlo-green-600">
        {(statistiche.goalTotali / statistiche.presenzeTotali).toFixed(2)}
      </div>
      <div className="text-sm text-black">Media Goal</div>
    </div>
  )}
</div>

{/* 🔸 Separatore */}
<hr className="w-2/3 border-t border-gray-300 my-3" />

{/* 🔹 Allenamenti Fatti / Saltati */}
<div className="flex flex-wrap justify-center gap-8 mb-6">
  <div className="text-center">
    <div className="text-2xl font-bold text-green-600">
      {statistiche.allenamentiFatti}
    </div>
    <div className="text-sm text-black">Allenamenti Fatti</div>
  </div>

  <div className="text-center">
    <div className="text-2xl font-bold text-red-600">
      {statistiche.allenamentiSaltati}
    </div>
    <div className="text-sm text-black">Allenamenti Saltati</div>
  </div>
</div>

{/* 🔸 Separatore */}
<hr className="w-2/3 border-t border-gray-300 my-3" />

{/* 🔹 Media Voto Mister — visibile solo ad Admin o Creator */}
{(role === UserRole.Admin || role === UserRole.Creator) && (
  <div className="flex justify-center mb-6">
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-500">
        {statistiche.mediaVotoMister?.toFixed(2) ?? "0.00"}
      </div>
      <div className="text-sm text-black">Media Voti Mister</div>
    </div>
  </div>
)}




          <div className="w-full max-w-md space-y-4">
            {giocatore.data_nascita && (
  <div className="flex justify-between items-center py-2 border-b">
    <span className="text-black">Data di nascita</span>
    <span className="font-medium">{formatData(giocatore.data_nascita)}</span>
  </div>
)}

            {giocatore.ruolo && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-black">Ruolo</span>
                <span className="font-medium">{giocatore.ruolo}</span>
              </div>
            )}
            {giocatore.numero_cartellino != null && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-black">Numero Cartellino</span>
                <span className="font-medium">{giocatore.numero_cartellino}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
