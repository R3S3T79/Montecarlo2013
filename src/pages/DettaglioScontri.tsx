// src/pages/DettaglioScontri.tsx
// Data: 06/11/2025 — Rev10: stile card uniforme alla pagina Risultati + nomi Montecarlo rossi + data/giornata in testata

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
  campionato_torneo?: string | null;
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

  const formatGiorno = (d: string) => {
    const giorno = new Date(d).toLocaleDateString("it-IT", { weekday: "long" });
    return giorno.charAt(0).toUpperCase() + giorno.slice(1);
  };

  const formatData = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const isMontecarlo = (s: string) =>
    s.toLowerCase().includes("montecarlo");

  if (loading)
    return (
      <div className="text-center mt-10 text-white font-semibold text-lg">
        ⏳ Caricamento scontri di {nome}...
      </div>
    );

  return (
    <div className="container mx-auto px-1">
      <h2 className="text-center text-white font-bold text-lg mb-4 drop-shadow-md">
        Risultati {decodeURIComponent(nome || "")}
      </h2>

      {partite.length === 0 ? (
        <p className="text-center text-white font-medium">
          Nessuna partita trovata.
        </p>
      ) : (
        <div className="space-y-3">
          {partite.map((p) => {
            const dataValida = p.data_match
              ? formatData(p.data_match)
              : "Data N/D";
            const giorno = p.data_match ? formatGiorno(p.data_match) : "";
            const risultato =
              p.goal_casa !== null && p.goal_ospite !== null
                ? `${p.goal_casa} - ${p.goal_ospite}`
                : "-";

            return (
              <div
                key={p.id}
                className="bg-white/90 rounded-lg shadow-montecarlo hover:shadow-montecarlo-lg transition-transform hover:scale-[1.02] border-l-4 border-montecarlo-secondary"
              >
                {/* Testata rossa con giorno/data a sx e giornata a dx */}
                <div className="bg-gradient-montecarlo text-white px-4 py-2 rounded-t-lg flex justify-between">
                  <div className="flex flex-col text-left">
                    <span className="text-sm sm:text-base font-bold">
                      {giorno}
                    </span>
                    <span className="text-sm sm:text-base font-semibold">
                      {dataValida}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-sm sm:text-base font-bold">
                      {p.campionato_torneo || "Competizione"}
                    </span>
                    <span className="text-sm sm:text-base font-semibold">
                      {p.giornata ? `Giornata ${p.giornata}` : ""}
                    </span>
                  </div>
                </div>

                {/* Corpo con squadre e risultato */}
                <div className="p-4 grid grid-cols-[2fr_auto_2fr] items-center gap-4">
                  <span
                    className={`font-semibold text-right ${
                      isMontecarlo(p.squadra_casa)
                        ? "text-[#e63946]"
                        : "text-black"
                    }`}
                  >
                    {p.squadra_casa}
                  </span>

                  <span className="text-montecarlo-secondary font-bold text-lg">
                    {risultato}
                  </span>

                  <span
                    className={`font-semibold text-left ${
                      isMontecarlo(p.squadra_ospite)
                        ? "text-[#e63946]"
                        : "text-black"
                    }`}
                  >
                    {p.squadra_ospite}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center mt-6 mb-10">

        <button
  onClick={() => navigate(-1)}
  className="bg-gradient-to-b from-[#8a8a8a] to-[#5e5e5e] hover:from-[#9c9c9c] hover:to-[#6f6f6f] text-white font-semibold px-5 py-2.5 rounded-md transition-all duration-150 shadow-lg active:translate-y-[1px]"
>
  Torna indietro
</button>

      </div>
    </div>
  );
}
