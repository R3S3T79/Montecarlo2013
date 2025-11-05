// src/pages/DettaglioScontri.tsx
// Data: 05/11/2025 — Mostra tutti gli scontri (partite) di una squadra dal campionato completo
// Rev9: uniformato lo stile alla pagina Risultati/Classifica

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

interface Partita {
  id: string;
  giornata: number | null;
  data_match: string | null;
  ora_match: string | null;
  squadra_casa: string;
  squadra_ospite: string;
  goal_casa: number | null;
  goal_ospite: number | null;
  campo?: string | null;
  note?: string | null;
}

export default function DettaglioScontri(): JSX.Element {
  const { nome } = useParams<{ nome: string }>();
  const [partite, setPartite] = useState<Partita[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!nome) return;
    const squadraNome = decodeURIComponent(nome);

    const caricaPartite = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("classifica_partite")
          .select("*")
          .or(`squadra_casa.eq.${squadraNome},squadra_ospite.eq.${squadraNome}`)
          .order("data_match", { ascending: true });

        if (error) {
          console.error("❌ Errore caricamento scontri:", error);
        } else {
          setPartite(data || []);
        }
      } catch (err) {
        console.error("❌ Errore imprevisto:", err);
      } finally {
        setLoading(false);
      }
    };

    caricaPartite();
  }, [nome]);

  if (loading)
    return (
      <div className="text-center mt-10 text-white font-semibold text-lg">
        ⏳ Caricamento scontri di {nome}...
      </div>
    );

  return (
    <div className="container mx-auto px-2">
      <h2 className="text-center text-white font-bold text-2xl mb-4 drop-shadow-md">
        ⚽ Scontri di {decodeURIComponent(nome || "")}
      </h2>

      {partite.length === 0 ? (
        <p className="text-center text-white font-medium">Nessuna partita trovata.</p>
      ) : (
        <div className="bg-white/90 rounded-lg shadow-montecarlo border-l-4 border-montecarlo-secondary overflow-hidden">
          <table className="w-full border-collapse text-[15px]">
            <thead className="bg-[#f10909] text-white font-semibold">
              <tr>
                <th className="py-2 text-center w-8">#</th>
                <th colSpan={3} className="py-2 text-center">Match</th>
              </tr>
            </thead>
            <tbody>
              {partite.map((p, i) => {
                const data = p.data_match
                  ? new Date(p.data_match).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })
                  : "-";

                const risultato =
                  p.goal_casa !== null && p.goal_ospite !== null
                    ? `${p.goal_casa} - ${p.goal_ospite}`
                    : "-";

                const isMontecarlo = (nomeSquadra: string) =>
                  nomeSquadra.toLowerCase().includes("montecarlo");

                return (
                  <React.Fragment key={p.id}>
                    <tr
                      className={`text-center ${
                        i % 2 === 0
                          ? "bg-white/95"
                          : "bg-[#fce5e5]/90"
                      }`}
                    >
                      <td colSpan={4} className="py-2 font-semibold text-black border-b border-white/60">
                         {data}
                      </td>
                    </tr>
                    <tr
                      className={`text-center ${
                        i % 2 === 0
                          ? "bg-white/95"
                          : "bg-[#fce5e5]/90"
                      }`}
                    >
                      <td className="py-3">{p.giornata || "-"}</td>
                      <td
                        className={`text-left px-2 ${
                          isMontecarlo(p.squadra_casa)
                            ? "text-[#e63946] font-semibold"
                            : "text-black"
                        }`}
                      >
                        {p.squadra_casa}
                      </td>
                      <td className="font-bold text-center w-12">{risultato}</td>
                      <td
                        className={`text-right px-2 ${
                          isMontecarlo(p.squadra_ospite)
                            ? "text-[#e63946] font-semibold"
                            : "text-black"
                        }`}
                      >
                        {p.squadra_ospite}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-center mt-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-[#7d7e7b] hover:bg-[#696a67] text-white font-semibold px-4 py-2 rounded-md transition-all shadow-montecarlo"
        >
          Torna indietro
        </button>
      </div>
    </div>
  );
}
