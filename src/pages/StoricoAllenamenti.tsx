// src/pages/StoricoAllenamenti.tsx
// Data revisione: 27/10/2025 (fix definitivo ordine hooks + ruolo da user_profiles)

import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { UserRole } from "../lib/roles";

interface PlayerRecord {
  record_id: string;
  giocatore_id: string;
  nome: string;
  cognome: string;
  presente: boolean;
}

// =========================
// 1. COMPONENTE
// =========================

export default function StoricoAllenamenti(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

  // =========================
  // 2. RUOLO UTENTE
  // =========================

  // ✅ ruolo coerente con SidebarLayout
  const [role, setRole] = useState<UserRole>(UserRole.Authenticated);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user?.id) {
        setRole(UserRole.Authenticated);
        setRoleLoading(false);
        return;
      }

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
      } else {
        const metaRole =
          (user?.user_metadata?.role as UserRole | undefined) ||
          (user?.app_metadata?.role as UserRole | undefined) ||
          UserRole.Authenticated;
        setRole(metaRole);
      }
      setRoleLoading(false);
    })();
  }, [user?.id]);

  const [dates, setDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // =========================
  // 3. CARICAMENTO DATE
  // =========================

  // Carica tutte le date allenamenti
  useEffect(() => {
    (async () => {
      setLoadingDates(true);
      const { data, error } = await supabase
        .from("allenamenti")
        .select("data_allenamento")
        .order("data_allenamento", { ascending: false });

      if (!error && data) {
        const uniq = Array.from(
          new Set(data.map((r) => r.data_allenamento.slice(0, 10)))
        );
        setDates(uniq);
      }
      setLoadingDates(false);
    })();
  }, []);

  // =========================
  // 4. CARICAMENTO GIOCATORI
  // =========================

  // Carica i giocatori della data selezionata
  useEffect(() => {
    if (!selectedDate) return;

    (async () => {
      setLoadingPlayers(true);

      const { data: allens, error: errA } = await supabase
        .from("allenamenti")
        .select("giocatore_uid, presente, stagione_id")
        .eq("data_allenamento", selectedDate);

      if (errA || !allens || allens.length === 0) {
        console.error("Errore o nessun allenamento:", errA);
        setPlayers([]);
        setLoadingPlayers(false);
        return;
      }

      const giocatoreUids = allens
        .map((a) => a.giocatore_uid)
        .filter((id): id is string => Boolean(id));

      if (giocatoreUids.length === 0) {
        setPlayers([]);
        setLoadingPlayers(false);
        return;
      }

      const stagioneId = allens[0].stagione_id;

      const { data: gs, error: errGs } = await supabase
        .from("giocatori_stagioni_view")
        .select("id, giocatore_uid, nome, cognome")
        .eq("stagione_id", stagioneId)
        .in("giocatore_uid", giocatoreUids);

      if (errGs || !gs) {
        console.error("Errore fetch giocatori_stagioni_view:", errGs);
        setPlayers([]);
        setLoadingPlayers(false);
        return;
      }

      gs.sort((a, b) => (a.cognome ?? "").localeCompare(b.cognome ?? ""));

      const presenceMap = allens.reduce<Record<string, boolean>>((acc, cur) => {
        if (cur.giocatore_uid) acc[cur.giocatore_uid] = !!cur.presente;
        return acc;
      }, {});

      setPlayers(
        gs.map((r) => ({
          record_id: r.id,
          giocatore_id: r.giocatore_uid,
          nome: r.nome,
          cognome: r.cognome,
          presente: presenceMap[r.giocatore_uid] ?? false,
        }))
      );
      setLoadingPlayers(false);
    })();
  }, [selectedDate]);

  // =========================
  // 5. NAVIGAZIONE
  // =========================

  const onDateClick = (date: string) => setSelectedDate(date);
  const onPlayerClick = (playerId: string) =>
    navigate(`/allenamenti/${playerId}`);

  // =========================
  // 6. CONTROLLI ACCESSO E CARICAMENTO
  // =========================

  // ✅ gestiamo i casi di caricamento / permessi nel render, non prima
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-[#252525]/90 px-6 py-4 font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          Caricamento ruolo…
        </div>
      </div>
    );
  }

  if (role !== UserRole.Admin && role !== UserRole.Creator) {
    return <Navigate to="/" replace />;
  }

  if (loadingDates) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-[#252525]/90 px-6 py-4 font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          Caricamento…
        </div>
      </div>
    );
  }

  // =========================
  // 7. DETTAGLIO ALLENAMENTO
  // =========================

  if (selectedDate) {
    const dt = new Date(selectedDate);
    const weekday = dt.toLocaleDateString("it-IT", { weekday: "long" });
    const dayName = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const displayDate = dt.toLocaleDateString("it-IT");

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] px-2 py-4">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#252525]/95 shadow-[0_10px_30px_rgba(0,0,0,0.40)]">

          <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4">
            <div className="text-lg font-bold text-white">
              {dayName}, {displayDate}
            </div>
            <div className="mt-1 text-xs text-white/80">
              Presenze allenamento
            </div>
          </div>

          <div className="p-4">
            {loadingPlayers ? (
              <div className="py-8 text-center font-semibold text-gray-300">
                Caricamento elenco giocatori…
              </div>
            ) : players.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-[#1f1f1f] p-6 text-center text-gray-300">
                Nessun allenamento registrato per questa data.
              </div>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-white/10">
                {players.map((p, idx) => (
                  <li
                    key={p.record_id}
                    className={`flex cursor-pointer items-center justify-between border-b border-white/10 px-4 py-3 transition last:border-b-0 hover:bg-[#383838] ${
                      idx % 2 === 0 ? "bg-[#292929]" : "bg-[#242424]"
                    }`}
                    onClick={() => onPlayerClick(p.giocatore_id)}
                  >
                    <span className="pr-3 text-base font-bold text-white">
                      {p.cognome} {p.nome}
                    </span>

                    <span
                      className={`min-w-[88px] rounded-lg px-3 py-1.5 text-center text-sm font-bold ${
                        p.presente
                          ? "bg-green-600/20 text-green-400"
                          : "bg-red-600/20 text-red-400"
                      }`}
                    >
                      {p.presente ? "Presente" : "Assente"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // 8. STORICO ALLENAMENTI
  // =========================

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] px-2 py-4">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#252525]/95 shadow-[0_10px_30px_rgba(0,0,0,0.40)]">

        <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4">
          <div className="text-lg font-bold text-white">
            Storico Allenamenti
          </div>
          <div className="mt-1 text-xs text-white/80">
            Seleziona una data per visualizzare le presenze
          </div>
        </div>

        <div className="p-4">
          {dates.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#1f1f1f] p-6 text-center text-gray-300">
              Nessuna seduta registrata.
            </div>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-white/10">
              {dates.map((date, idx) => {
                const dt = new Date(date);
                const weekday = dt.toLocaleDateString("it-IT", {
                  weekday: "long",
                });
                const dayName =
                  weekday.charAt(0).toUpperCase() + weekday.slice(1);
                const displayDate = dt.toLocaleDateString("it-IT");

                return (
                  <li
                    key={date}
                    className={`flex items-center justify-between border-b border-white/10 px-4 py-3 last:border-b-0 ${
                      idx % 2 === 0 ? "bg-[#292929]" : "bg-[#242424]"
                    }`}
                  >
                    <span
                      className="cursor-pointer pr-3 text-base font-bold text-white transition hover:text-red-400"
                      onClick={() => onDateClick(date)}
                    >
                      {dayName}, {displayDate}
                    </span>

                    <button
                      onClick={async () => {
                        if (
                          confirm(`Eliminare tutte le sedute del ${displayDate}?`)
                        ) {
                          await supabase
                            .from("allenamenti")
                            .delete()
                            .eq("data_allenamento", date);
                          setDates(dates.filter((d) => d !== date));
                        }
                      }}
                      className="rounded-lg border border-red-600/40 bg-red-600/10 px-3 py-1.5 text-sm font-bold text-red-400 transition hover:bg-red-600/20"
                    >
                      Elimina
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}