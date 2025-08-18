// src/pages/HomePage.tsx
// Data creazione file: 17/08/2025 (rev: fix UI + logica compleanni stagione corrente + fix marcatori inline)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

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
  giocatore_nome: string | null;
  giocatore_cognome: string | null;
  data_nascita: string | null; // date
  foto_url: string | null;
};

type NextBirthdayInfo = {
  date: Date; // prossima occorrenza (anno corrente o prossimo)
  players: { uid: string; nome: string; cognome: string; foto_url: string | null }[];
};

type SquadraLite = {
  id?: string;
  nome: string | null;
  logo_url: string | null;
};

type PartitaLite = {
  id: string;
  data_ora: string; // timestamptz
  stato: "Giocata" | "DaGiocare" | "InCorso";
  campionato_torneo: "Campionato" | "Torneo" | "Amichevole" | string;
  squadra_casa_id: string;
  squadra_ospite_id: string;
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
  squadra_casa?: SquadraLite | null;
  squadra_ospite?: SquadraLite | null;
  stagione_id?: string;
};

type Marcatore = {
  id: string;
  periodo: number;
  giocatore_uid: string;
  partita_id: string;
  stagione_id: string;
  nome?: string;
  cognome?: string;
};

type GiocatoreStagione = {
  record_id: string;
  giocatore_uid: string;
  nome: string;
  cognome: string;
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
const PAGE_URL: string = "https://www.facebook.com/sansalvatore.calcio/?locale=it_IT";
const SEARCH_URL =
  "https://www.facebook.com/search/top?q=montecarlo%20calcio%202018&locale=it_IT";
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

      // 2) elenco uid dei giocatori della stagione
      const { data: gs, error: egs } = await supabase
        .from("giocatori_stagioni")
        .select("giocatore_uid,nome,cognome")
        .eq("stagione_id", stagioneCorrente.id);

      if (egs) {
        console.error("[HomePage] Errore giocatori_stagioni:", egs.message);
        if (mounted) setNextBirthday(null);
        return;
      }

      const seasonUids = new Set<string>((gs || []).map((r: any) => String(r.giocatore_uid)));
      if (!seasonUids.size) {
        if (mounted) setNextBirthday(null);
        return;
      }

      // 3) prendo solo quei giocatori dalla view completa (serve data_nascita)
      const { data, error } = await supabase
        .from("v_giocatori_completo")
        .select("giocatore_uid,giocatore_nome,giocatore_cognome,data_nascita,foto_url")
        .not("data_nascita", "is", null);

      if (error) {
        console.error("[HomePage] Errore caricamento compleanni:", error.message);
        if (mounted) setNextBirthday(null);
        return;
      }

      const rows = ((data || []) as GiocatoreView[]).filter((r) =>
        seasonUids.has(String(r.giocatore_uid))
      );

      const today = new Date();
      const y = today.getFullYear();

      let bestDate: Date | null = null;
      let playersForBest: NextBirthdayInfo["players"] = [];

      // set per evitare duplicati (uid o nome+cognome)
      const seen = new Set<string>();

      for (const r of rows) {
        if (!r.data_nascita) continue;

        const key = r.giocatore_uid || `${r.giocatore_nome}|${r.giocatore_cognome}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const d = new Date(r.data_nascita);
        const month = d.getMonth();
        const day = d.getDate();

        let next = new Date(y, month, day, 0, 0, 0, 0);
        if (isPastDayMonth(today, next)) next = new Date(y + 1, month, day, 0, 0, 0, 0);

        const plInfo = {
          uid: r.giocatore_uid,
          nome: (r.giocatore_nome || "").trim(),
          cognome: (r.giocatore_cognome || "").trim(),
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
  const [giocatoriStagione, setGiocatoriStagione] = useState<GiocatoreStagione[]>([]);

  const [perTimeCasa, setPerTimeCasa] = useState<number[]>([0, 0, 0, 0]);
  const [perTimeOspite, setPerTimeOspite] = useState<number[]>([0, 0, 0, 0]);

  useEffect(() => {
    let mounted = true;

    const loadNextMatch = async () => {
      setLoadingMatch(true);
      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from("partite")
        .select(`
    id, data_ora, stato, campionato_torneo, squadra_casa_id, squadra_ospite_id, stagione_id,
    goal_a, goal_b, goal_a1, goal_a2, goal_a3, goal_a4,
    goal_b1, goal_b2, goal_b3, goal_b4,
    squadra_casa:squadre!partite_squadra_casa_id_fkey(id,nome,logo_url),
    squadra_ospite:squadre!partite_squadra_ospite_id_fkey(id,nome,logo_url)
  `)
        .or("stato.eq.InCorso,stato.eq.DaGiocare")
        .order("stato", { ascending: true })
        .order("data_ora", { ascending: true })
        .limit(1);

      if (!mounted) return;

      if (error) {
        console.error("[HomePage] Errore prossima partita:", error.message);
        setMatch(null);
        setLoadingMatch(false);
        return;
      }

      const next = (data?.[0] as PartitaLite) || null;

      if (next) {
        setMatch(next);
        setPerTimeCasa([next.goal_a1, next.goal_a2, next.goal_a3, next.goal_a4]);
        setPerTimeOspite([next.goal_b1, next.goal_b2, next.goal_b3, next.goal_b4]);
      } else {
        setMatch(null);
      }
      setLoadingMatch(false);

      // Sottoscrizione realtime
      if (next) {
        const ch = supabase
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

        return () => {
          supabase.removeChannel(ch);
        };
      }
    };

    const cleanup = loadNextMatch();
    return () => {
      mounted = false;
      if (cleanup && typeof cleanup === "function") cleanup();
    };
  }, []);

  // carico i marcatori direttamente dalla view marcatori_alias
  useEffect(() => {
    if (!match) return;

    (async () => {
      const { data, error } = await supabase
        .from("marcatori_alias")
        .select(
          "id, periodo, goal_tempo, giocatore_uid, giocatore_stagione_id, partita_id, stagione_id, giocatore_nome, giocatore_cognome"
        )
        .eq("partita_id", match.id)
        .order("periodo", { ascending: true });

    if (error) {
      console.error("[HomePage] Errore marcatori init:", error.message);
      setMarcatoriLive([]);
      return;
    }

    const norm = (data || []).map((row: any) => normalizeMarcatore(row));
    setMarcatoriLive(norm);
  })();
}, [match?.id]);

// realtime su marcatori_alias
useEffect(() => {
  if (!match) return;

  const ch2 = supabase
    .channel(`realtime-marcatori-${match.id}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "marcatori", filter: `partita_id=eq.${match.id}` },
      ({ new: row }) => {
        const n = normalizeMarcatore(row);
        setMarcatoriLive((prev) => [...prev, n]);
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "marcatori", filter: `partita_id=eq.${match.id}` },
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
      { event: "DELETE", schema: "public", table: "marcatori", filter: `partita_id=eq.${match.id}` },
      ({ old }) => {
        setMarcatoriLive((prev) => prev.filter((m) => m.id !== String(old.id)));
      }
    )
    .subscribe();

  return () => supabase.removeChannel(ch2);
}, [match?.id]);

// normalizzazione marcatore con nome e cognome
const normalizeMarcatore = (row: any): Marcatore => ({
  id: String(row.id),
  periodo: Number(row.periodo ?? row.goal_tempo ?? 1),
  giocatore_uid: String(row.giocatore_uid ?? row.giocatore_stagione_id ?? ""),
  partita_id: String(row.partita_id),
  stagione_id: String(row.stagione_id),
  nome: row.giocatore_nome || "",
  cognome: row.giocatore_cognome || "",
});

const isLive = match?.stato === "InCorso";
const isTodayMatch = match ? isSameCalendarDay(new Date(match.data_ora), new Date()) : false;

const mcSide: "casa" | "ospite" | null = useMemo(() => {
  if (!match) return null;
  const casa = (match.squadra_casa?.nome || "").toLowerCase();
  const osp = (match.squadra_ospite?.nome || "").toLowerCase();
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

// usa direttamente nome e cognome dalla view
const renderNomeMarcatore = (m: Marcatore) => {
  return `${m.cognome} ${m.nome}`.trim();
};

const fbPluginSrc = useMemo(() => {
  if (!PAGE_URL) return null;
  const base = "https://www.facebook.com/plugins/page.php";
  const params = new URLSearchParams({
    href: PAGE_URL,
    tabs: "timeline",
    width: "500",
    height: "560",
    small_header: "true",
    adapt_container_width: "true",
    hide_cover: "true",
    show_facepile: "false",
    appId: "",
  });
  return `${base}?${params.toString()}`;
}, []);

  // --------------------------------
  // RENDER
  // --------------------------------
  return (
  <div style={styles.page}>
    {/* HERO HEADER: logo + titolo centrati */}
    <header style={styles.header}>
  <div style={{ position: "relative", textAlign: "center" }}>
    {/* Bande rosse dietro lo stemma */}
    <div style={{
      position: "absolute",
      top: "50%",
      left: 0,
      right: 0,
      transform: "translateY(-50%)",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      zIndex: 1
    }}>
      <div style={{ height: "6px", backgroundColor: "red" }}></div>
      <div style={{ height: "6px", backgroundColor: "red" }}></div>
      <div style={{ height: "6px", backgroundColor: "red" }}></div>
    </div>

    {/* Logo + Titolo sopra */}
    <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <img
        src="/montecarlo.png"
        alt="Stemma Montecarlo"
        style={styles.heroLogo}
      />
      <h1 style={styles.heroTitle}>Montecarlo 2013</h1>
    </div>
  </div>
</header>

      {/* NOTIZIE */}
      <section style={{ ...styles.card, ...styles.cardLarge }}>
  <div style={styles.newsStrip}>
    <div style={styles.marqueeMask}>
      <div
        ref={newsTrackRef}
        style={styles.marqueeTrack}
        className="marqueeTrack"   // <--- aggiunta qui
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

      {/* COMPLEANNO GIOCATORE */}
      <section style={styles.card}>
        <div style={styles.blockHeader}>
          <h2 style={styles.blockTitle}>
            Prossimo Compleanno
            {nextBirthday && (
              <span style={styles.blockDate}>
                {" "}— {formatItalianDate(nextBirthday.date)}
              </span>
            )}
          </h2>
        </div>

        {nextBirthday ? (
          <div style={styles.birthdayRow}>
            <div style={styles.timerBox}>
              <div style={styles.timerBig}>
                {(() => {
                  if (!nextBirthday) return "-";
                  const target = nextBirthday.date;
                  const now = nowTick;
                  const diffMs = target.getTime() - now.getTime();
                  if (isSameCalendarDay(now, target) || diffMs <= 0) return "Oggi 🎉";
                  const totalMinutes = Math.floor(diffMs / 60000);
                  const days = Math.floor(totalMinutes / (60 * 24));
                  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
                  const minutes = totalMinutes % 60;
                  return `- ${days} ${days === 1 ? "Giorno" : "Giorni"}, ${hours} ${hours === 1 ? "Ora" : "Ore"}, ${minutes} Min`;
                })()}
              </div>
            </div>

            <div style={styles.birthdayNames}>
              {nextBirthday.players.map((p) => (
                <div key={p.uid} style={styles.playerName}>
                  {(p.cognome || "").trim()} {(p.nome || "").trim()}
                </div>
              ))}
            </div>
          </div>
        ) : (
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
      <section style={styles.card}>
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
              <span style={styles.fixtureDate}>
                {formatItalianDateTime(new Date(match.data_ora))}
              </span>
            </div>

            {isLive ? (
              <>
                {/* Struttura Live */}
                <div style={styles.teamsLiveRow}>
                  {/* Squadra Casa */}
                  <div style={styles.teamLiveCol}>
                    <div style={styles.teamLiveHead}>
                      {match.squadra_casa?.logo_url && (
                        <img
                          src={match.squadra_casa.logo_url}
                          alt={match.squadra_casa?.nome || "Casa"}
                          style={styles.teamLogo}
                        />
                      )}
                      <div style={styles.teamName}>{match.squadra_casa?.nome || "Casa"}</div>
                      <span style={styles.liveScoreBlink}>{match.goal_a}</span>
                    </div>

                    {mcSide === "casa" ? (
                      <div style={styles.scorersWrapper}>
                        {Object.entries(marcatoriByPeriodo).map(([periodo, lista]) => (
                          <div key={periodo}>
                            <strong>{periodo}° Tempo</strong>
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
                        <div>1T: {perTimeCasa[0]}</div>
                        <div>2T: {perTimeCasa[1]}</div>
                        <div>3T: {perTimeCasa[2]}</div>
                        <div>4T: {perTimeCasa[3]}</div>
                      </div>
                    )}
                  </div>

                  {/* Squadra Ospite */}
                  <div style={styles.teamLiveCol}>
                    <div style={styles.teamLiveHead}>
                      {match.squadra_ospite?.logo_url && (
                        <img
                          src={match.squadra_ospite.logo_url}
                          alt={match.squadra_ospite?.nome || "Ospite"}
                          style={styles.teamLogo}
                        />
                      )}
                      <div style={styles.teamName}>{match.squadra_ospite?.nome || "Ospite"}</div>
                      <span style={styles.liveScoreBlink}>{match.goal_b}</span>
                    </div>

                    {mcSide === "ospite" ? (
                      <div style={styles.scorersWrapper}>
                        {Object.entries(marcatoriByPeriodo).map(([periodo, lista]) => (
                          <div key={periodo}>
                            <strong>{periodo}° Tempo</strong>
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
                        <div>1T: {perTimeOspite[0]}</div>
                        <div>2T: {perTimeOspite[1]}</div>
                        <div>3T: {perTimeOspite[2]}</div>
                        <div>4T: {perTimeOspite[3]}</div>
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
              /* Struttura normale se non è in corso */
              <>
                <div style={styles.teamsRow}>
                  <div style={styles.teamCol}>
                    <div style={styles.teamHead}>
                      {match.squadra_casa?.logo_url && (
                        <img
                          src={match.squadra_casa.logo_url}
                          alt={match.squadra_casa?.nome || "Casa"}
                          style={styles.teamLogo}
                        />
                      )}
                      <div style={styles.teamName}>{match.squadra_casa?.nome || "Casa"}</div>
                    </div>
                  </div>

                  <div style={styles.vs}>vs</div>

                  <div style={styles.teamCol}>
                    <div style={styles.teamHead}>
                      {match.squadra_ospite?.logo_url && (
                        <img
                          src={match.squadra_ospite.logo_url}
                          alt={match.squadra_ospite?.nome || "Ospite"}
                          style={styles.teamLogo}
                        />
                      )}
                      <div style={styles.teamName}>{match.squadra_ospite?.nome || "Ospite"}</div>
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
                    <Link to="/calendario">Vai al calendario</Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* FACEBOOK – senza intestazione */}
      <section style={styles.card}>
        {fbPluginSrc ? (
          <div style={styles.fbWrap}>
            <iframe
              title="Pagina Facebook Montecarlo"
              style={styles.fbIframe}
              src={fbPluginSrc}
              scrolling="no"
              allow="encrypted-media; clipboard-write; picture-in-picture; web-share"
            />
          </div>
        ) : (
          <div style={styles.fbWrap}>
            <iframe
              title="Montecarlo Calcio Facebook (ricerca)"
              style={styles.fbIframe}
              src={SEARCH_URL}
            />
          </div>
        )}
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
// Stili
const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "16px",
    fontFamily:
      "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },

  // HERO
  header: {
    marginBottom: 16,
  },
  heroInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  heroLogo: {
    width: 65,
    height: 65,
    objectFit: "contain",
  },
  heroTitle: {
    margin: 0,
    fontSize: 35,
    fontWeight: 600, // meno bold
    color: "white",
    letterSpacing: 0.3,
  },

  // Cards
  card: {
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  cardLarge: {
    paddingTop: 18,
    paddingBottom: 18,
  },

  // Notizie (ingrandite)
  newsStrip: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  marqueeMask: {
    position: "relative",
    overflow: "hidden",
    flex: 1,
    height: 40, // più alto
  },
  marqueeTrack: {
  position: "absolute",
  whiteSpace: "nowrap",
  willChange: "transform",
  animation: "scrollLeft 20s linear infinite",
  height: "40px",
  display: "flex",
  alignItems: "center",
},
  newsItem: { marginRight: 24, fontSize: 18 }, // testo più grande
  dot: { marginRight: 24, opacity: 0.5, fontSize: 18 },

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
  timerBig: { fontSize: 20, fontWeight: 600 },
  timerHint: { fontSize: 14, opacity: 0.7 },
  birthdayNames: { flex: 1, minWidth: 220 },
  playerName: { fontSize: 24, fontWeight: 700, textAlign: "center" },
  playerNameMuted: { fontSize: 14, opacity: 0.8 },

  // Facebook (senza intestazione)
  fbWrap: { width: "100%", height: 600, overflow: "hidden", borderRadius: 8 },
  fbIframe: { width: "100%", height: "100%", border: "none" },

  // Prossimo Impegno
  fixtureBox: {},
  fixtureMetaCentered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    fontSize: 13,
    background: "#f0ff66f8",
    border: "1px solid #eee",
    borderRadius: 6,
    padding: "4px 10px",
  },
  fixtureDate: { fontSize: 15, opacity: 0.9 },

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
  teamLogo: { width: 32, height: 32, objectFit: "contain" },
  teamName: { fontSize: 20, fontWeight: 700 },
  scoreBubble: { marginLeft: 6, fontSize: 14, fontWeight: 700, opacity: 0.8 },
  vs: { fontSize: 16, opacity: 0.7, minWidth: 50, textAlign: "center" as const },
  liveHint: { marginTop: 8, fontSize: 12, opacity: 0.7 },

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
    gap: 20,
    marginTop: 10,
  },

  teamLiveCol: { flex: 1 },
  teamLiveHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  liveScoreBlink: {
    fontSize: 22,
    fontWeight: 800,
    color: "red",
    animation: "blink 1s linear infinite",
  },

  scorersWrapper: {
    marginTop: 10,
    borderTop: "1px dashed #eee",
    paddingTop: 8,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
  scorerCol: {},
  scorersTitle: { fontSize: 13, fontWeight: 700, marginBottom: 6 },
  scorersUl: { margin: 0, paddingLeft: 16 },
  scorerItem: {
    fontSize: 13,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    display: "inline-block",
  },
  scorersListMuted: { fontSize: 12, opacity: 0.7 },

  perTimeRow: {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: 6,
    fontSize: 12,
    opacity: 0.85,
  },

  actions: { marginTop: 10, textAlign: "center" as const },
  linkBtn: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e5e5",
    textDecoration: "none",
  },
};

// Animazioni CSS (marquee + blink)
const styleEl = document.getElementById("home-inline-anim");
if (!styleEl) {
  const s = document.createElement("style");
  s.id = "home-inline-anim";
  s.innerHTML = `
@keyframes scrollLeft {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: .25; }
}
.blink {
  animation: blink 1s linear infinite;
}

/* pausa marquee quando utente tiene sopra il cursore o seleziona */
.marqueeTrack:hover {
  animation-play-state: paused;
}
`;
  document.head.appendChild(s);
}
