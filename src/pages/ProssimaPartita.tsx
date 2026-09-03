// src/pages/ProssimaPartita.tsx
// Data creazione chat: 03/08/2025

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Calendar, Clock, Plus, History } from "lucide-react";
import CampoFormazione from "../components/CampoFormazione";
import {
  getStatoPartita,
  StatoPartita,
} from "../partita/partitaTimer";

interface SquadraInfo {
  id: string;
  nome: string;
  logo_url?: string;
}

interface PartitaProssima {
  id: string;
  stagione_id: string;
  data_ora: string;
  stato: "DaGiocare" | "InCorso" | "Giocata";
  squadra_casa_id: string;
  squadra_ospite_id: string;
  campionato_torneo: string;
  luogo_torneo: string | null;
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
  rigori_a: number;
  rigori_b: number;
  casa: SquadraInfo;
  ospite: SquadraInfo;
}

interface ScontroPrecedente {
  id: string;
  data_ora: string;
  goal_a: number;
  goal_b: number;
  casa: { nome: string };
  ospite: { nome: string };
}

interface Marcatore {
  id: string;
  periodo: number;
  giocatore_uid: string;
  assist_giocatore_stagione_id: string | null;
  partita_id: string;
  stagione_id: string;
  squadra_segnante_id: string | null;
}

interface Giocatore {
  record_id: string;
  giocatore_uid: string;
  nome: string;
  cognome: string;
  foto_url?: string | null; // 👈 aggiunto
}

interface TimerState {
  partita_id: string;
  timer_started_at: string | null;
  timer_offset_ms: number;
  timer_status: "running" | "paused" | "stopped";
  updated_at?: string;
  timer_duration_min: number;
  run_index: number;
  total_elapsed_sec: number;
}

export default function ProssimaPartita() {
  const MONTECARLO_ID = "a16a8645-9f86-41d9-a81f-a92931f1cc67";

  const [partita, setPartita] = useState<PartitaProssima | null>(null);
  const [precedenti, setPrecedenti] = useState<ScontroPrecedente[]>([]);
  const [marcatoriLive, setMarcatoriLive] = useState<Marcatore[]>([]);
  const [giocatoriStagione, setGiocatoriStagione] = useState<Giocatore[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [perTimeCasa, setPerTimeCasa] = useState<number[]>([0, 0, 0, 0]);
  const [perTimeOspite, setPerTimeOspite] = useState<number[]>([0, 0, 0, 0]);
  
    // ========================
  // 11. Serie rigori live
  // ========================
  const [rigoriSerie, setRigoriSerie] = useState<any[]>([]);


  // TIMER
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  const navigate = useNavigate();

 // 1) ruolo (versione finale: legge direttamente da user_profiles)
useEffect(() => {
  (async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) {
      console.warn("⚠️ Nessun utente loggato trovato in getSession()");
      setRole(null);
      setRoleLoading(false);
      return;
    }

    // 🔹 Recupera ruolo da user_profiles (cast esplicito per enum)
const { data: profile, error } = await supabase
  .from("user_profiles")
  .select("role::text") // 👈 forza il cast a testo
  .eq("user_id", user.id)
  .maybeSingle();

if (error) {
  console.error("Errore lettura ruolo da user_profiles:", error);
  setRole(null);
} else {
  console.log("✅ Ruolo trovato in user_profiles:", profile?.role);
  setRole(profile?.role ?? null);
}


    setRoleLoading(false);
  })();
}, []);



// 2) prossima partita + timer associato + scontri precedenti
useEffect(() => {
  const fetchPartita = async () => {
    setLoading(true);

    const commonSelect = `
      id, stagione_id, data_ora, stato,
      squadra_casa_id, squadra_ospite_id,
      campionato_torneo, luogo_torneo,
      goal_a, goal_b,
            goal_a1, goal_a2, goal_a3, goal_a4,
      goal_b1, goal_b2, goal_b3, goal_b4,
      rigori_a, rigori_b,
      casa:squadra_casa_id(id,nome,logo_url),
      ospite:squadra_ospite_id(id,nome,logo_url)
    `;

    // 1) Se c'è una partita IN CORSO, ha precedenza (indipendentemente dall’orario)
    let { data: inCorso } = await supabase
      .from("partite")
      .select(commonSelect)
      .eq("stato", "InCorso")
      .order("data_ora", { ascending: true })
      .limit(1);

    let nextData = inCorso && inCorso.length ? inCorso : null;

    // 2) Altrimenti prendo la prossima DA GIOCARE con data_ora >= adesso
    if (!nextData) {
      const { data: future } = await supabase
  .from("partite")
  .select(commonSelect)
  .eq("stato", "DaGiocare")
  .order("data_ora", { ascending: true })
  .limit(1);

      if (future && future.length) nextData = future;
    }

    if (nextData?.length) {
      const next = nextData[0] as unknown as PartitaProssima;
      setPartita(next);
      setPerTimeCasa([next.goal_a1, next.goal_a2, next.goal_a3, next.goal_a4]);
      setPerTimeOspite([next.goal_b1, next.goal_b2, next.goal_b3, next.goal_b4]);

      // TIMER
      const { data: t } = await supabase
        .from("partita_timer_state")
        .select("*")
        .eq("partita_id", next.id)
        .maybeSingle();
      if (t) setTimerState(t as TimerState);

      // PRECEDENTI
      const { data: prevData } = await supabase
        .from("partite")
        .select(`
          id, data_ora, goal_a, goal_b,
          casa:squadra_casa_id(nome),
          ospite:squadra_ospite_id(nome)
        `)
        .or(
          `and(squadra_casa_id.eq.${next.squadra_casa_id},squadra_ospite_id.eq.${next.squadra_ospite_id}),` +
          `and(squadra_casa_id.eq.${next.squadra_ospite_id},squadra_ospite_id.eq.${next.squadra_casa_id})`
        )
        .lt("data_ora", next.data_ora)
        .order("data_ora", { ascending: false })
        .limit(5);

      setPrecedenti((prevData || []) as unknown as ScontroPrecedente[]);
    } else {
      // nessuna partita trovata
      setPartita(null);
      setPrecedenti([]);
      setTimerState(null);
    }

    setLoading(false);
  };

  fetchPartita();
}, []);


    // 3) elenco giocatori stagione
  useEffect(() => {
    if (!partita) return;
    (async () => {
      const { data: gs, error } = await supabase
  .from("giocatori_stagioni_view") // ✅ nome giusto
  .select("id,giocatore_uid,nome,cognome,foto_url")
  .eq("stagione_id", partita.stagione_id)
  .order("cognome", { ascending: true });

if (error) {
  console.error("Errore Supabase:", error);
}

const mapped: Giocatore[] = (gs || []).map((r: any) => ({
  record_id: r.id,
  giocatore_uid: r.giocatore_uid,
  nome: r.nome,
  cognome: r.cognome,
  foto_url: r.foto_url,
}));
setGiocatoriStagione(mapped);




    })(); // 👈 importante: chiudere subito la funzione async
  }, [partita]); // 👈 dipendenza corretta



  const normalizeMarcatore = (row: any): Marcatore => ({
    id: row.id,
    periodo: Number(row.periodo ?? row.goal_tempo ?? 1),
    giocatore_uid: String(row.giocatore_uid ?? row.giocatore_stagione_id ?? ""),
    assist_giocatore_stagione_id: row.assist_giocatore_stagione_id ?? null,
    partita_id: row.partita_id,
    stagione_id: row.stagione_id,
    squadra_segnante_id: row.squadra_segnante_id ?? null,
  });

  // 4) fetch marcatori
  useEffect(() => {
    if (!partita) return;
    (async () => {
      const { data } = await supabase
        .from("marcatori")
        .select("id,periodo,goal_tempo,giocatore_uid,giocatore_stagione_id,assist_giocatore_stagione_id,partita_id,stagione_id,squadra_segnante_id")
        .eq("partita_id", partita.id)
        .order("periodo", { ascending: true });

      const norm = (data || []).map(normalizeMarcatore);
      setMarcatoriLive(norm);
    })();
  }, [partita]);

  // 5) realtime partite
  useEffect(() => {
    if (!partita) return;
    const ch1 = supabase
      .channel("realtime-partite")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "partite", filter: `id=eq.${partita.id}` },
        ({ new: upd }) => {
          setPartita((prev) =>
            prev
              ? {
                  ...prev,
                  goal_a: upd.goal_a,
                  goal_b: upd.goal_b,
                  goal_a1: upd.goal_a1,
                  goal_a2: upd.goal_a2,
                  goal_a3: upd.goal_a3,
                  goal_a4: upd.goal_a4,
                  goal_b1: upd.goal_b1,
                  goal_b2: upd.goal_b2,
                  goal_b3: upd.goal_b3,
                  goal_b4: upd.goal_b4,
                }
              : prev
          );
          setPerTimeCasa([upd.goal_a1, upd.goal_a2, upd.goal_a3, upd.goal_a4]);
          setPerTimeOspite([upd.goal_b1, upd.goal_b2, upd.goal_b3, upd.goal_b4]);
        }
      )
      .subscribe();
    return () => {
  supabase.removeChannel(ch1);
};
  }, [partita]);

  // 6) realtime marcatori
  useEffect(() => {
    if (!partita) return;
    const ch2 = supabase
      .channel("realtime-marcatori")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "marcatori", filter: `partita_id=eq.${partita.id}` },
        ({ new: row }) => {
          const n = normalizeMarcatore(row);
          setMarcatoriLive((prev) => [...prev, n]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "marcatori", filter: `partita_id=eq.${partita.id}` },
        ({ new: row }) => {
          const n = normalizeMarcatore(row);
          setMarcatoriLive((prev) => {
            const i = prev.findIndex((m) => m.id === n.id);
            if (i === -1) return [...prev, n];
            const copy = [...prev];
            copy[i] = n;
            return copy;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "marcatori", filter: `partita_id=eq.${partita.id}` },
        ({ old }) => {
          setMarcatoriLive((prev) => prev.filter((m) => m.id !== old.id));
        }
      )
      .subscribe();
    return () => {
  supabase.removeChannel(ch2);
};
  }, [partita]);

    // ========================
  // 12. Caricamento e Realtime serie rigori
  // ========================
  useEffect(() => {
    if (!partita) return;

    let channel: any = null;
    let active = true;

    const loadRigori = async () => {
      const { data, error } = await supabase
        .from("rigori_partita")
        .select(`
          id,
          partita_id,
          squadra_id,
          ordine,
          esito
        `)
        .eq("partita_id", partita.id)
        .order("ordine", { ascending: true });

      if (!active) return;

      if (error) {
        console.error(
          "[ProssimaPartita] Errore caricamento serie rigori:",
          error.message
        );
        return;
      }

      setRigoriSerie(data || []);
    };

    loadRigori();

    channel = supabase
      .channel(`prossima-partita-rigori-${partita.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rigori_partita",
          filter: `partita_id=eq.${partita.id}`,
        },
        () => {
          loadRigori();
        }
      )
      .subscribe();

    return () => {
      active = false;

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [partita?.id]);

  // 7) realtime timer + poll (2s)
  useEffect(() => {
    if (!partita) return;
    let ch: any = null;
    let poll: any = null;

    const fetchTimer = async () => {
      const { data: t } = await supabase
        .from("partita_timer_state")
        .select("*")
        .eq("partita_id", partita.id)
        .maybeSingle();
      if (t) setTimerState(t as TimerState);
    };

    (async () => {
      ch = supabase
        .channel(`realtime-timer-${partita.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "partita_timer_state", filter: `partita_id=eq.${partita.id}` },
          ({ new: u }) => setTimerState(u as TimerState)
        )
        .subscribe();

      poll = setInterval(fetchTimer, 2000);
    })();

    return () => {
      if (ch) supabase.removeChannel(ch);
      if (poll) clearInterval(poll);
    };
  }, [partita]);

  // 8) ticker locale 1s
  useEffect(() => {
    if (!timerState) {
      setElapsedMs(0);
      return;
    }
    const compute = () => {
      if (timerState.timer_status === "running" && timerState.timer_started_at) {
        const started = new Date(timerState.timer_started_at).getTime();
        setElapsedMs(timerState.timer_offset_ms + (Date.now() - started));
      } else {
        setElapsedMs(timerState.timer_offset_ms || 0);
      }
    };
    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [timerState]);

  // 9) remaining sec
  useEffect(() => {
    const durationMin = timerState?.timer_duration_min ?? 20;
    const remaining = Math.floor(durationMin * 60) - Math.floor((elapsedMs || 0) / 1000);
    setTotalSeconds(remaining);
  }, [elapsedMs, timerState]);

  const handleCrea = () => navigate("/nuova-partita");
  const handleVaiAlMatch = () => partita && navigate(`/gestione-risultato/${partita.id}`);
  const formatData = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const formatOra = (d: string) => new Date(d).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  // Parziali per tempi: sempre usato sotto la squadra che NON è Montecarlo
  const renderParziali = (vals: number[]) => (
  <div className="w-full grid grid-cols-2 text-center text-sm">
    <div>1° Tempo: {vals[0]}</div>
    <div>2° Tempo: {vals[1]}</div>
  </div>
);

  // SOLO marcatori di Montecarlo
  const mcMarcatoriByPeriodo = useMemo(() => {
    const map: Record<number, Marcatore[]> = {};
    for (const m of marcatoriLive) {
      if (m.squadra_segnante_id === MONTECARLO_ID) {
        map[m.periodo] ??= [];
        map[m.periodo].push(m);
      }
    }
    return map;
  }, [marcatoriLive]);

  // ===== FIX: calcolo canEdit PRIMA dell'early return su !partita =====
  const canEdit = role === "admin" || role === "creator";

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-montecarlo">
          <div className="text-montecarlo-secondary">Caricamento…</div>
        </div>
      </div>
    );
  }

  if (!partita) {
    return (

        <div className="container mx-auto px-0">
          
            <Calendar className="mx-auto text-montecarlo-neutral mb-4" size={48} />
            <h2 className="text-xl font-bold text-montecarlo-secondary mb-4">
              Nessuna partita programmata
            </h2>
            <p className="text-montecarlo-neutral mb-6">
              Non ci sono partite in programma al momento.
            </p>
            {canEdit && (
              <button
                onClick={handleCrea}
                className="bg-gradient-montecarlo text-white px-6 py-3 rounded-lg flex items-center mx-auto hover:scale-105 transition"
              >
                <Plus className="mr-2" size={20} /> Crea Nuova Partita
              </button>
            )}
          </div>
      
    );
  }

  const isMontecarloCasa = partita.casa.id === MONTECARLO_ID;
  const isMontecarloOspite = partita.ospite.id === MONTECARLO_ID;

  const renderNomeMarcatore = (m: Marcatore) => {
    const byPlayer = giocatoriStagione.find((g) => g.giocatore_uid === m.giocatore_uid);
    const byRecord = giocatoriStagione.find((g) => g.record_id === m.giocatore_uid);
    const pl = byPlayer || byRecord;
    return pl ? `${pl.cognome} ${pl.nome}` : m.giocatore_uid;
  };


  // 10. Nome giocatore autore dell'assist
const renderNomeAssist = (giocatoreStagioneId: string | null) => {
  if (!giocatoreStagioneId) return null;

  const pl = giocatoriStagione.find(
    (g) => g.record_id === giocatoreStagioneId
  );

  return pl ? `${pl.cognome} ${pl.nome}` : null;
};

const statoPartita = getStatoPartita(timerState);
const testoPeriodo =
  statoPartita === StatoPartita.PRIMO_TEMPO
    ? "1° Tempo"
    : statoPartita === StatoPartita.SECONDO_TEMPO
    ? "2° Tempo"
    : statoPartita === StatoPartita.PRIMO_TEMPO_SUPPLEMENTARE
    ? "1° Suppl."
    : statoPartita === StatoPartita.SECONDO_TEMPO_SUPPLEMENTARE
    ? "2° Suppl."
    : statoPartita === StatoPartita.RIGORI
    ? "Rigori"
    : "";
  const timerIsNegative = totalSeconds < 0;
  const absMinutes = Math.floor(Math.abs(totalSeconds) / 60);
  const absSeconds = Math.abs(totalSeconds) % 60;
  const minDisplay = `${timerIsNegative ? "-" : ""}${String(absMinutes).padStart(2, "0")}`;
  const secDisplay = String(absSeconds).padStart(2, "0");
  const timerClass = timerIsNegative ? "border-red-500 text-red-500" : "border-green-500 text-green-500";
  

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] mx-auto w-full pl-[2px] pr-[4px] pt-2 pb-4 box-border">

      <div className="max-w-md mx-auto space-y-6 ">
        {/* Card prossima partita */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fafafa] to-[#eeeeee] shadow-[0_8px_24px_rgba(0,0,0,0.40)]">
  <div className="border-l-4 border-red-600 bg-gradient-to-r from-red-600 via-red-700 to-[#454545] p-4">
            <div className="flex justify-center items-center space-x-4 text-white">
              <div className="flex items-center">
                <Calendar className="mr-2" size={18} />
                <span className="font-semibold">{formatData(partita.data_ora)}</span>
              </div>
              <div className="flex items-center">
                <Clock className="mr-2" size={18} />
                <span className="font-semibold">{formatOra(partita.data_ora)}</span>
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="border border-white/30 bg-black/20 text-white px-3 py-1 rounded-full text-sm font-semibold">
  {partita.campionato_torneo}
</span>
            </div>
          </div>

            <div className="p-4 space-y-4">
              {/* Squadra Casa */}
              <div
                className={`flex flex-col items-center p-3 rounded-xl border-l-4 shadow-sm ${
  isMontecarloCasa
    ? "bg-white border-red-600"
    : "bg-[#f7f7f7] border-[#454545]"
}`}
              >
                <div className="flex items-center space-x-4 mb-2">
                  {partita.casa.logo_url ? (
                    <img
                      src={partita.casa.logo_url}
                      alt={`${partita.casa.nome} logo`}
                      className="w-14 h-14 object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-montecarlo-secondary rounded-full flex items-center justify-center text-white font-bold">
                      {partita.casa.nome.charAt(0)}
                    </div>
                  )}
                  <span
                    className={`text-lg font-bold ${
                      isMontecarloCasa ? "text-montecarlo-secondary" : "text-gray-900"
                    }`}
                  >
                    {partita.casa.nome}
                  </span>
                  <span
                    className={`text-lg font-bold text-gray-900 ${
                      partita.stato === "InCorso" ? "animate-pulse" : ""
                    }`}
                  >
                    ({partita.goal_a})
                  </span>
                </div>

                {isMontecarloCasa ? (
                  <div className="w-full grid grid-cols-2 gap-2">
  {[1, 2, 3, 4].map((periodo) => {
    const lista = mcMarcatoriByPeriodo[periodo] || [];

    if (!lista.length) return null;

    const titoloPeriodo =
      periodo === 1
        ? "1° Tempo"
        : periodo === 2
        ? "2° Tempo"
        : periodo === 3
        ? "1° T Suppl."
        : "2° T Suppl.";

    return (
      <div
        key={periodo}
        className="rounded-xl border-l-2 border-red-600 bg-[#f7f7f7] px-3 py-2 shadow-sm"
      >
        <h4 className="mb-1 text-center text-[12px] font-extrabold text-[#202020]">
          {titoloPeriodo}
        </h4>

        <ul className="space-y-1">
          {lista.map((m) => {
            const nomeAssist = renderNomeAssist(
              m.assist_giocatore_stagione_id
            );

            return (
              <li key={m.id} className="text-[12px] leading-tight">
                <div className="font-bold text-[#202020]">
                  {renderNomeMarcatore(m)}
                </div>

                {nomeAssist && (
                  <div className="text-[10px] text-gray-500">
                    Assist: {nomeAssist}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  })}
</div>
                ) : (
                  partita.stato !== "DaGiocare"
  ? renderParziali(perTimeCasa)
  : null
                )}
              </div>

            {/* 13. VS + timer / Serie rigori */}
{statoPartita === StatoPartita.RIGORI ? (
  <div className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
    <div className="mb-3 text-center text-[13px] font-extrabold uppercase tracking-wide text-red-600">
      Rigori
    </div>

    {(() => {
      const rigoriCasa = rigoriSerie
        .filter(
          (r) =>
            String(r.squadra_id) ===
            String(partita.squadra_casa_id)
        )
        .sort(
          (a, b) =>
            Number(a.ordine) - Number(b.ordine)
        );

      const rigoriOspite = rigoriSerie
        .filter(
          (r) =>
            String(r.squadra_id) ===
            String(partita.squadra_ospite_id)
        )
        .sort(
          (a, b) =>
            Number(a.ordine) - Number(b.ordine)
        );

      const numeroTiri = Math.max(
        rigoriCasa.length,
        rigoriOspite.length
      );

      return (
        <>
          <div className="mb-2 grid grid-cols-[1fr_40px_1fr] items-center">
            <div className="text-center text-[12px] font-extrabold text-[#202020]">
              {partita.casa.nome}
            </div>

            <div className="text-center text-[10px] font-extrabold text-gray-400">
              VS
            </div>

            <div className="text-center text-[12px] font-extrabold text-[#202020]">
              {partita.ospite.nome}
            </div>
          </div>

          {Array.from({ length: numeroTiri }).map(
            (_, index) => {
              const ordine = index + 1;

              const tiroCasa = rigoriCasa.find(
                (r) => Number(r.ordine) === ordine
              );

              const tiroOspite = rigoriOspite.find(
                (r) => Number(r.ordine) === ordine
              );

              return (
                <div
                  key={ordine}
                  className="grid min-h-[28px] grid-cols-[1fr_40px_1fr] items-center"
                >
                  <div
                    className={`text-center text-[19px] font-black ${
                      tiroCasa?.esito === "segnato"
                        ? "text-green-600"
                        : tiroCasa
                        ? "text-red-600"
                        : "text-gray-300"
                    }`}
                  >
                    {tiroCasa
                      ? tiroCasa.esito === "segnato"
                        ? "V"
                        : "X"
                      : ""}
                  </div>

                  <div />

                  <div
                    className={`text-center text-[19px] font-black ${
                      tiroOspite?.esito === "segnato"
                        ? "text-green-600"
                        : tiroOspite
                        ? "text-red-600"
                        : "text-gray-300"
                    }`}
                  >
                    {tiroOspite
                      ? tiroOspite.esito === "segnato"
                        ? "V"
                        : "X"
                      : ""}
                  </div>
                </div>
              );
            }
          )}

          <div className="mt-2 grid grid-cols-[1fr_40px_1fr] items-center border-t border-gray-200 pt-2">
            <div className="text-center text-[22px] font-black text-red-600">
              {partita.rigori_a ?? 0}
            </div>

            <div />

            <div className="text-center text-[22px] font-black text-red-600">
              {partita.rigori_b ?? 0}
            </div>
          </div>
        </>
      );
    })()}
  </div>
) : (
  <div className="flex items-center justify-center gap-3">
    {partita.stato === "InCorso" && testoPeriodo && (
      <div className="font-bold text-montecarlo-secondary whitespace-nowrap">
        {testoPeriodo}
      </div>
    )}

    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#202020] to-[#454545] text-[11px] font-extrabold text-white shadow-md">
      VS
    </div>

    {partita.stato === "InCorso" && (
      <div
        className={`px-4 py-2 rounded-full border-2 flex items-center justify-center font-bold text-xl tabular-nums ${timerClass}`}
      >
        {minDisplay}:{secDisplay}
      </div>
    )}
  </div>
)}

              {/* Squadra Ospite */}
              <div
                className={`flex flex-col items-center p-3 rounded-xl border-l-4 shadow-sm ${
  isMontecarloOspite
    ? "bg-white border-red-600"
    : "bg-[#f7f7f7] border-[#454545]"
}`}
              >
                <div className="flex items-center space-x-4 mb-2">
                  {partita.ospite.logo_url ? (
                    <img
                      src={partita.ospite.logo_url}
                      alt={`${partita.ospite.nome} logo`}
                      className="w-14 h-14 object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-montecarlo-secondary rounded-full flex items-center justify-center text-white font-bold">
                      {partita.ospite.nome.charAt(0)}
                    </div>
                  )}
                  <span
                    className={`text-lg font-bold ${
                      isMontecarloOspite ? "text-montecarlo-secondary" : "text-gray-900"
                    }`}
                  >
                    {partita.ospite.nome}
                  </span>
                  <span
                    className={`text-lg font-bold text-gray-900 ${
                      partita.stato === "InCorso" ? "animate-pulse" : ""
                    }`}
                  >
                    ({partita.goal_b})
                  </span>
                </div>

                {isMontecarloOspite ? (
                 <div className="w-full grid grid-cols-2 gap-2">
  {[1, 2, 3, 4].map((periodo) => {
    const lista = mcMarcatoriByPeriodo[periodo] || [];

    if (!lista.length) return null;

    const titoloPeriodo =
      periodo === 1
        ? "1° Tempo"
        : periodo === 2
        ? "2° Tempo"
        : periodo === 3
        ? "1° T Suppl."
        : "2° T Suppl.";

    return (
      <div
        key={periodo}
        className="rounded-xl border-l-2 border-red-600 bg-[#f7f7f7] px-3 py-2 shadow-sm"
      >
        <h4 className="mb-1 text-center text-[12px] font-extrabold text-[#202020]">
          {titoloPeriodo}
        </h4>

        <ul className="space-y-1">
          {lista.map((m) => {
            const nomeAssist = renderNomeAssist(
              m.assist_giocatore_stagione_id
            );

            return (
              <li key={m.id} className="text-[12px] leading-tight">
                <div className="font-bold text-[#202020]">
                  {renderNomeMarcatore(m)}
                </div>

                {nomeAssist && (
                  <div className="text-[10px] text-gray-500">
                    Assist: {nomeAssist}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  })}
</div>
                ) : (
                  partita.stato !== "DaGiocare"
  ? renderParziali(perTimeOspite)
  : null
                )}
              </div>

              {/* Pulsanti */}
            {canEdit && (
              <button
                onClick={handleVaiAlMatch}
                className="bg-gradient-montecarlo text-white px-6 py-3 rounded-lg flex items-center mx-auto hover:scale-105 transition"
              >
                <History className="mr-2" size={20} />
                Gestisci Risultato
              </button>
            )}
          </div>
        </div>

      {/* Campo Formazione: visibile solo se partita In Corso */}
{partita?.stato === "InCorso" ? (
  <CampoFormazione partitaId={partita.id} editable={false} />
) : (
  <div
  className="rounded-xl shadow-montecarlo p-10 mt-6 text-center italic font-medium text-xl"
  style={{
    backgroundImage: 'url("/Images/campo-sportivo.jpeg")',
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: "white",
    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
  }}
>
  In attesa della formazione
</div>

)}





        {/* Scontri precedenti */}
{precedenti.length > 0 && (
  <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fafafa] to-[#eeeeee] shadow-[0_8px_24px_rgba(0,0,0,0.40)] mt-6">

    <div className="border-l-4 border-red-600 bg-gradient-to-r from-red-600 via-red-700 to-[#454545] px-4 py-3">
      <h3 className="text-center text-[15px] font-extrabold uppercase tracking-wide text-white">
        Scontri precedenti
      </h3>
    </div>

    <div className="p-4">

      {/* Statistiche automatiche */}
      {(() => {
        let vittorie = 0;
        let pareggi = 0;
        let sconfitte = 0;

        precedenti.forEach((p) => {
          const montecarloCasa = p.casa.nome.toLowerCase().includes("montecarlo");
          const mcGoal = montecarloCasa ? p.goal_a : p.goal_b;
          const avvGoal = montecarloCasa ? p.goal_b : p.goal_a;

          if (mcGoal > avvGoal) vittorie++;
          else if (mcGoal === avvGoal) pareggi++;
          else sconfitte++;
        });

        return (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">

              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500">
                  Vittorie
                </div>
                <div className="mt-1 text-2xl font-black text-green-600">
                  {vittorie}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500">
                  Pareggi
                </div>
                <div className="mt-1 text-2xl font-black text-gray-500">
                  {pareggi}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500">
                  Sconfitte
                </div>
                <div className="mt-1 text-2xl font-black text-red-600">
                  {sconfitte}
                </div>
              </div>

            </div>

            {/* Pronostico dinamico */}
            <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-l-4 border-red-600 px-4 py-3 text-center">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                  Pronostico del match attuale
                </div>

                <div className="mt-1 text-[13px] font-extrabold">
                  {vittorie > sconfitte ? (
                    <span className="text-green-700">
                      Montecarlo favorito
                    </span>
                  ) : vittorie < sconfitte ? (
                    <span className="text-red-700">
                      {precedenti[0]?.casa.nome.toLowerCase().includes("montecarlo")
                        ? precedenti[0]?.ospite.nome
                        : precedenti[0]?.casa.nome}{" "}
                      favorito
                    </span>
                  ) : (
                    <span className="text-gray-600">
                      Match equilibrato
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Lista scontri precedenti */}
      <ul className="space-y-2">
        {precedenti.map((p) => (
          <li
            key={p.id}
            onClick={() => navigate(`/partita/${p.id}`)}
            className="
              cursor-pointer overflow-hidden rounded-xl
              border border-gray-200 bg-white
              shadow-sm transition-all duration-200
              hover:-translate-y-[1px] hover:shadow-md
              active:scale-[0.98]
              select-none
            "
          >
            <div className="grid grid-cols-[58px_1fr_auto] items-center gap-2 px-3 py-3">

              <div className="text-center text-[10px] font-bold leading-tight text-gray-500">
                {new Date(p.data_ora).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                })}
              </div>

              <div className="min-w-0 text-center">
                <div className="truncate text-[12px] font-bold uppercase leading-tight text-[#252525]">
                  {p.casa.nome}
                </div>

                <div className="my-1 text-[9px] font-extrabold text-gray-300">
                  VS
                </div>

                <div className="truncate text-[12px] font-bold uppercase leading-tight text-[#252525]">
                  {p.ospite.nome}
                </div>
              </div>

              <div className="flex min-w-[58px] items-center justify-center rounded-lg bg-gradient-to-br from-[#202020] to-[#454545] px-3 py-2 text-[17px] font-extrabold text-white shadow-sm">
                {p.goal_a} - {p.goal_b}
              </div>

            </div>
          </li>
        ))}
      </ul>

    </div>
  </div>
)}

      </div>
    </div>
  );
}