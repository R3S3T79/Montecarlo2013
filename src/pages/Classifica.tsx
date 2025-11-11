// src/pages/Classifica.tsx
// Data: 06/11/2025 — versione con caricamento loghi da tabella "squadre" tramite confronto nome flessibile

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../lib/roles";
import * as cheerio from "cheerio";
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
  const navigate = useNavigate();

  // ✅ Recupera ruolo utente
  useEffect(() => {
    const fetchRole = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error && data?.role) {
        const r = (data.role as string).toLowerCase();
        if (r === "admin") setRole(UserRole.Admin);
        else if (r === "creator") setRole(UserRole.Creator);
      }
    };
    fetchRole();
  }, [user?.id]);

  const caricaClassifica = async () => {
  try {
    setLoading(true);

    // 1️⃣ Carica classifica
    const { data, error } = await supabase
      .from("classifica")
      .select("*")
      .order("punti", { ascending: false })
      .order("differenza_reti", { ascending: false });
    if (error) throw error;

    const dataConPosizione = (data || []).map((r, i) => ({
      ...r,
      posizione: i + 1,
    }));

    // 2️⃣ Carica le squadre con nome, alias e logo
    const { data: squadre, error: errSquadre } = await supabase
      .from("squadre")
      .select("nome, alias, logo_url");
    if (errSquadre) throw errSquadre;

    // 3️⃣ Funzione di normalizzazione (ignora maiuscole, spazi, punti, accenti)
    const normalizza = (s: string) =>
      s
        ? s
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "")
        : "";

    // 4️⃣ Collega il logo: prima prova con alias, poi con nome
    const classificaConLoghi = dataConPosizione.map((r) => {
      const squadraNome = normalizza(r.squadra);

      const match = squadre?.find((sq) => {
        const nomeNorm = normalizza(sq.nome);
        const aliasNorm = normalizza(sq.alias || "");
        return squadraNome === aliasNorm || squadraNome === nomeNorm;
      });

      return { ...r, logo_url: match?.logo_url || null };
    });

    setRighe(classificaConLoghi);

   
  } catch (err: any) {
    console.error("❌ Errore caricamento:", err);
    setErrore(err.message);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    caricaClassifica();
  }, []);

  // ✅ Aggiorna la classifica (solo creator)
  const aggiornaClassifica = async () => {
    try {
      setLoading(true);
      const isLocal = window.location.hostname === "localhost";
      if (isLocal) {
        console.log("🔹 Modalità locale: aggiornamento diretto da Campionando.it");

        const res = await fetch("https://campionando.it/classi.php?camp=6158");
        const html = await res.text();
        const $ = cheerio.load(html);

        const rows: any[] = [];
        $("table tr").each((i, el) => {
          const cols = $(el).find("td");
          if (cols.length >= 9) {
            const posizione = parseInt($(cols[0]).text().trim()) || 0;
            const squadra = $(cols[1]).text().trim();
            const partite_giocate = parseInt($(cols[2]).text().trim()) || 0;
            const vinte = parseInt($(cols[3]).text().trim()) || 0;
            const pareggiate = parseInt($(cols[4]).text().trim()) || 0;
            const perse = parseInt($(cols[5]).text().trim()) || 0;
            const goal_fatti = parseInt($(cols[6]).text().trim()) || 0;
            const goal_subiti = parseInt($(cols[7]).text().trim()) || 0;
            const punti = parseInt($(cols[8]).text().trim()) || 0;

            if (squadra) {
              rows.push({
                posizione,
                squadra,
                partite_giocate,
                vinte,
                pareggiate,
                perse,
                goal_fatti,
                goal_subiti,
                differenza_reti: goal_fatti - goal_subiti,
                punti,
              });
            }
          }
        });

        if (rows.length === 0)
          throw new Error("Nessuna riga trovata su Campionando.it");

        await supabase
          .from("classifica")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        const { error: insErr } = await supabase
          .from("classifica")
          .insert(rows);
        if (insErr) throw insErr;

        alert(`✅ Classifica aggiornata (${rows.length} squadre)`);
      } else {
        console.log("🌍 Modalità produzione: chiamata Netlify Function");
        const res = await fetch("/.netlify/functions/update-classifica");
        const text = await res.text();
        console.log("Risposta funzione:", text);
        alert("✅ Aggiornamento completato (Netlify).");
      }

      await caricaClassifica();
    } catch (err: any) {
      console.error("❌ Errore aggiornamento:", err);
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="text-center mt-10 text-white font-semibold text-lg">
        ⏳ Caricamento classifica...
      </div>
    );

  if (errore)
    return (
      <div className="text-center mt-10 text-red-600 font-semibold">
        Errore nel caricamento: {errore}
      </div>
    );

  return (
    <div className="container mx-auto px-0">
      {/* Titolo */}
      <h2 className="text-center text-white font-bold text-2xl mb-4 drop-shadow-md">
        Classifica Campionato
      </h2>

      {/* Pulsante visibile solo al Creator */}
      {role === UserRole.Creator && (
        <div className="text-center mb-4">
          <button
            onClick={aggiornaClassifica}
            className="bg-[#7d7e7b] hover:bg-[#696a67] text-white font-semibold px-4 py-2 rounded-md transition-all shadow-montecarlo"
          >
            🔄 Aggiorna classifica ora
          </button>
        </div>
      )}

      {/* Tabella contenitore */}
      <div className="bg-white/90 rounded-lg shadow-montecarlo border-l-4 border-montecarlo-secondary overflow-hidden">
        <table className="w-full border-collapse text-[17px]">
          <thead className="bg-[#f10909] text-white font-semibold">
            <tr>
              <th className="py-1 text-center w-8">#</th>
              <th className="py-1 text-left px-3 w-[170px]">Squadra</th>
              <th className="py-2 text-center w-8">PT</th>
              <th className="py-2 text-center w-8">G</th>
              <th className="py-2 text-center w-8">V</th>
              <th className="py-2 text-center w-8">N</th>
              <th className="py-2 text-center w-8">P</th>
              <th className="py-2 text-center w-10">GF</th>
              <th className="py-2 text-center w-10">GS</th>
              <th className="py-2 text-center w-10">D</th>
            </tr>
          </thead>

          <tbody>
            {righe.map((r, i) => (
              <tr
                key={r.id || i}
                className={`text-center transition-colors ${
                  i % 2 === 0 ? "bg-white/95" : "bg-[#fce5e5]/90"
                }`}
              >
                <td className="py-3.5 pr-1 text-right">{r.posizione}</td>

                <td className="text-left pl-1 pr-4 font-semibold">
  <div className="flex items-center gap-2">


                    {/* Logo squadra */}
                    {r.logo_url ? (
                      <img
                        src={r.logo_url}
                        alt={`${r.squadra} logo`}
                        className="w-6 h-6 object-contain rounded-full bg-white border border-gray-200"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200" />
                    )}

                    {/* Nome squadra */}
                    <span
                      onClick={() =>
                        navigate(`/scontri/${encodeURIComponent(r.squadra)}`)
                      }
                      style={{
                        textDecoration: "underline",
                        textDecorationThickness: "1px",
                        textUnderlineOffset: "2px",
                      }}
                      className={`cursor-pointer text-[15px] leading-tight ${
    r.squadra.toLowerCase().includes("montecarlo")
      ? "text-[#e63946] font-bold"
      : "text-black font-medium"
  }`}
                    >
                      {r.squadra}
                    </span>
                  </div>
                </td>

                {/* Colonne colorate */}
                <td className="font-bold text-[#004aad]">{r.punti}</td>
                <td>{r.partite_giocate}</td>
                <td className="text-[#008000] font-semibold">{r.vinte}</td>
                <td className="text-[#666666]">{r.pareggiate}</td>
                <td className="text-[#d00000] font-semibold">{r.perse}</td>
                <td className="text-[#008000] font-semibold">{r.goal_fatti}</td>
                <td className="text-[#d00000] font-semibold">{r.goal_subiti}</td>
                <td
                  className={`font-semibold ${
                    r.differenza_reti > 0
                      ? "text-green-600"
                      : r.differenza_reti < 0
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {r.differenza_reti}
                </td>
              </tr>
            ))}
          </tbody>
                </table>
      </div>

      {/* Pulsante per aprire il grafico andamento classifica */}
      <div className="text-center mt-6 mb-10">
        <button
          onClick={() => navigate("/grafico-classifica")}
          className="bg-gradient-to-b from-[#8a8a8a] to-[#5e5e5e] hover:from-[#9c9c9c] hover:to-[#6f6f6f] text-white font-semibold px-5 py-2.5 rounded-md transition-all duration-150 shadow-lg active:translate-y-[1px]"
        >
          📈 Vedi andamento classifica
        </button>
      </div>
    </div>
  );
}

