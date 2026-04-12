// src/pages/Classifica.tsx
// Data: 15/11/2025 — versione corretta: aggiornamento classifica sempre via Netlify Function (anche in locale)
// REV: 12/04/2026 — aggiunti dropdown stagione + fase

import React, { useEffect, useState } from "react";
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
  const [errore, setErrore] = useState<string | null>(null);
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
      const { data } = await supabase
        .from("stagioni")
        .select("id, nome")
        .order("created_at", { ascending: false });

      setStagioni(data || []);
      if (data?.length) setStagioneSelezionata(data[0].id);
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
      if (uniche.length) setFaseSelezionata(uniche[0]);
    };

    loadFasi();
  }, [stagioneSelezionata]);

  const caricaClassifica = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("classifica")
        .select("*")
        .eq("stagione_id", stagioneSelezionata)
        .eq("fase", faseSelezionata)
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
    if (stagioneSelezionata && faseSelezionata) {
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

  if (loading)
    return <div className="text-center mt-10 text-white">⏳ Caricamento classifica...</div>;

  return (
    <div className="container mx-auto px-0">

      <h2 className="text-center text-white font-bold text-2xl mb-4 drop-shadow-md">
        Classifica Campionato
      </h2>

      {/* 🔴 DROPDOWN */}
      <div className="flex justify-center gap-3 mb-4">
        <select
          value={stagioneSelezionata}
          onChange={(e) => setStagioneSelezionata(e.target.value)}
          className="bg-white/90 border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-montecarlo"
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
          className="bg-white/90 border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-montecarlo"
        >
          {fasi.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* bottone */}
      {role === UserRole.Creator && (
        <div className="text-center mb-4">
          <button onClick={aggiornaClassifica} className="bg-[#7d7e7b] text-white px-4 py-2 rounded-md">
            🔄 Aggiorna classifica
          </button>
        </div>
      )}

      {/* 🔹 TABELLA IDENTICA */}
      <div className="bg-white/90 rounded-lg shadow-montecarlo border-l-4 border-montecarlo-secondary overflow-hidden">
        <table className="w-full border-collapse text-[17px]">
          <thead className="bg-[#f10909] text-white font-semibold">
            <tr>
              <th>#</th>
              <th>Squadra</th>
              <th>PT</th>
              <th>G</th>
              <th>V</th>
              <th>N</th>
              <th>P</th>
              <th>GF</th>
              <th>GS</th>
              <th>D</th>
            </tr>
          </thead>

          <tbody>
            {righe.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? "bg-white/95" : "bg-[#fce5e5]/90"}>
                <td>{r.posizione}</td>
                <td onClick={() => navigate(`/scontri/${encodeURIComponent(r.squadra)}`)}>
                  {r.squadra}
                </td>
                <td>{r.punti}</td>
                <td>{r.partite_giocate}</td>
                <td>{r.vinte}</td>
                <td>{r.pareggiate}</td>
                <td>{r.perse}</td>
                <td>{r.goal_fatti}</td>
                <td>{r.goal_subiti}</td>
                <td>{r.differenza_reti}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}