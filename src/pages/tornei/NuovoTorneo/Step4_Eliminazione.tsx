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
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-2xl mx-auto">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo">

          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="p-4 sm:p-6">

            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">
                Composizione Incontri
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Seleziona le squadre per ogni incontro
              </p>
            </div>

            <div className="space-y-4">
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
                  <div
                    key={groupIdx}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="font-semibold text-gray-800">
                        Incontro {lettere[groupIdx] ?? `${groupIdx + 1}`}
                      </div>

                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                        {faseIniziale[state.numSquadre]}
                      </span>
                    </div>

                    <div className="space-y-2">

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                          Squadra {i1 + 1}
                        </label>

                        <select
                          value={scelte[i1] || ""}
                          onChange={(e) => handleSelect(i1, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-montecarlo-secondary transition"
                        >
                          <option value="">Squadra {i1 + 1}</option>
                          {opzioni1.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs font-bold text-montecarlo-secondary">
                          VS
                        </span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                          Squadra {i2 + 1}
                        </label>

                        <select
                          value={scelte[i2] || ""}
                          onChange={(e) => handleSelect(i2, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-montecarlo-secondary transition"
                        >
                          <option value="">Squadra {i2 + 1}</option>
                          {opzioni2.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 pt-5">
              <button
                onClick={handleContinue}
                disabled={!tutteScelteValide()}
                className={`w-full py-2.5 font-semibold rounded-lg text-white transition ${
                  tutteScelteValide()
                    ? "bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] hover:opacity-90 shadow-sm"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                Continua
              </button>

              <button
                onClick={() => navigate(-1)}
                className="w-full bg-gray-100 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition"
              >
                Indietro
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}