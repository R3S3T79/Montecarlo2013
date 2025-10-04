// src/pages/ProssimaPartita.tsx
// Data creazione chat: 03/08/2025

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Calendar, Clock, Plus, History } from "lucide-react";
import CampoFormazione from "../components/CampoFormazione";

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
  const [titolari, setTitolari] = useState<string[]>([]);


  // TIMER
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  const navigate = useNavigate();

  // 1) ruolo
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const email = auth?.user?.email;
      if (!email) {
        setRole(null);
        setRoleLoading(false);
        return;
      }
      const { data } = await supabase
        .from("pending_users")
        .select("role")
        .eq("email", email)
        .single();
      setRole(data?.role ?? null);
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
      const next = nextData[0] as PartitaProssima;
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

      setPrecedenti((prevData || []) as ScontroPrecedente[]);
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

// 👇 Popola titolari coi primi 9
setTitolari(mapped.slice(0, 9).map((g) => g.giocatore_uid));

    })(); // 👈 importante: chiudere subito la funzione async
  }, [partita]); // 👈 dipendenza corretta



  const normalizeMarcatore = (row: any): Marcatore => ({
    id: row.id,
    periodo: Number(row.periodo ?? row.goal_tempo ?? 1),
    giocatore_uid: String(row.giocatore_uid ?? row.giocatore_stagione_id ?? ""),
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
        .select("id,periodo,goal_tempo,giocatore_uid,giocatore_stagione_id,partita_id,stagione_id,squadra_segnante_id")
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
    return () => supabase.removeChannel(ch1);
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
    return () => supabase.removeChannel(ch2);
  }, [partita]);

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
    <div className="w-full grid grid-cols-4 text-center text-sm">
      <div>1°T: {vals[0]}</div>
      <div>2°T: {vals[1]}</div>
      <div>3°T: {vals[2]}</div>
      <div>4°T: {vals[3]}</div>
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

        <div className="container mx-auto px-2">
          
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

  const timerIsNegative = totalSeconds < 0;
  const absMinutes = Math.floor(Math.abs(totalSeconds) / 60);
  const absSeconds = Math.abs(totalSeconds) % 60;
  const minDisplay = `${timerIsNegative ? "-" : ""}${String(absMinutes).padStart(2, "0")}`;
  const secDisplay = String(absSeconds).padStart(2, "0");
  const timerClass = timerIsNegative ? "border-red-500 text-red-500" : "border-green-500 text-green-500";
  // Posizioni modulo base 4-4-2 (percentuali rispetto al campo)
const posizione = [
  { x: 50, y: 95 }, // Portiere
  { x: 50, y: 75 }, { x: 20, y: 70 }, { x: 80, y: 70 }, // Difensori
  { x: 50, y: 55 }, { x: 20, y: 50 }, { x: 80, y: 50 }, // Centrocampisti
  { x: 35, y: 35 }, { x: 65, y: 35 }, // Attaccanti
];


  return (
    <div className="container mx-auto px-2">
      <div className="max-w-md mx-auto space-y-6 ">
        {/* Card prossima partita */}
        <div className="bg-white/90 rounded-xl shadow-montecarlo overflow-hidden">
          <div className="bg-montecarlo-red-50 p-4 border-l-4 border-montecarlo-secondary">
            <div className="flex justify-center items-center space-x-4 text-montecarlo-secondary">
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
              <span className="bg-montecarlo-accent text-montecarlo-secondary px-3 py-1 rounded-full text-sm font-medium">
                {partita.campionato_torneo}
              </span>
            </div>
          </div>

            <div className="p-6 space-y-6">
              {/* Squadra Casa */}
              <div
                className={`flex flex-col items-center p-4 rounded-lg border ${
                  isMontecarloCasa
                    ? "bg-montecarlo-red-50 border-montecarlo-red-200"
                    : "bg-montecarlo-gray-50 border-montecarlo-gray-200"
                }`}
              >
                <div className="flex items-center space-x-4 mb-2">
                  {partita.casa.logo_url ? (
                    <img
                      src={partita.casa.logo_url}
                      alt={`${partita.casa.nome} logo`}
                      className="w-12 h-12 rounded-full border-2 border-montecarlo-accent"
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
                  <div className="w-full grid grid-cols-2 gap-4">
                    {Object.entries(mcMarcatoriByPeriodo).map(([periodo, lista]) => (
                      <div key={periodo} className="text-sm">
                        <h4 className="font-medium">{`${periodo}° Tempo`}</h4>
                        <ul className="list-disc list-inside">
                          {lista.map((m) => (
                            <li key={m.id}>{renderNomeMarcatore(m)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  renderParziali(perTimeCasa)
                )}
              </div>

              {/* VS + timer */}
              <div className="flex items-center justify-center space-x-4">
                {partita.stato === "InCorso" && (
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold ${timerClass}`}
                  >
                    {minDisplay}
                  </div>
                )}
                <div className="bg-gradient-montecarlo text-white px-6 py-2 rounded-full font-bold text-lg shadow-montecarlo">
                  VS
                </div>
                {partita.stato === "InCorso" && (
                  <div
                    className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold ${timerClass}`}
                  >
                    {secDisplay}
                  </div>
                )}
              </div>

              {/* Squadra Ospite */}
              <div
                className={`flex flex-col items-center p-4 rounded-lg border ${
                  isMontecarloOspite
                    ? "bg-montecarlo-red-50 border-montecarlo-red-200"
                    : "bg-montecarlo-gray-50 border-montecarlo-gray-200"
                }`}
              >
                <div className="flex items-center space-x-4 mb-2">
                  {partita.ospite.logo_url ? (
                    <img
                      src={partita.ospite.logo_url}
                      alt={`${partita.ospite.nome} logo`}
                      className="w-12 h-12 rounded-full border-2 border-montecarlo-accent"
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
                  <div className="w-full grid grid-cols-2 gap-4">
                    {Object.entries(mcMarcatoriByPeriodo).map(([periodo, lista]) => (
                      <div key={periodo} className="text-sm">
                        <h4 className="font-medium">{`${periodo}° Tempo`}</h4>
                        <ul className="list-disc list-inside">
                          {lista.map((m) => (
                            <li key={m.id}>{renderNomeMarcatore(m)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  renderParziali(perTimeOspite)
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

      {partita && (
  <CampoFormazione partitaId={partita.id} editable={true} />
)}


        {/* Scontri precedenti */}
        {precedenti.length > 0 && (
          <div className="bg-white/90 rounded-xl shadow-montecarlo p-6 mt-6">
            <h3 className="text-lg font-bold mb-2 text-center">Scontri precedenti</h3>
            <hr className="border-t border-gray-300 mb-4" />
            <ul className="space-y-3 text-center">
              {precedenti.map((p) => (
                <li key={p.id} className="text-sm text-gray-700">
                  <div className="font-semibold">{formatData(p.data_ora)}</div>
                  <div>
                    {p.casa.nome}{" "}
                    <span className="font-bold">
                      {p.goal_a} - {p.goal_b}
                    </span>{" "}
                    {p.ospite.nome}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}