// src/pages/HomePage.tsx
// Data creazione file: 17/08/2025 (rev: fix UI + logica compleanni stagione corrente + fix marcatori inline)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
// import CountdownVeronica from "../components/CountdownVeronica";
import WeatherWidget_OpenMeteo from "../components/WeatherWidget_OpenMeteo";
import { supabase } from "../lib/supabaseClient";
import {
  getStatoPartita,
  StatoPartita,
} from "../partita/partitaTimer";


// ========================
// Tipi
// ========================
type Notizia = {
  id: string;
  testo: string;
  pubblica: boolean;
  created_at: string;
  updated_at: string;
  // campi stile opzionali (AdminNotizie)
  colore?: string | null;
  bold?: boolean | null;
  italic?: boolean | null;
};

type GiocatoreView = {
  giocatore_uid: string; // <— necessario per filtrare per stagione
  nome: string | null;
  cognome: string | null;
  data_nascita: string | null; // date
  foto_url: string | null;
};

type NextBirthdayInfo = {
  date: Date; // prossima occorrenza (anno corrente o prossimo)
  players: { uid: string; nome: string; cognome: string; foto_url: string | null }[];
};

type PartitaLite = {
  id: string;
  data_ora: string;
  stato: "Giocata" | "DaGiocare" | "InCorso";
  campionato_torneo: "Campionato" | "Torneo" | "Amichevole" | string;
  squadra_casa_id: string;
  squadra_ospite_id: string;
  stagione_id?: string;

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

  // Casa
  squadra_casa_nome?: string | null;
  squadra_casa_logo?: string | null;
  casa_mappa_url?: string | null;
  casa_nome_stadio?: string | null;
  casa_indirizzo?: string | null;

  // Ospite
  squadra_ospite_nome?: string | null;
  squadra_ospite_logo?: string | null;
  ospite_mappa_url?: string | null;
  ospite_nome_stadio?: string | null;
  ospite_indirizzo?: string | null;

  // Ospitante (campo)
  squadra_ospitante_id?: string | null;
  squadra_ospitante_nome?: string | null;
  squadra_ospitante_logo?: string | null;
  ospitante_mappa_url?: string | null;
  ospitante_nome_stadio?: string | null;
  ospitante_indirizzo?: string | null;
    ospitante_lat?: number | null;
  ospitante_lon?: number | null;
  casa_lat?: number | null;
  casa_lon?: number | null;
};


type Marcatore = {
  id: string;
  periodo: number;
  giocatore_uid: string;
  partita_id: string;
  stagione_id: string;
  squadra_segnante_id?: string | null;
  nome?: string;
  cognome?: string;
  assist_giocatore_stagione_id?: string | null;
  assist_nome?: string;
  assist_cognome?: string;
};


type Stagione = {
  id: string;
  attiva?: boolean | null;
  created_at?: string | null;
};

// Tipo per la marquee (testo + stile)
type NewsMarqueeItem = {
  testo: string;
  colore?: string | null;
  bold?: boolean | null;
  italic?: boolean | null;
  isDot?: boolean; // separatore •
};

// ========================
// CONFIG SEZIONE FACEBOOK
// ========================

const MONTECARLO_NAME_INCLUDES = "montecarlo";

// ========================
// Component
// ========================
export default function HomePage(): JSX.Element {
  // ---------------------------
  // NOTIZIE - Stato & Realtime
  // ---------------------------
  const [notizie, setNotizie] = useState<Notizia[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const newsTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoadingNews(true);
      const { data, error } = await supabase
        .from("notizie")
        .select("*")
        .eq("pubblica", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!active) return;
      if (error) {
        console.error("[HomePage] Errore caricamento notizie:", error.message);
        setNotizie([]);
      } else {
        setNotizie(data || []);
      }
      setLoadingNews(false);
    };

    load();

    const channel = supabase
      .channel("realtime-notizie")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notizie" },
        () => {
          (async () => {
            const { data, error } = await supabase
              .from("notizie")
              .select("*")
              .eq("pubblica", true)
              .order("created_at", { ascending: false })
              .limit(30);
            if (error) {
              console.error("[HomePage] Realtime reload notizie error:", error.message);
              return;
            }
            setNotizie(data || []);
          })();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Costruzione items con stile
  const marqueeItems = useMemo<NewsMarqueeItem[]>(() => {
    if (loadingNews) return [{ testo: "Caricamento notizie…" }];
    if (!notizie.length) return [{ testo: "In attesa di contenuti dal pannello admin…" }];

    return notizie
      .map((n) => ({
        testo: (n.testo || "").trim(),
        colore: n.colore ?? undefined,
        bold: n.bold ?? undefined,
        italic: n.italic ?? undefined,
      }))
      .filter((i) => i.testo.length > 0);
  }, [loadingNews, notizie]);

  // Loop con separatore • mantenendo stile del punto attenuato
  const marqueeLoop = useMemo<NewsMarqueeItem[]>(() => {
    if (!marqueeItems.length) return [];
    const sep: NewsMarqueeItem = { testo: "•", isDot: true };
    return [...marqueeItems, sep, ...marqueeItems];
  }, [marqueeItems]);



  // --------------------------------
// COMPLEANNI — solo stagione attuale
// --------------------------------
const [nextBirthday, setNextBirthday] = useState<NextBirthdayInfo | null>(null);
const [nowTick, setNowTick] = useState<Date>(new Date());

useEffect(() => {
  const t = setInterval(() => setNowTick(new Date()), 30_000);
  return () => clearInterval(t);
}, []);

useEffect(() => {
  let mounted = true;

  const loadPlayersBirth = async () => {
    // 1) prendo stagione corrente (ultima inserita)
    let stagioneCorrente: Stagione | null = null;
    {
      const oggi = new Date().toISOString().slice(0, 10);

const { data: last, error: e2 } = await supabase
  .from("stagioni")
  .select("id")
  .lte("data_inizio", oggi)
  .gte("data_fine", oggi)
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

    // set per evitare duplicati (uid o nome+cognome)
    const seen = new Set<string>();

    for (const r of rows) {
      if (!r.data_nascita) continue;

      const key = r.giocatore_uid || `${r.nome}|${r.cognome}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const d = new Date(r.data_nascita);
      const month = d.getMonth();
      const day = d.getDate();

      let next = new Date(y, month, day, 0, 0, 0, 0);
      if (isPastDayMonth(today, next)) next = new Date(y + 1, month, day, 0, 0, 0, 0);

      const plInfo = {
        uid: r.giocatore_uid,
        nome: (r.nome || "").trim(),
        cognome: (r.cognome || "").trim(),
        foto_url: r.foto_url || null,
      };

      if (!bestDate || next.getTime() < bestDate.getTime()) {
        bestDate = next;
        playersForBest = [plInfo];
      } else if (bestDate && sameDayMonth(next, bestDate)) {
        playersForBest.push(plInfo);
      }
    }

    if (mounted) {
      if (bestDate) {
        setNextBirthday({
          date: bestDate,
          players: sortPlayers(playersForBest),
        });
      } else {
        setNextBirthday(null);
      }
    }
  };

  loadPlayersBirth();
  return () => {
    mounted = false;
  };
}, []);

  // --------------------------------
  // PROSSIMO IMPEGNO — Query + Live
  // --------------------------------
  const [match, setMatch] = useState<PartitaLite | null>(null);
  const [loadingMatch, setLoadingMatch] = useState<boolean>(true);

  const [marcatoriLive, setMarcatoriLive] = useState<Marcatore[]>([]);

// ========================
// 1. Serie rigori live
// ========================
const [rigoriSerie, setRigoriSerie] = useState<any[]>([]);
 

const [perTimeCasa, setPerTimeCasa] = useState<number[]>([0, 0, 0, 0]);
const [perTimeOspite, setPerTimeOspite] = useState<number[]>([0, 0, 0, 0]);


 useEffect(() => {
  let mounted = true;
  let ch: any = null;

  const loadNextMatch = async () => {
    setLoadingMatch(true);

    let next: PartitaLite | null = null;

    // 1) Partita in corso
    const { data: inCorso, error: errInCorso } = await supabase
      .from("partite_v")
      .select("*")
      .eq("stato", "InCorso")
      .order("data_ora", { ascending: true })
      .limit(1);

    if (errInCorso) {
      console.error("[HomePage] Errore partita InCorso:", errInCorso.message);
    }

    if (inCorso && inCorso.length) {
      next = inCorso[0] as PartitaLite;
    } else {
      // 2) Se non ce n'è una in corso, prendo la prossima da giocare
      const { data: future, error: errFuture } = await supabase
        .from("partite_v")
        .select("*")
        .eq("stato", "DaGiocare")
        .order("data_ora", { ascending: true })
        .limit(1);

      if (errFuture) {
        console.error("[HomePage] Errore partita DaGiocare:", errFuture.message);
      }

      if (future && future.length) {
        next = future[0] as PartitaLite;
      }
    }

    if (!mounted) return;

    if (next) {
      setMatch(next);
      setPerTimeCasa([next.goal_a1, next.goal_a2, next.goal_a3, next.goal_a4]);
      setPerTimeOspite([next.goal_b1, next.goal_b2, next.goal_b3, next.goal_b4]);

      // Attivo realtime
      ch = supabase
        .channel(`partita-${next.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "partite", filter: `id=eq.${next.id}` },
          ({ new: upd }) => {
            setMatch((prev) =>
              prev && prev.id === upd.id ? { ...prev, ...upd } : prev
            );
            setPerTimeCasa([upd.goal_a1, upd.goal_a2, upd.goal_a3, upd.goal_a4]);
            setPerTimeOspite([upd.goal_b1, upd.goal_b2, upd.goal_b3, upd.goal_b4]);
          }
        )
        .subscribe();
    } else {
      setMatch(null);
    }

    setLoadingMatch(false);
  };

  loadNextMatch();

  return () => {
    mounted = false;
    if (ch) supabase.removeChannel(ch);
  };
}, []);

// ✅ Caricamento e Realtime Marcatori Live (view marcatori_v)
useEffect(() => {
  if (!match || match.stato !== "InCorso") return;

  const MONTECARLO_ID = "a16a8645-9f86-41d9-a81f-a92931f1cc67";
  let channel: any = null;
  let active = true;

  const loadMarcatori = async () => {
    const { data, error } = await supabase
      .from("marcatori_v")
      .select(`
        id,
        periodo,
        goal_tempo,
        giocatore_uid,
        giocatore_stagione_id,
        partita_id,
        stagione_id,
        squadra_segnante_id,
        giocatore_nome,
        giocatore_cognome,
        assist_giocatore_stagione_id,
        assist_nome,
        assist_cognome
      `)
      .eq("partita_id", match.id)
      .order("periodo", { ascending: true });

    if (!active) return;

    if (error) {
      console.error(
        "[HomePage] Errore caricamento marcatori (view marcatori_v):",
        error.message
      );
      return;
    }

    // Mostra solo marcatori del Montecarlo
    const mc = (data || []).filter(
      (m) => m.squadra_segnante_id === MONTECARLO_ID
    );

    setMarcatoriLive(mc.map(normalizeMarcatore));
  };

  loadMarcatori();

  channel = supabase
    .channel(`home-marcatori-${match.id}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "marcatori",
        filter: `partita_id=eq.${match.id}`,
      },
      () => {
        loadMarcatori();
      }
    )
    .subscribe();

  return () => {
    active = false;

    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}, [match?.id, match?.stato]);;

// ========================
// 2. Caricamento e Realtime serie rigori
// ========================
useEffect(() => {
  if (!match || match.stato !== "InCorso") return;

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
      .eq("partita_id", match.id)
      .order("ordine", { ascending: true });

    if (!active) return;

    if (error) {
      console.error(
        "[HomePage] Errore caricamento serie rigori:",
        error.message
      );
      return;
    }

    setRigoriSerie(data || []);
  };

  loadRigori();

  channel = supabase
    .channel(`home-rigori-${match.id}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rigori_partita",
        filter: `partita_id=eq.${match.id}`,
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
}, [match?.id, match?.stato]);

// ✅ Effetto per il plugin Facebook
useEffect(() => {
  if ((window as any).FB) {
    (window as any).FB.XFBML.parse();
  }
}, []);


// normalizzazione marcatore con nome e cognome
const normalizeMarcatore = (row: any): Marcatore => ({
  id: row.id,
  periodo: Number(row.periodo ?? row.goal_tempo ?? 1),
  giocatore_uid: String(row.giocatore_uid ?? row.giocatore_stagione_id ?? ""),
  partita_id: row.partita_id,
  stagione_id: row.stagione_id,
  squadra_segnante_id: row.squadra_segnante_id ?? null,
  nome: row.giocatore_nome || "",
  cognome: row.giocatore_cognome || "",
  assist_giocatore_stagione_id: row.assist_giocatore_stagione_id ?? null,
  assist_nome: row.assist_nome || "",
  assist_cognome: row.assist_cognome || "",
});


const isLive = match?.stato === "InCorso";
const isTodayMatch = match ? isSameCalendarDay(new Date(match.data_ora), new Date()) : false;

const mcSide: "casa" | "ospite" | null = useMemo(() => {
  if (!match) return null;
  const casa = (match.squadra_casa_nome || "").toLowerCase();
  const osp = (match.squadra_ospite_nome || "").toLowerCase();
  if (casa.includes(MONTECARLO_NAME_INCLUDES)) return "casa";
  if (osp.includes(MONTECARLO_NAME_INCLUDES)) return "ospite";
  return null;
}, [match]);


const marcatoriByPeriodo = useMemo(() => {
  const map: Record<number, Marcatore[]> = {};
  for (const m of marcatoriLive) {
    map[m.periodo] ??= [];
    map[m.periodo].push(m);
  }
  return map;
}, [marcatoriLive]);

// =========================
// TIMER LIVE (partita_timer_state con logica ProssimaPartita)
// =========================
const [timerState, setTimerState] = useState<any>(null);
const [elapsedMs, setElapsedMs] = useState(0);
const [totalSeconds, setTotalSeconds] = useState(0);

useEffect(() => {
  if (!isLive || !match) return;

  let channel: any = null;
  let poll: any = null;

  const fetchTimer = async () => {
    const { data, error } = await supabase
      .from("partita_timer_state")
      .select("*")
      .eq("partita_id", match.id)
      .maybeSingle();
    if (!error && data) setTimerState(data);
  };

  (async () => {
    // 🔁 Realtime updates
    channel = supabase
  .channel(`home-realtime-timer-${match.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "partita_timer_state",
          filter: `partita_id=eq.${match.id}`,
        },
        ({ new: row }) => setTimerState(row)
      )
      .subscribe();

    // ⏱ Poll di sicurezza ogni 2 secondi
    poll = setInterval(fetchTimer, 2000);
    fetchTimer();
  })();

  return () => {
    if (channel) supabase.removeChannel(channel);
    if (poll) clearInterval(poll);
  };
}, [isLive, match]);

// 🔹 Aggiorna elapsedMs ogni secondo
useEffect(() => {
  if (!timerState) {
    setElapsedMs(0);
    return;
  }

  const updateElapsed = () => {
    if (timerState.timer_status === "running" && timerState.timer_started_at) {
      const started = new Date(timerState.timer_started_at).getTime();
      setElapsedMs(timerState.timer_offset_ms + (Date.now() - started));
    } else {
      setElapsedMs(timerState.timer_offset_ms || 0);
    }
  };

  updateElapsed();
  const interval = setInterval(updateElapsed, 1000);
  return () => clearInterval(interval);
}, [timerState]);

// 🔹 Calcola tempo rimanente
useEffect(() => {
  const durationMin = timerState?.timer_duration_min ?? 35;
  const remaining = Math.floor(durationMin * 60) - Math.floor((elapsedMs || 0) / 1000);
  setTotalSeconds(remaining);
}, [elapsedMs, timerState]);

// 🔹 Conversione per visualizzazione
const isNegative = totalSeconds < 0;
const absMinutes = Math.floor(Math.abs(totalSeconds) / 60);
const absSeconds = Math.abs(totalSeconds) % 60;
const minDisplay = `${isNegative ? "-" : ""}${String(absMinutes).padStart(2, "0")}`;
const secDisplay = String(absSeconds).padStart(2, "0");
const statoPartita = getStatoPartita(timerState);

const isIntervallo =
  statoPartita === StatoPartita.INTERVALLO;

const isGiocoAttivo =
  timerState?.timer_status === "running" &&
  (
    statoPartita === StatoPartita.PRIMO_TEMPO ||
    statoPartita === StatoPartita.SECONDO_TEMPO ||
    statoPartita === StatoPartita.PRIMO_TEMPO_SUPPLEMENTARE ||
    statoPartita === StatoPartita.SECONDO_TEMPO_SUPPLEMENTARE
  );



// usa direttamente nome e cognome dalla view
const renderNomeMarcatore = (m: Marcatore) => {
  return `${m.cognome} ${m.nome}`.trim();
};




  // --------------------------------
  // RENDER
  // --------------------------------
  return (
  <div style={styles.page}>
    {/* HERO HEADER: logo + titolo centrati */}
    <header style={styles.header}>
  <div style={styles.heroRow}>

    <div style={styles.heroLines}>
      <div style={styles.heroLine}></div>
      <div style={styles.heroLine}></div>
      <div style={styles.heroLine}></div>
    </div>

    <div style={styles.heroCenter}>
      <img
        src="/montecarlo.png"
        alt="Stemma Montecarlo"
        style={styles.heroLogo}
      />

      <h1 style={styles.heroTitle}>
        <span style={styles.heroTitleRed}>MONTECARLO</span>
        <span style={styles.heroTitleWhite}>2013</span>
      </h1>
    </div>

    <div style={styles.heroLines}>
      <div style={styles.heroLine}></div>
      <div style={styles.heroLine}></div>
      <div style={styles.heroLine}></div>
    </div>

  </div>
</header>




    <section style={styles.newsCard}>
  <div style={styles.newsQuote}>“</div>

  <div style={styles.newsStrip}>
    <div style={styles.marqueeMask}>
      <div
        ref={newsTrackRef}
        className="marqueeTrack"
        style={styles.marqueeTrack}
        onMouseEnter={() => newsTrackRef.current?.classList.add("paused")}
        onMouseLeave={() => newsTrackRef.current?.classList.remove("paused")}
        onTouchStart={() => newsTrackRef.current?.classList.add("paused")}
        onTouchEnd={() => newsTrackRef.current?.classList.remove("paused")}
      >
        {marqueeLoop.map((n, idx) => (
          <span
            key={idx}
            style={{
              ...(n.isDot ? styles.dot : styles.newsItem),
              color: n.colore || (n.isDot ? undefined : "inherit"),
              fontWeight: n.bold ? "bold" : "normal",
              fontStyle: n.italic ? "italic" : "normal",
            }}
          >
            {n.testo}
          </span>
        ))}
      </div>
    </div>
  </div>
</section>


{/* Countdown al compleanno di Veronica */}
{/* commento */}
{/* COMPLEANNO GIOCATORE */}
<section
  style={{
    ...styles.card,
    ...(nextBirthday
      ? getBirthdayBackground(nextBirthday.date, nowTick)
      : {}),
    background: "rgba(255,255,255,0.50)",
  }}
>
  {nextBirthday ? (
    isSameCalendarDay(nowTick, nextBirthday.date) ? (
      // 🎂 Giorno del compleanno: layout centrato
      <div style={styles.birthdayFullBox}>
        <div style={styles.birthdayTodayText}>Buon compleanno!</div>

        <div style={styles.birthdayNamesCentered}>
          {nextBirthday.players.map((p) => (
            <div key={p.uid} style={styles.birthdayPlayerBox}>
              {p.foto_url && (
                <img
                  src={p.foto_url}
                  alt={`${p.nome} ${p.cognome}`}
                  style={styles.birthdayPhoto}
                />
              )}

              <div style={styles.playerName}>
                <span style={styles.playerSurname}>
                  {(p.cognome || "").trim()}
                </span>

                <span style={styles.playerFirstName}>
                  {(p.nome || "").trim()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      // ⏱ Giorni precedenti al compleanno — LAYOUT CENTRATO
      <div style={styles.birthdayCountdownBox}>
        <div style={styles.birthdayDate}>
          {formatItalianDate(nextBirthday.date)}
        </div>

        <div style={styles.timerBig}>
          {(() => {
            const target = nextBirthday.date;
            const now = nowTick;
            const diffMs = target.getTime() - now.getTime();
            const totalMinutes = Math.floor(diffMs / 60000);
            const days = Math.floor(totalMinutes / (60 * 24));
            const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
            const minutes = totalMinutes % 60;

            return (
              <>
                <span style={styles.timerNumber}>{days}</span>

                <span style={styles.timerLabel}>
                  {days === 1 ? "GIORNO" : "GIORNI"}
                </span>

                <span style={styles.timerNumber}>{hours}</span>

                <span style={styles.timerLabel}>
                  {hours === 1 ? "ORA" : "ORE"}
                </span>

                <span style={styles.timerNumber}>{minutes}</span>

                <span style={styles.timerLabel}>MINUTI</span>
              </>
            );
          })()}
        </div>

        <div style={styles.birthdayNamesCentered}>
          {nextBirthday.players.map((p) => (
            <div key={p.uid} style={styles.birthdayPlayerBox}>
              {p.foto_url && (
                <img
                  src={p.foto_url}
                  alt={`${p.nome} ${p.cognome}`}
                  style={styles.birthdayPhoto}
                />
              )}

              <div style={styles.playerName}>
                <span style={styles.playerSurname}>
                  {(p.cognome || "").trim()}
                </span>

                <span style={styles.playerFirstName}>
                  {(p.nome || "").trim()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  ) : (
    // ❌ Nessun compleanno disponibile
    <div style={styles.birthdayRow}>
      <div style={styles.timerBox}>
        <div style={styles.timerBig}>—</div>
        <div style={styles.timerHint}>Nessun compleanno disponibile</div>
      </div>

      <div style={styles.birthdayNames}>
        <div style={styles.playerNameMuted}>—</div>
      </div>
    </div>
  )}
</section>



      {/* PROSSIMO IMPEGNO */}
<section
  style={{
    ...styles.card,
    ...styles.wideCard,
    background: "rgba(255,255,255,0.50)",
  }}
>

  {loadingMatch ? (
    <div style={styles.liveHint}>Caricamento…</div>
  ) : !match ? (
    <div style={styles.liveHint}>
      Nessuna partita imminente. <Link to="/calendario">Vai al calendario</Link>
    </div>
  ) : (
    <div style={styles.fixtureBox}>
      {/* Meta centrati */}
      <div style={styles.fixtureMetaCentered}>
        <div style={styles.badgeWrap}>
          <span style={styles.badge}>
            {capitalizeSafe((match.campionato_torneo || "").trim())}
          </span>
          {isLive && isTodayMatch && (
            <span style={styles.livePillInline}>LIVE</span>
          )}
        </div>
        <span style={{ ...styles.fixtureDate, fontWeight: "bold" }}>
  {formatItalianDateTime(new Date(match.data_ora))}
</span>

      </div>

      
{/* 🔹 Timer in tempo reale dal gestionerisultato */}
{isLive && (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center",
      width: "100%",
      marginTop: 6,
    }}
  >
    <div
      style={{
        justifySelf: "start",
        paddingLeft:65,
        fontSize: 13,
        fontWeight: 800,
        color: "#202020",
        textTransform: "uppercase",
      }}
    >
      {!isIntervallo &&
        (statoPartita === StatoPartita.PRIMO_TEMPO
          ? "1° Tempo"
          : statoPartita === StatoPartita.SECONDO_TEMPO
          ? "2° Tempo"
          : statoPartita === StatoPartita.PRIMO_TEMPO_SUPPLEMENTARE
          ? "1° Suppl."
          : statoPartita === StatoPartita.SECONDO_TEMPO_SUPPLEMENTARE
          ? "2° Suppl."
          : "")}
    </div>

        <div style={styles.timerInlineBox}>
      {statoPartita === StatoPartita.RIGORI ? (
        <span
          style={{
            ...styles.timerValue,
            fontFamily: "inherit",
            fontSize: 18,
            letterSpacing: 0.5,
          }}
        >
          RIGORI
        </span>
      ) : isIntervallo ? (
        <span
          style={{
            ...styles.timerValue,
            fontFamily: "inherit",
            fontSize: 18,
            letterSpacing: 0.5,
          }}
        >
          INTERVALLO
        </span>
      ) : (
        <>
          <span style={styles.timerValue}>{minDisplay}′</span>
          <span style={styles.timerSeparator}>:</span>
          <span style={styles.timerValue}>{secDisplay}″</span>
        </>
      )}
    </div>

    <div />
  </div>
)}




      {isLive ? (
        <>
          {/* Struttura LIVE */}
          <div style={styles.teamsLiveRow}>
            {/* Squadra Casa */}
            <div style={styles.teamLiveCol}>
              <div style={styles.teamLiveHead}>
                {match.squadra_casa_logo && (
                  <img
                    src={match.squadra_casa_logo}
                    alt={match.squadra_casa_nome || "Casa"}
                    style={styles.teamLogo}
                  />
                )}
                <div style={styles.teamName}>{match.squadra_casa_nome || "Casa"}</div>
               <span
  style={{
    ...styles.liveScoreBlink,
    animation: isGiocoAttivo ? "blink 1s linear infinite" : "none",
  }}
>
  {match.goal_a}
</span>
              </div>

              {/* 👇 Se Montecarlo è in casa, mostra marcatori live */}
              {mcSide === "casa" ? (
                <div style={styles.scorersWrapper}>
                  {Object.entries(marcatoriByPeriodo).map(([periodo, lista]) => (
                    <div key={periodo}>
                      <strong>
  {periodo === "1"
    ? "1° Tempo"
    : periodo === "2"
    ? "2° Tempo"
    : periodo === "3"
    ? "1° T Suppl."
    : periodo === "4"
    ? "2° T Suppl."
    : `${periodo}° Tempo`}
</strong>
                      {lista.length ? (
                        <ul style={styles.scorersUl}>
                          {lista.map((m) => (
                            <li
  key={m.id}
  style={{
    listStyle: "none",
    padding: "7px 8px",
    marginTop: 5,
    borderRadius: 8,
    background: "rgba(245,245,245,0.85)",
    borderLeft: "3px solid #dc2626",
  }}
>
  <div
    style={{
      fontSize: 13,
      fontWeight: 800,
      color: "#202020",
      lineHeight: 1.2,
    }}
  >
    {renderNomeMarcatore(m)}
  </div>

  {m.assist_giocatore_stagione_id && (
    <div
      style={{
        marginTop: 4,
        fontSize: 10,
        fontWeight: 500,
        color: "#777777",
        lineHeight: 1.2,
      }}
    >
      Assist: {`${m.assist_cognome || ""} ${m.assist_nome || ""}`.trim()}
    </div>
  )}
</li>
                          ))}
                        </ul>
                      ) : (
                        <div style={styles.scorersListMuted}>—</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.perTimeRow}>
  <div style={styles.tempoItem}>
    <div style={styles.tempoLabel}>1° Tempo</div>
    <div style={styles.tempoValue}>{perTimeCasa[0]}</div>
  </div>

  <div style={styles.tempoItem}>
    <div style={styles.tempoLabel}>2° Tempo</div>
    <div style={styles.tempoValue}>{perTimeCasa[1]}</div>
  </div>

  {(statoPartita === StatoPartita.PRIMO_TEMPO_SUPPLEMENTARE ||
    statoPartita === StatoPartita.INTERVALLO_SUPPLEMENTARI ||
    statoPartita === StatoPartita.SECONDO_TEMPO_SUPPLEMENTARE ||
    statoPartita === StatoPartita.RIGORI) && (
    <div style={styles.tempoItem}>
      <div style={styles.tempoLabel}>1° Suppl.</div>
      <div style={styles.tempoValue}>{perTimeCasa[2]}</div>
    </div>
  )}

  {(statoPartita === StatoPartita.SECONDO_TEMPO_SUPPLEMENTARE ||
    statoPartita === StatoPartita.RIGORI) && (
    <div style={styles.tempoItem}>
      <div style={styles.tempoLabel}>2° Suppl.</div>
      <div style={styles.tempoValue}>{perTimeCasa[3]}</div>
    </div>
   )}
</div>
              )}

                        </div>

                        {statoPartita === StatoPartita.RIGORI && (
              <div style={styles.teamLiveCol}>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#202020",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Rigori
                </div>

                {(() => {
                  const rigoriCasa = rigoriSerie
                    .filter(
                      (r) =>
                        String(r.squadra_id) ===
                        String(match.squadra_casa_id)
                    )
                    .sort(
                      (a, b) =>
                        Number(a.ordine) - Number(b.ordine)
                    );

                  const rigoriOspite = rigoriSerie
                    .filter(
                      (r) =>
                        String(r.squadra_id) ===
                        String(match.squadra_ospite_id)
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
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 40px 1fr",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 900,
                            color: "#202020",
                          }}
                        >
                          {match.squadra_casa_nome || "Casa"}
                        </div>

                        <div
                          style={{
                            textAlign: "center",
                            fontSize: 11,
                            fontWeight: 900,
                            color: "#777777",
                          }}
                        >
                          VS
                        </div>

                        <div
                          style={{
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 900,
                            color: "#202020",
                          }}
                        >
                          {match.squadra_ospite_nome || "Ospite"}
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
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 40px 1fr",
                                alignItems: "center",
                                minHeight: 30,
                              }}
                            >
                              <div
                                style={{
                                  textAlign: "center",
                                  fontSize: 20,
                                  fontWeight: 900,
                                  color:
                                    tiroCasa?.esito === "segnato"
                                      ? "#16a34a"
                                      : tiroCasa
                                      ? "#dc2626"
                                      : "#cccccc",
                                }}
                              >
                                {tiroCasa
                                  ? tiroCasa.esito === "segnato"
                                    ? "V"
                                    : "X"
                                  : ""}
                              </div>

                              <div />

                              <div
                                style={{
                                  textAlign: "center",
                                  fontSize: 20,
                                  fontWeight: 900,
                                  color:
                                    tiroOspite?.esito === "segnato"
                                      ? "#16a34a"
                                      : tiroOspite
                                      ? "#dc2626"
                                      : "#cccccc",
                                }}
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

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 40px 1fr",
                          alignItems: "center",
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: "1px solid #dddddd",
                        }}
                      >
                        <div
                          style={{
                            textAlign: "center",
                            fontSize: 22,
                            fontWeight: 900,
                            color: "#dc2626",
                          }}
                        >
                          {match.rigori_a ?? 0}
                        </div>

                        <div />

                        <div
                          style={{
                            textAlign: "center",
                            fontSize: 22,
                            fontWeight: 900,
                            color: "#dc2626",
                          }}
                        >
                          {match.rigori_b ?? 0}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Squadra Ospite */}
            <div style={styles.teamLiveCol}>
              <div style={styles.teamLiveHead}>
                {match.squadra_ospite_logo && (
                  <img
                    src={match.squadra_ospite_logo}
                    alt={match.squadra_ospite_nome || "Ospite"}
                    style={styles.teamLogo}
                  />
                )}
                <div style={styles.teamName}>{match.squadra_ospite_nome || "Ospite"}</div>
                <span
  style={{
    ...styles.liveScoreBlink,
    animation: isGiocoAttivo ? "blink 1s linear infinite" : "none",
  }}
>
  {match.goal_b}
</span>
              </div>

              {/* 👇 Se Montecarlo è in trasferta, mostra marcatori live */}
              {mcSide === "ospite" ? (
                <div style={styles.scorersWrapper}>
                  {Object.entries(marcatoriByPeriodo).map(([periodo, lista]) => (
                    <div key={periodo}>
                      <div
  style={{
    marginBottom: 7,
    fontSize: 13,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "#202020",
  }}
>
  {periodo}° Tempo
</div>
                      {lista.length ? (
                        <ul style={styles.scorersUl}>
                          {lista.map((m) => (
                            <li key={m.id} style={styles.scorerItem}>
                              {renderNomeMarcatore(m)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={styles.scorersListMuted}>—</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
               <div style={styles.perTimeRow}>
  <div style={styles.tempoItem}>
    <div style={styles.tempoLabel}>1° Tempo</div>
    <div style={styles.tempoValue}>{perTimeOspite[0]}</div>
  </div>

  <div style={styles.tempoItem}>
    <div style={styles.tempoLabel}>2° Tempo</div>
    <div style={styles.tempoValue}>{perTimeOspite[1]}</div>
  </div>

  <div style={styles.tempoItem}>
    <div style={styles.tempoLabel}>1° Tempo Suppl.</div>
    <div style={styles.tempoValue}>{perTimeOspite[2]}</div>
  </div>

  <div style={styles.tempoItem}>
    <div style={styles.tempoLabel}>2° Tempo Suppl.</div>
    <div style={styles.tempoValue}>{perTimeOspite[3]}</div>
    </div>
</div>
              )}

          
            </div>
          </div>

          <div style={styles.actions}>
            <Link to="/prossima-partita" style={styles.linkBtn}>
              Partita in Diretta
            </Link>
          </div>
        </>
      ) : (
  // Struttura normale se non è in corso
<>
  <div style={styles.matchBorderBox}>
    <div style={styles.teamsRowColumn}>

      {/* Squadra Casa */}
      <div style={{ ...styles.teamSide, justifyContent: "center" }}>
        {match.squadra_casa_logo && (
          <img
            src={match.squadra_casa_logo}
            alt={match.squadra_casa_nome || "Casa"}
            style={styles.teamLogo}
          />
        )}

        <div style={{ ...styles.teamName, textAlign: "center" }}>
          {match.squadra_casa_nome || "Casa"}
        </div>
      </div>

      {/* VS centrato */}
      <div style={styles.vsCentered}>VS</div>

      {/* Squadra Ospite */}
      <div style={{ ...styles.teamSide, justifyContent: "center" }}>
        {match.squadra_ospite_logo && (
          <img
            src={match.squadra_ospite_logo}
            alt={match.squadra_ospite_nome || "Ospite"}
            style={styles.teamLogo}
          />
        )}

        <div style={{ ...styles.teamName, textAlign: "center" }}>
          {match.squadra_ospite_nome || "Ospite"}
        </div>
      </div>

    </div>
  </div>

  {isTodayMatch ? (
    <div style={styles.liveHint}>
      La partita è oggi. In attesa del calcio d’inizio…{" "}
      <Link to="/prossima-partita">Vai a ProssimaPartita</Link>
    </div>
  ) : (
    <div style={styles.liveHint}>
      <Link
        to="/calendario"
        className="text-red-600 hover:text-red-800 transition text-lg font-semibold"
      >
        Vai al calendario
      </Link>
    </div>
  )}
</>
)}


{/* MAPPA CAMPO (preferisci URL già salvati) */}
{match && (
  <div style={{ marginTop: 12, ...styles.wideCard }}>

    {(() => {
      // priorità: URL mappa della squadra OSPITANTE (campo) > CASA > OSPITE
      const urlDiretto =
        match.ospitante_mappa_url ||
        match.casa_mappa_url ||
        match.ospite_mappa_url ||
        null;

      // fallback: costruisco una query testuale
      const queryFallback =
        match.ospitante_nome_stadio ||
        match.ospitante_indirizzo ||
        match.squadra_ospitante_nome ||
        match.casa_nome_stadio ||
        match.casa_indirizzo ||
        match.squadra_casa_nome ||
        "Montecarlo";

      let src: string;

if (urlDiretto) {
  if (urlDiretto.includes("/embed")) {
    // già embed → ok
    src = urlDiretto;
  } else if (urlDiretto.includes("google.com/maps")) {
    // link normale → estraggo query
    src = `https://www.google.com/maps?q=${encodeURIComponent(queryFallback)}&output=embed`;
  } else {
    src = `https://www.google.com/maps?q=${encodeURIComponent(queryFallback)}&output=embed`;
  }
} else {
  src = `https://www.google.com/maps?q=${encodeURIComponent(queryFallback)}&output=embed`;
}

      return (
        <iframe
          title="Mappa campo"
          src={src}
          width="100%"
          height="250"
          style={{
  border: 0,
  borderRadius: 14,
  boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
}}
          loading="lazy"
          allowFullScreen
        ></iframe>
      );
    })()}
  </div>
)}



    </div>
  )}
</section>
{/* METEO PREVISTO */}
{match && (
  <div style={{ marginBottom: 24 }}>
    <WeatherWidget_OpenMeteo
      latitude={match.ospitante_lat}
      longitude={match.ospitante_lon}
      fallbackLat={match.casa_lat}
      fallbackLon={match.casa_lon}
      luogo={match.squadra_ospitante_nome || match.squadra_casa_nome}
    />
  </div>
)}

{/* FACEBOOK – plugin ufficiale */}
<section
  style={{
    ...styles.card,
    ...styles.wideCard,
    background: "rgba(255,255,255,0.50)",
  }}
>
  <div style={styles.fbWrap}>
    <iframe
      title="Facebook Montecarlo"
      src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fsansalvatore.calcio&tabs=timeline&width=340&height=600&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=true"
      style={{
        border: "none",
        overflow: "hidden",
        width: "100%",        // ✅ si adatta al container
        height: "600px",      // ✅ puoi variare se vuoi più compatto
        borderRadius: "14px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
      }}
      scrolling="no"
      frameBorder="0"
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
    ></iframe>
  </div>
</section>



    </div>
  );
}

// ---------------------------
// Helpers
// ---------------------------
function isPastDayMonth(now: Date, candidate: Date): boolean {
  const nowMonth = now.getMonth();
  const nowDay = now.getDate();
  const cMonth = candidate.getMonth();
  const cDay = candidate.getDate();
  if (cMonth < nowMonth) return true;
  if (cMonth > nowMonth) return false;
  return cDay < nowDay;
}
function sameDayMonth(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isSameCalendarDay(a: Date | string, b: Date | string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}
function sortPlayers<T extends { cognome: string; nome: string }>(arr: T[]) {
  return [...arr].sort((p1, p2) => {
    const c = (p1.cognome || "").localeCompare(p2.cognome || "", "it", { sensitivity: "base" });
    if (c !== 0) return c;
    return (p1.nome || "").localeCompare(p2.nome || "", "it", { sensitivity: "base" });
  });
}
function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function formatItalianDate(d: Date) { return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`; }
function formatItalianTime(d: Date) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function formatItalianDateTime(d: Date) {
  return `${formatItalianWeekday(d)} ${formatItalianDate(d)} — ${formatItalianTime(d)}`;
}
function formatItalianWeekday(d: Date) {
  const days = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  return days[d.getDay()];
}
function capitalizeSafe(v: string) { if (!v) return v; const s = v.toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------------------------
// Sfondo dinamico compleanni
// ---------------------------
function getBirthdayBackground(targetDate: Date, now: Date) {
  const diffDays = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // 🎂 Giorno del compleanno → immagine torta
  if (isSameCalendarDay(now, targetDate) || diffDays <= 0.3) {
    return {
      backgroundImage: "url('/Images/Torta.jpeg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      color: "white",
      textShadow: "1px 1px 4px rgba(0,0,0,0.8)",
      transition: "background 0.6s ease-in-out",
    };
  }

  // ☀️ Nei 5 giorni precedenti → gradiente caldo
  if (diffDays > 0.3 && diffDays <= 5) {
    return {
      background: "linear-gradient(135deg, #ffe8a1, #ffc271)",
      color: "#4b2e05",
      transition: "background 0.6s ease-in-out",
    };
  }

  // 🎈 Altrimenti → sfondo neutro
  return {
  background: "rgba(255,255,255,0.0,25)",
  color: "black",
  transition: "background 0.6s ease-in-out",
};
}


// ---------------------------
// Stili
const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 980,
    minHeight: "100vh",
    margin: "0 auto",
    padding: "2px",
    paddingTop: 0,
    paddingBottom: 24,
   background: "rgba(0,0,0,0.55)",
    fontFamily:
      "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },

birthdayPlayerBox: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  marginBottom: 8,
  width: "100%",
},

birthdayPhoto: {
  width: 96,
  height: 96,
  borderRadius: "50%",
  objectFit: "cover",
  border: "4px solid #dc2626",
  boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
  marginBottom: 10, // ⬅️ spazio tra foto e nome
},

birthdayTodayBox: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  width: "100%",
  padding: "20px 0",
},

birthdayTodayText: {
  fontSize: 32,
  fontWeight: 800,
  color: "white",
  textShadow: "2px 2px 6px rgba(0,0,0,0.9)",
  textAlign: "center",
  marginBottom: 25, // distanzia dal logo
  letterSpacing: 0.3,
},


birthdayFullBox: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  width: "100%",
  minHeight: 220,
  padding: "20px 10px",
},

birthdayNamesCentered: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
},

debugMarquee: {
  outline: "3px solid red",
  background: "rgba(255,0,0,0.1)",
},

teamsRowColumn: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  marginTop: 8,
},
teamSide: {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  minHeight: 58,
  padding: "8px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.88)",
  borderLeft: "4px solid #dc2626",
  boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
},
vsCentered: {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  height: 38,
  borderRadius: "50%",
  fontSize: 11,
  fontWeight: 800,
  color: "white",
  background: "linear-gradient(135deg, #202020, #454545)",
  boxShadow: "0 4px 10px rgba(0,0,0,0.30)",
  textAlign: "center",
},
wideCard: {
  width: "99%",                // 🔹 occupa il 96% del container, lasciando un po’ di respiro ai lati
  marginLeft: "auto",          // 🔹 centrata
  marginRight: "auto",
  borderRadius: 14,
  display: "block",
  boxSizing: "border-box",
},

tempoItem: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  padding: "8px 6px",
  borderRadius: 10,
  background: "#f1f1f1",
  border: "1px solid #e2e2e2",
},

tempoLabel: {
  fontWeight: 700,
  fontSize: 13,
  color: "#555555",
},

tempoValue: {
  fontWeight: 800,
  fontSize: 18,
  color: "#dc2626",
},




  // HERO
  // 1. HERO
header: {
  marginBottom: 16,
  paddingTop: 8,
  paddingBottom: 8,
},

heroRow: {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transform: "translateY(10px)",
},

heroLines: {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 22,
},

heroLine: {
  width: "100%",
  height: 4,
  background: "#e31b23",
},

heroCenter: {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  flexShrink: 0,
},

heroLogo: {
  width: 48,
  height: 48,
  objectFit: "contain",
  filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.45))",
},

heroTitle: {
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
  fontSize: 27,
  fontWeight: 400,
  lineHeight: 1,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  textShadow: "0 2px 5px rgba(0,0,0,0.45)",
},

heroTitleRed: {
  color: "#e31b23",
},

heroTitleWhite: {
  color: "#ffffff",
},



   // Cards
  card: {
  background: "linear-gradient(135deg, #ffffff 0%, #fafafa 55%, #eeeeee 100%)",
  border: "1px solid rgba(255,255,255,0.35)",
  borderLeft: "4px solid #dc2626",
  borderRadius: 16,
  padding: 20,                        // ⬅️ aumentato
  marginBottom: 14,
  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  display: "flex",                    // ⬅️ centraggio contenuti
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
},
  cardLarge: {
    paddingTop: 18,
    paddingBottom: 18,
  },

  // Notizie (ingrandite)
  // 🔹 Sezione notizie / marquee
  newsCard: {
    position: "relative",
    width: "100%",
    minHeight: 78,
    marginBottom: 14,
    padding: "0 14px 0 54px",
    display: "flex",
    alignItems: "center",
    boxSizing: "border-box",
    overflow: "hidden",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.22)",
    borderLeft: "5px solid #e31b23",
    background: "linear-gradient(135deg, #1d1d1d 0%, #2b2b2b 100%)",
    boxShadow: "0 8px 22px rgba(0,0,0,0.38)",
  },

  newsQuote: {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: "translateY(-42%)",
    color: "#e31b23",
    fontFamily: "Georgia, serif",
    fontSize: 52,
    fontWeight: 900,
    lineHeight: 1,
  },

  newsStrip: {
    position: "relative",
    display: "block",
    overflow: "hidden",
    width: "100%",
    height: 42,
  },

  marqueeMask: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    height: 42,
    background: "transparent", // ✅ sfondo trasparente
    zIndex: 10,
  },

  marqueeTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    willChange: "transform",
    animation: "scrollLeft 40s linear infinite", // ✅ movimento fluido
    height: 42,
    lineHeight: "42px",
    color: "white", // ✅ visibile
    fontFamily: "'Arial Narrow', 'Roboto Condensed', Arial, sans-serif",
fontSize: 18,
fontWeight: 700,
letterSpacing: 0.2,
    paddingLeft: "100%",        // ✅ parte da destra
    width: "max-content",       // ✅ adatta al testo
    zIndex: 20,
  },

  newsItem: {
    marginRight: 32,
    fontSize: 18,
    color: "white",
  },

  dot: {
    marginRight: 32,
    opacity: 0.55,
    fontSize: 18,
    color: "#e31b23",
  },


  // Compleanni
  blockHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  emoji: { fontSize: 20 },
  blockTitle: { margin: 0, fontSize: 18 },
  birthdayRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  timerBox: { minWidth: 260 },
  timerBig: {
  width: "100%",
  minHeight: 40,
  display: "flex",
  alignItems: "baseline",
  justifyContent: "center",
  gap: 6,
  flexWrap: "wrap",
  fontFamily: "'Arial Narrow', 'Roboto Condensed', Arial, sans-serif",
  textAlign: "center",
},

timerNumber: {
  fontSize: 25,
  fontWeight: 900,
  color: "#dc2626",
  lineHeight: 1,
},

timerLabel: {
  marginRight: 5,
  fontSize: 14,
  fontWeight: 800,
  color: "#202020",
  letterSpacing: 0.3,
},

birthdayCountdownBox: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  width: "100%",
  gap: 6,
  minHeight: 200, // centraggio verticale migliore
},


birthdayDate: {
  fontFamily: "'Arial Narrow', 'Roboto Condensed', Arial, sans-serif",
  fontSize: 20,
  fontWeight: 800,
  color: "#202020",
  textShadow: "none",
  marginBottom: 10,
  paddingBottom: 7,
  borderBottom: "2px solid #dc2626",
  letterSpacing: 0.3,
},


  timerHint: { fontSize: 14, opacity: 0.7 },
  birthdayNames: { flex: 1, minWidth: 220 },
 playerName: {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: 21,
  fontWeight: 400,
  lineHeight: 1.2,
  textAlign: "center",
  textShadow: "none",
},

playerSurname: {
  color: "#dc2626",
  fontWeight: 400,
},

playerFirstName: {
  color: "#202020",
  fontWeight: 400,
},
  playerNameMuted: { fontSize: 14, opacity: 0.8 },

  // Facebook (senza intestazione)
  fbWrap: {
  width: "100%",
  height: 600,
  borderRadius: 14,
}, // tolto overflow:hidden
fbIframe: { width: "100%", height: "100%", border: "none" },

  // Prossimo Impegno
  fixtureBox: {},
  fixtureMetaCentered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
  },
  badge: {
    fontSize: 13,
    fontWeight: 700,
    color: "white",
    background: "linear-gradient(90deg, #dc2626, #991b1b)",
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 999,
    padding: "5px 12px",
    boxShadow: "0 3px 8px rgba(0,0,0,0.20)",
  },
  fixtureDate: {
  fontSize: 15,
  fontWeight: 700,
  color: "#202020",
  opacity: 0.95,
},

 timerInlineBox: {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6, // leggermente più spazio
  marginTop: 6,
},
timerValue: {
  fontFamily: "monospace",
  fontSize: 20,     // ⬆️ aumentato da 14 → 20
  fontWeight: 800,  // ⬆️ leggermente più bold
  color: "red",
},
timerSeparator: {
  fontSize: 18,     // ⬆️ aumentato per bilanciare
  opacity: 0.7,
},



  teamsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  teamCol: { flex: 1, textAlign: "center" as const },
  teamHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  teamLogo: {
  width: 48,
  height: 48,
  objectFit: "contain",
},
teamName: {
  fontSize: 17,
  fontWeight: 800,
  color: "#202020",
},
  scoreBubble: { marginLeft: 6, fontSize: 14, fontWeight: 700, opacity: 0.8 },
  vs: { fontSize: 16, opacity: 0.7, minWidth: 50, textAlign: "center" as const },
  liveHint: {
  marginTop: 10,
  fontSize: 13,
  fontWeight: 600,
  color: "#555555",
  opacity: 1,
},

  livePillInline: {
    display: "inline-block",
    marginLeft: 8,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#ffebeb",
    border: "1px solid #ffd2d2",
    fontSize: 12,
    fontWeight: 700,
    color: "#c00",
  },

  liveScoreRow: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
  },
  liveScore: { fontSize: 26, fontWeight: 800 },

  livePill: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    background: "#ffebeb",
    border: "1px solid #ffd2d2",
    fontSize: 12,
    fontWeight: 700,
  },

  // Struttura LIVE personalizzata
  teamsLiveRow: {
    display: "flex",
    flexDirection: "column", // <-- verticale invece che affiancate
    gap: 14,
    marginTop: 12,
  },

  teamLiveCol: {
    flex: 1,
    padding: "12px",
    borderRadius: 12,
    background: "linear-gradient(135deg, #ffffff 0%, #f7f7f7 100%)",
    borderLeft: "4px solid #dc2626",
    boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
  },
  teamLiveHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  liveScoreBlink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 42,
    height: 42,
    padding: "0 10px",
    borderRadius: 10,
    fontSize: 22,
    fontWeight: 800,
    color: "white",
    background: "linear-gradient(135deg, #dc2626, #991b1b)",
    boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
    animation: "blink 1s linear infinite",
  },

  scorersWrapper: {
    marginTop: 10,
    borderTop: "1px solid rgba(0,0,0,0.10)",
    paddingTop: 10,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
  scorerCol: {},
  scorersTitle: { fontSize: 13, fontWeight: 700, marginBottom: 6 },
  scorersUl: { margin: 0, paddingLeft: 16 },
  scorerItem: {
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.4,
    whiteSpace: "nowrap",
    display: "inline-block",
    color: "#202020",
  },
  scorersListMuted: { fontSize: 12, opacity: 0.7 },

  perTimeRow: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    gap: 8,
    fontSize: 12,
    opacity: 1,
  },

  actions: { marginTop: 10, textAlign: "center" as const },
  linkBtn: {
    display: "inline-block",
    padding: "9px 16px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg, #dc2626, #991b1b)",
    color: "white",
    fontWeight: 700,
    textDecoration: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
  },
};

// Animazioni CSS (marquee + blink)
const styleEl = document.getElementById("home-inline-anim");
if (!styleEl) {
  const s = document.createElement("style");
  s.id = "home-inline-anim";
  s.innerHTML = `
@keyframes scrollLeft {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

.blink {
  animation: blink 1s linear infinite;
}

/* Classe base per il testo scorrevole */
.marqueeTrack {
  animation: scrollLeft 40s linear infinite;
  white-space: nowrap;
  will-change: transform;
}

/* Pausa animazione quando l'utente passa sopra o tocca */
.marqueeTrack:hover,
.marqueeTrack.paused {
  animation-play-state: paused;
}
`;
  document.head.appendChild(s);
}
