// src/pages/AllenamentiNuovo.tsx
// Data revisione: 27/10/2025 (fix definitivo hook order)

import React, { useState, useEffect } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { UserRole } from "../lib/roles";

interface Giocatore {
  id: string;
  nome: string;
  cognome: string;
}

interface Stagione {
  id: string;
  nome: string;
  data_inizio: string;
  data_fine: string;
}

// =========================
// 1. COMPONENTE
// =========================

export default function AllenamentiNuovo(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const dateParam = searchParams.get("data");
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(dateParam ?? today);
  const [players, setPlayers] = useState<Giocatore[]>([]);
  const [selections, setSelections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [seasons, setSeasons] = useState<Stagione[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");

  // =========================
  // 2. RUOLO UTENTE
  // =========================

  // Ruolo coerente con SidebarLayout
  const [role, setRole] = useState<UserRole>(UserRole.Authenticated);
  const [roleLoading, setRoleLoading] = useState(true);

  // ✅ Carica ruolo da user_profiles
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

  const weekdays = [
    "Domenica",
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
  ];
  const selectedDayName = weekdays[new Date(date).getDay()];

  // =========================
  // 3. CARICAMENTO STAGIONI
  // =========================

  // Carica stagioni
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("stagioni")
        .select("id, nome, data_inizio, data_fine")
        .order("data_inizio", { ascending: false });

      if (error || !data) {
        console.error("Errore caricamento stagioni:", error);
        return;
      }

      setSeasons(data);

      const oggi = new Date().toISOString().split("T")[0];
      const attiva = data.find(
        (s) => s.data_inizio <= oggi && s.data_fine >= oggi
      );
      setSelectedSeasonId(attiva ? attiva.id : data[0]?.id ?? "");
    })();
  }, []);

  // =========================
  // 4. CARICAMENTO GIOCATORI
  // =========================

  // Carica giocatori
  useEffect(() => {
    async function load() {
      if (!selectedSeasonId) return;
      setLoading(true);

      const { data: gsData, error: gsError } = await supabase
        .from("giocatori_stagioni_view")
        .select("giocatore_uid, nome, cognome")
        .eq("stagione_id", selectedSeasonId)
        .order("cognome", { ascending: true });

      if (gsError || !gsData) {
        console.error("Errore fetch giocatori_stagioni_view:", gsError);
        setPlayers([]);
        setSelections({});
        setLoading(false);
        return;
      }

      const list = gsData.map((r) => ({
        id: r.giocatore_uid,
        nome: r.nome,
        cognome: r.cognome,
      }));

      setPlayers(list);

      const initSel: Record<string, boolean> = {};
      list.forEach((p) => {
        initSel[p.id] = false;
      });

      setSelections(initSel);
      setLoading(false);
    }
    load();
  }, [selectedSeasonId]);

  // =========================
  // 5. GESTIONE PRESENZE
  // =========================

  const togglePresenza = (id: string, presente: boolean) => {
    setSelections((prev) => ({ ...prev, [id]: presente }));
  };

  // =========================
  // 6. SALVATAGGIO
  // =========================

  const handleSave = async () => {
    const records = players.map((p) => ({
      giocatore_uid: p.id,
      data_allenamento: date,
      presente: selections[p.id] === true,
      stagione_id: selectedSeasonId,
    }));

    const { error } = await supabase.from("allenamenti").insert(records);
    if (error) {
      console.error("Salvataggio fallito", error);
      alert("Errore durante il salvataggio.");
    } else {
      navigate("/allenamenti");
    }
  };

  // =========================
  // 7. CONTROLLI ACCESSO E CARICAMENTO
  // =========================

  // ✅ RENDER FINALE SICURO (niente return prima)
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-[#252525]/90 px-6 py-4 text-lg font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          Caricamento ruolo…
        </div>
      </div>
    );
  }

  if (role !== UserRole.Admin && role !== UserRole.Creator) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-[#252525]/90 px-6 py-4 text-lg font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          Caricamento dati…
        </div>
      </div>
    );
  }

  // =========================
  // 8. RENDER
  // =========================

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] px-2 py-4">
      <div className="max-w-2xl mx-auto overflow-hidden rounded-2xl border border-white/10 bg-[#252525]/95 shadow-[0_10px_30px_rgba(0,0,0,0.40)]">

        <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4">
          <div className="text-lg font-bold text-white">
            Nuovo Allenamento
          </div>
          <div className="mt-1 text-xs text-white/80">
            Registra le presenze dei giocatori
          </div>
        </div>

        <div className="p-4 md:p-6">
          {/* Selettore giorno, data e stagione */}
          <div className="mb-6 rounded-xl border border-white/10 bg-[#1f1f1f] p-4">
            <div className="flex flex-col md:flex-row items-center md:space-x-4 space-y-3 md:space-y-0">
              <span className="text-lg text-white font-bold">
                {selectedDayName}
              </span>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full md:w-auto rounded-xl border border-white/15 bg-[#292929] px-3 py-2 text-white shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-600/40"
              />

              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="w-full md:w-auto rounded-xl border border-white/15 bg-[#292929] px-3 py-2 text-white shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-600/40"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista giocatori */}
          <ul className="mb-6 overflow-hidden rounded-xl border border-white/10">
            {players.map((p, idx) => {
              const isPresente = selections[p.id];

              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between border-b border-white/10 px-3 py-3 last:border-b-0 ${
                    idx % 2 === 0 ? "bg-[#292929]" : "bg-[#242424]"
                  }`}
                >
                  <span className="pr-3 text-base font-bold text-white md:text-lg">
                    {p.cognome} {p.nome}
                  </span>

                  <div className="flex shrink-0 flex-col space-y-2">
                    <button
                      onClick={() => togglePresenza(p.id, true)}
                      className={`min-w-[96px] rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                        isPresente
                          ? "bg-green-600 text-white shadow"
                          : "border border-green-600/40 bg-green-600/10 text-green-400 hover:bg-green-600/20"
                      }`}
                    >
                      Presente
                    </button>

                    <button
                      onClick={() => togglePresenza(p.id, false)}
                      className={`min-w-[96px] rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                        !isPresente
                          ? "bg-red-600 text-white shadow"
                          : "border border-red-600/40 bg-red-600/10 text-red-400 hover:bg-red-600/20"
                      }`}
                    >
                      Assente
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Azioni */}
          <div className="flex justify-center space-x-4 border-t border-white/10 pt-5">
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/20 bg-[#333333] px-6 py-2.5 font-semibold text-white transition hover:bg-[#404040]"
            >
              Annulla
            </button>

            <button
              onClick={handleSave}
              className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-6 py-2.5 font-bold text-white shadow-lg transition hover:from-red-700 hover:to-red-800"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}