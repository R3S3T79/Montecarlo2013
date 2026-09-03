// src/pages/Classifica.tsx
// Data: 15/11/2025 — versione corretta: aggiornamento classifica sempre via Netlify Function (anche in locale)
// REV: 12/04/2026 — aggiunti dropdown stagione + fase

import { useEffect, useState } from 'react';
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../lib/roles";
import { useNavigate } from "react-router-dom";

interface RigaClassifica {
  id?: string;
  posizione: number;
  squadra: string;
  partite_giocate: number;
  vinte: number;
  pareggiate: number;
  perse: number;
  goal_fatti: number;
  goal_subiti: number;
  differenza_reti: number;
  punti: number;
  logo_url?: string | null;
}

export default function Classifica(): JSX.Element {
  const { user } = useAuth();
  const [righe, setRighe] = useState<RigaClassifica[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setErrore] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(UserRole.Authenticated);

  const [stagioni, setStagioni] = useState<any[]>([]);
  const [fasi, setFasi] = useState<string[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>("");
  const [faseSelezionata, setFaseSelezionata] = useState<string>("");

  const navigate = useNavigate();

  // 🔹 RUOLO
  useEffect(() => {
    const fetchRole = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.role === "admin") setRole(UserRole.Admin);
      else if (data?.role === "creator") setRole(UserRole.Creator);
    };
    fetchRole();
  }, [user?.id]);

// 🔹 CARICA STAGIONI
useEffect(() => {
  const loadStagioni = async () => {
    const { data, error } = await supabase
      .from("stagioni")
      .select("id, nome")
      .order("data_inizio", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setStagioni(data || []);

    if (data?.length) {
      setStagioneSelezionata(data[0].id);
    }
  };

  loadStagioni();
}, []);

  // 🔹 CARICA FASI
  useEffect(() => {
    if (!stagioneSelezionata) return;

    const loadFasi = async () => {
      const { data } = await supabase
        .from("classifica")
        .select("fase")
        .eq("stagione_id", stagioneSelezionata);

      const uniche = [...new Set((data || []).map((d) => d.fase).filter(Boolean))];

setFasi(uniche);

if (uniche.length > 0) {
  setFaseSelezionata(uniche[0]);
} else {
  setFaseSelezionata("");
  setRighe([]);
  setLoading(false);
}
    };

    loadFasi();
  }, [stagioneSelezionata]);

  const caricaClassifica = async () => {
    try {
      setLoading(true);

      let query = supabase
  .from("classifica")
  .select("*")
  .eq("stagione_id", stagioneSelezionata);

if (faseSelezionata) {
  query = query.eq("fase", faseSelezionata);
}

const { data, error } = await query
  .order("punti", { ascending: false })
  .order("differenza_reti", { ascending: false });

      if (error) throw error;

      const dataConPosizione = (data || []).map((r, i) => ({
        ...r,
        posizione: i + 1,
      }));

      const { data: squadre } = await supabase
        .from("squadre")
        .select("nome, alias, logo_url");

      const normalizza = (s: string) =>
        s
          ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
          : "";

      const classificaConLoghi = dataConPosizione.map((r) => {
        const match = squadre?.find((sq) => {
          return (
            normalizza(r.squadra) === normalizza(sq.nome) ||
            normalizza(r.squadra) === normalizza(sq.alias || "")
          );
        });

        return { ...r, logo_url: match?.logo_url || null };
      });

      setRighe(classificaConLoghi);
    } catch (err: any) {
      setErrore(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (stagioneSelezionata) {
    caricaClassifica();
  }
}, [stagioneSelezionata, faseSelezionata]);

  // 🔹 UPDATE
  const aggiornaClassifica = async () => {
    const url =
      window.location.hostname === "localhost"
        ? "http://127.0.0.1:8888/.netlify/functions/update-classifica"
        : "/.netlify/functions/update-classifica";

    await fetch(url);
    await caricaClassifica();
  };

  if (loading) {
  console.log("loading:", loading);
  console.log("stagione:", stagioneSelezionata);
  console.log("fase:", faseSelezionata);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-start justify-center pt-10">
      <div className="rounded-xl border border-white/10 bg-[#252525]/90 px-6 py-4 text-center text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        ⏳ Caricamento classifica...
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] px-[2px] pt-2 pb-6 box-border">

      {/* 1. Titolo */}
      <h2 className="text-center text-white font-extrabold text-2xl mb-4 tracking-wide drop-shadow-md">
        Classifica Campionato
      </h2>

      {/* 2. Dropdown */}
      <div className="mb-4 flex justify-center gap-3 rounded-xl border border-white/10 bg-[#252525]/90 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.30)]">
        <select
          value={stagioneSelezionata}
          onChange={(e) => setStagioneSelezionata(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-red-600/50 bg-[#333333] px-3 py-2 text-sm font-medium text-white shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
        >
          {stagioni.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>

        <select
          value={faseSelezionata}
          onChange={(e) => setFaseSelezionata(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-red-600/50 bg-[#333333] px-3 py-2 text-sm font-medium text-white shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
        >
          {fasi.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* 3. Bottone aggiornamento */}
      {role === UserRole.Creator && (
        <div className="text-center mb-4">
          <button
            onClick={aggiornaClassifica}
            className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.30)] transition hover:-translate-y-[1px]"
          >
            🔄 Aggiorna classifica
          </button>
        </div>
      )}

      {/* 4. Tabella */}
      <div className="overflow-hidden rounded-2xl border-l-4 border-red-600 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.40)]">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-[15px]">
            <thead className="bg-gradient-to-r from-red-600 via-red-700 to-[#454545] text-white font-semibold">
              <tr>
                <th className="px-1 py-3">#</th>
                <th className="px-1 py-3 text-left">Squadra</th>
                <th className="px-1 py-3">PT</th>
                <th className="px-1 py-3">G</th>
                <th className="px-1 py-3">V</th>
                <th className="px-1 py-3">N</th>
                <th className="px-1 py-3">P</th>
                <th className="px-1 py-3">GF</th>
                <th className="px-1 py-3">GS</th>
                <th className="px-1 py-3">D</th>
              </tr>
            </thead>

            <tbody>
              {righe.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-gray-200 transition ${
                    i % 2 === 0 ? "bg-white" : "bg-[#f3f3f3]"
                  }`}
                >
                  <td className="px-1 py-3 text-center font-bold text-gray-500">
                    {r.posizione}
                  </td>

                  <td
                    onClick={() => navigate(`/scontri/${encodeURIComponent(r.squadra)}`)}
                    className="cursor-pointer px-1 py-3 font-bold text-[#202020]"
                  >
                    <div className="flex items-center gap-2">
                      {r.logo_url ? (
                        <img
                          src={r.logo_url}
                          alt={`Logo ${r.squadra}`}
                          className="h-7 w-7 flex-shrink-0 object-contain"
                        />
                      ) : (
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#333333] text-[11px] font-bold text-white">
                          {r.squadra.charAt(0)}
                        </div>
                      )}

                      <span className="leading-tight">
                        {r.squadra}
                      </span>
                    </div>
                  </td>

                  <td className="px-1 py-3 text-center font-extrabold text-red-600">
                    {r.punti}
                  </td>
                  <td className="px-1 py-3 text-center text-gray-700">{r.partite_giocate}</td>
                  <td className="px-1 py-3 text-center text-gray-700">{r.vinte}</td>
                  <td className="px-1 py-3 text-center text-gray-700">{r.pareggiate}</td>
                  <td className="px-1 py-3 text-center text-gray-700">{r.perse}</td>
                  <td className="px-1 py-3 text-center text-gray-700">{r.goal_fatti}</td>
                  <td className="px-1 py-3 text-center text-gray-700">{r.goal_subiti}</td>
                  <td className="px-1 py-3 text-center font-semibold text-gray-700">
                    {r.differenza_reti}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}