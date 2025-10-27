// src/pages/StoricoAllenamenti.tsx
// Data revisione: 27/10/2025 (fix definitivo ordine hooks + ruolo da user_profiles)

import React, { useEffect, useState } from "react";
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

export default function StoricoAllenamenti(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const onDateClick = (date: string) => setSelectedDate(date);
  const onPlayerClick = (playerId: string) =>
    navigate(`/allenamenti/${playerId}`);

  // ✅ gestiamo i casi di caricamento / permessi nel render, non prima
  if (roleLoading) return <div className="p-6 text-center">Caricamento ruolo…</div>;

  if (role !== UserRole.Admin && role !== UserRole.Creator) {
    return <Navigate to="/" replace />;
  }

  if (loadingDates) {
    return <div className="p-6 text-center">Caricamento…</div>;
  }

  if (selectedDate) {
    const dt = new Date(selectedDate);
    const weekday = dt.toLocaleDateString("it-IT", { weekday: "long" });
    const dayName = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const displayDate = dt.toLocaleDateString("it-IT");

    return (
      <div className="min-h-screen px-2">
        <h2 className="text-2xl font-semibold mb-4 text-white">
          {dayName}, {displayDate}
        </h2>

        {loadingPlayers ? (
          <div>Caricamento elenco giocatori…</div>
        ) : players.length === 0 ? (
          <div>Nessun allenamento registrato per questa data.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {players.map((p) => (
              <li
                key={p.record_id}
                className="py-3 flex justify-between hover:bg-gray-100 cursor-pointer"
                onClick={() => onPlayerClick(p.giocatore_id)}
              >
                <span className="font-medium text-lg text-white">
                  {p.cognome} {p.nome}
                </span>
                <span
                  className={`px-2 py-1 rounded bg-white/80 ${
                    p.presente ? "text-green-600" : "text-red-600"
                  } font-semibold`}
                >
                  {p.presente ? "Presente" : "Assente"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4">
      {dates.length === 0 ? (
        <div>Nessuna seduta registrata.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {dates.map((date) => {
            const dt = new Date(date);
            const weekday = dt.toLocaleDateString("it-IT", { weekday: "long" });
            const dayName =
              weekday.charAt(0).toUpperCase() + weekday.slice(1);
            const displayDate = dt.toLocaleDateString("it-IT");
            return (
              <li
                key={date}
                className="flex items-center justify-between py-2 hover:bg-gray-100"
              >
                <span
                  className="cursor-pointer text-lg font-semibold text-white"
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
                  className="text-red-600 hover:underline"
                >
                  Elimina
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
