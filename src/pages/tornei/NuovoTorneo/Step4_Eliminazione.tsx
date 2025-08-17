// src/pages/tornei/NuovoTorneo/Step4_Eliminazione.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";

interface Squadra {
  id: string;
  nome: string;
}

export default function Step4_Eliminazione() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    torneoNome: string;
    torneoLuogo: string;
    stagioneSelezionata: string;
    formatoTorneo: string;
    numSquadre: number;
  } | null;

  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [scelte, setScelte] = useState<(string | null)[]>([]);

  // ID squadra Montecarlo da forzare in elenco e mettere come prima voce
  const MONTECARLO_ID = "a16a8645-9f86-41d9-a81f-a92931f1cc67";

  useEffect(() => {
    if (!state) {
      navigate("/tornei/nuovo/step1");
      return;
    }

    const fetchSquadre = async () => {
      // 1) Prendo tutte le squadre
      const { data: allTeams, error } = await supabase
        .from("squadre")
        .select("id, nome");

      if (error) {
        console.error(error);
        return;
      }

      let elenco: Squadra[] = allTeams ?? [];

      // 2) Se la squadra Montecarlo (ID noto) non è presente nell'elenco principale, la recupero e la aggiungo
      const giaPresente = elenco.some((s) => s.id === MONTECARLO_ID);
      if (!giaPresente) {
        const { data: mc } = await supabase
          .from("squadre")
          .select("id, nome")
          .eq("id", MONTECARLO_ID)
          .maybeSingle();
        if (mc) {
          elenco = [...elenco, mc];
        }
      }

      // 3) Ordino: prima "Montecarlo" (ID forzato o nome esatto), poi tutte le altre in ordine alfabetico
      const montecarlo =
        elenco.find((s) => s.id === MONTECARLO_ID) ||
        elenco.find((s) => s.nome.trim().toLowerCase() === "montecarlo");

      const altre = elenco
        .filter((s) => s.id !== montecarlo?.id)
        .sort((a, b) =>
          a.nome.localeCompare(b.nome, "it", { sensitivity: "base" })
        );

      const ordered = montecarlo ? [montecarlo, ...altre] : altre;

      setSquadre(ordered);
      setScelte(Array(state.numSquadre).fill(null));
    };

    fetchSquadre();
  }, [state, navigate]);

  const handleSelect = (index: number, value: string) => {
    const nuove = [...scelte];
    nuove[index] = value;
    setScelte(nuove);
  };

  const tutteScelteValide = () =>
    scelte.every((val) => val !== null) && new Set(scelte).size === scelte.length;

  const faseIniziale: Record<number, string> = {
    32: "Sedicesimi di Finale",
    16: "Ottavi di Finale",
    8: "Quarti di Finale",
    4: "Semifinale",
  };

  const handleContinue = async () => {
    if (!state) return;

    const { data: torneo, error: torneoError } = await supabase
      .from("tornei")
      .insert({
        nome_torneo: state.torneoNome,
        luogo: state.torneoLuogo,
        stagioni: state.stagioneSelezionata,
        formato_torneo: "Eliminazione",
        numero_squadre: state.numSquadre,
      })
      .select("id")
      .single();

    if (torneoError || !torneo) {
      alert("Errore nella creazione del torneo.");
      return;
    }

    const torneoId = torneo.id;
    const initialPhase = faseIniziale[state.numSquadre];

    const rounds = [];
    for (let i = 0; i < scelte.length; i += 2) {
      rounds.push({
        torneo_id: torneoId,
        round_number: 1,
        match_number: i / 2 + 1,
        fase_torneo: initialPhase,
        squadra_casa: scelte[i]!,
        squadra_ospite: scelte[i + 1]!,
        gol_casa: 0,
        gol_ospite: 0,
      });
    }

    const { error: elimError } = await supabase
      .from("tornei_eliminazione")
      .insert(rounds);

    if (elimError) {
      alert("Errore nella creazione delle partite.");
      return;
    }

    navigate(`/tornei/nuovo/step5-eliminazione/${torneoId}`, {
      state: { torneoId, squadreSelezionate: scelte as string[] },
    });
  };

  if (!state) return null;

  const lettere = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return (
    // Wrapper esterno per distanziare leggermente il contenuto dai bordi della pagina
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 bg-white rounded-lg shadow">
        <div className="space-y-6">
          {Array.from({ length: state.numSquadre / 2 }).map((_, groupIdx) => {
            const i1 = groupIdx * 2;
            const i2 = i1 + 1;

            const opzioni1 = squadre.filter(
              (s) => !scelte.includes(s.id) || s.id === scelte[i1]
            );
            const opzioni2 = squadre.filter(
              (s) => !scelte.includes(s.id) || s.id === scelte[i2]
            );

            return (
              <div key={groupIdx} className="space-y-2">
                <div className="text-center text-sm text-gray-600 font-semibold">
                  Incontro {lettere[groupIdx] ?? `${groupIdx + 1}`}
                </div>

                <select
                  value={scelte[i1] || ""}
                  onChange={(e) => handleSelect(i1, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                >
                  <option value="">Squadra {i1 + 1}</option>
                  {opzioni1.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>

                <select
                  value={scelte[i2] || ""}
                  onChange={(e) => handleSelect(i2, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                >
                  <option value="">Squadra {i2 + 1}</option>
                  {opzioni2.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 pt-4">
          <button
            onClick={handleContinue}
            disabled={!tutteScelteValide()}
            className={`w-full py-2 text-lg rounded-lg text-white transition ${
              tutteScelteValide()
                ? "bg-green-600 hover:bg-green-700 shadow"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Continua
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-gray-300 text-black py-2 rounded-lg hover:bg-gray-400 transition"
          >
            Indietro
          </button>
        </div>
      </div>
    </div>
  );
}
