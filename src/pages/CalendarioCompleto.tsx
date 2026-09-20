// src/pages/CalendarioCompleto.tsx
// Data creazione chat: 19/09/2026

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

interface PartitaCalendario {
  id: string;
  giornata: number;
  data_match: string | null;
  ora_match: string | null;
  squadra_casa: string;
  squadra_ospite: string;
  goal_casa: number | null;
  goal_ospite: number | null;
  squadra_casa_originale: string | null;
  squadra_ospite_originale: string | null;
}

interface Squadra {
  nome: string;
  alias: string | null;
  logo_url: string | null;
}

interface PartitaConLoghi extends PartitaCalendario {
  logo_casa: string | null;
  logo_ospite: string | null;
}

const STAGIONE_ID = "6a7cc3ea-b316-4261-85ed-73e310710dd8";
const FASE = "Prima Fase";

export default function CalendarioCompleto(): JSX.Element {
      const navigate = useNavigate();
  const [giornataSelezionata, setGiornataSelezionata] = useState(1);
  const [partite, setPartite] = useState<PartitaConLoghi[]>([]);
  const [giornate, setGiornate] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

    const aliasSquadre: Record<string, string> = {
    "pievespaolo": "pievesanpaolo",
  };

   const normalizza = (s: string | null | undefined) => {
    if (!s) return "";

    const nomeNormalizzato = s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

    return aliasSquadre[nomeNormalizzato] || nomeNormalizzato;
  };

  useEffect(() => {
    const caricaCalendario = async () => {
      try {
        setLoading(true);
        setErrore(null);

        const { data: calendario, error: calendarioError } = await supabase
          .from("classifica_partite")
          .select(`
            id,
            giornata,
            data_match,
            ora_match,
            squadra_casa,
            squadra_ospite,
            goal_casa,
            goal_ospite,
            squadra_casa_originale,
            squadra_ospite_originale
          `)
          .eq("stagione_id", STAGIONE_ID)
          .eq("fase", FASE)
          .order("giornata", { ascending: true });

        if (calendarioError) throw calendarioError;

        const { data: squadre, error: squadreError } = await supabase
          .from("squadre")
          .select("nome, alias, logo_url");

        if (squadreError) throw squadreError;

        const elencoSquadre = (squadre || []) as Squadra[];

        const trovaLogo = (
          nomeNormalizzato: string,
          nomeOriginale: string | null
        ) => {
          if (normalizza(nomeNormalizzato) === "riposo") {
            return null;
          }

          const squadra = elencoSquadre.find((sq) => {
            const nomiDaConfrontare = [
              normalizza(sq.nome),
              normalizza(sq.alias),
            ];

            return (
              nomiDaConfrontare.includes(normalizza(nomeNormalizzato)) ||
              nomiDaConfrontare.includes(normalizza(nomeOriginale))
            );
          });

          return squadra?.logo_url || null;
        };

        const calendarioConLoghi: PartitaConLoghi[] = (
          (calendario || []) as PartitaCalendario[]
        ).map((partita) => ({
          ...partita,
          logo_casa: trovaLogo(
            partita.squadra_casa,
            partita.squadra_casa_originale
          ),
          logo_ospite: trovaLogo(
            partita.squadra_ospite,
            partita.squadra_ospite_originale
          ),
        }));

        const giornateDisponibili = [
          ...new Set(
            calendarioConLoghi
              .map((partita) => partita.giornata)
              .filter((giornata) => giornata !== null)
          ),
        ].sort((a, b) => a - b);

        setPartite(calendarioConLoghi);
        setGiornate(giornateDisponibili);

        if (
          giornateDisponibili.length > 0 &&
          !giornateDisponibili.includes(giornataSelezionata)
        ) {
          setGiornataSelezionata(giornateDisponibili[0]);
        }
      } catch (err: any) {
        console.error("Errore caricamento calendario completo:", err);
        setErrore(err.message || "Errore durante il caricamento del calendario.");
      } finally {
        setLoading(false);
      }
    };

    caricaCalendario();
  }, []);

  const partiteGiornata = partite.filter(
    (partita) => partita.giornata === giornataSelezionata
  );

  const partiteEffettive = partiteGiornata.filter(
    (partita) =>
      normalizza(partita.squadra_casa) !== "riposo" &&
      normalizza(partita.squadra_ospite) !== "riposo"
  );

  const riposo = partiteGiornata.find(
    (partita) =>
      normalizza(partita.squadra_casa) === "riposo" ||
      normalizza(partita.squadra_ospite) === "riposo"
  );

  const squadraARiposo = riposo
    ? normalizza(riposo.squadra_casa) === "riposo"
      ? riposo.squadra_ospite_originale || riposo.squadra_ospite
      : riposo.squadra_casa_originale || riposo.squadra_casa
    : null;

  const dataGiornata =
    partiteEffettive.find((partita) => partita.data_match)?.data_match || null;

  const formattaData = (data: string | null) => {
    if (!data) return "";

    const [anno, mese, giorno] = data.split("-");

    return `${giorno}/${mese}/${anno}`;
  };

  const nomeVisualizzato = (
    nome: string,
    nomeOriginale: string | null
  ) => {
    return nomeOriginale || nome;
  };

  const isMontecarlo = (
    nome: string,
    nomeOriginale: string | null
  ) => {
    return (
      normalizza(nome) === "montecarlo" ||
      normalizza(nomeOriginale) === "montecarlo"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-start justify-center pt-10">
        <div className="rounded-xl border border-white/10 bg-[#252525]/90 px-6 py-4 text-center text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          ⏳ Caricamento calendario...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] px-2 pt-2 pb-6 box-border">

      {/* 1. Titolo */}
      <h2 className="mb-4 text-center text-2xl font-extrabold tracking-wide text-white drop-shadow-md">
        Calendario completo
      </h2>

      {/* 2. Selezione giornata */}
      <div className="mb-4 rounded-xl border border-white/10 bg-[#252525]/90 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.30)]">
        <div className="mb-2 text-center text-sm font-semibold text-gray-300">
          Giornata
        </div>

        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
          {giornate.map((giornata) => (
            <button
              key={giornata}
              type="button"
              onClick={() => setGiornataSelezionata(giornata)}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border text-sm font-extrabold transition ${
                giornataSelezionata === giornata
                  ? "border-red-500 bg-red-600 text-white shadow-[0_3px_10px_rgba(0,0,0,0.30)]"
                  : "border-white/10 bg-[#3a3a3a] text-white hover:bg-[#484848]"
              }`}
            >
              {giornata}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Intestazione giornata */}
      <div className="mb-3 text-center">
        <div className="text-xl font-extrabold text-white">
          {giornataSelezionata}ª Giornata
        </div>

        {dataGiornata && (
          <div className="mt-1 text-sm font-medium text-gray-300">
            {formattaData(dataGiornata)}
          </div>
        )}
      </div>

      {/* 4. Errore */}
      {errore && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-center font-semibold text-red-200">
          {errore}
        </div>
      )}

      {/* 5. Partite */}
      {!errore && (
        <div className="overflow-hidden rounded-2xl border-l-4 border-red-600 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.40)]">
          {partiteEffettive.map((partita, index) => {
            const montecarloCasa = isMontecarlo(
              partita.squadra_casa,
              partita.squadra_casa_originale
            );

            const montecarloOspite = isMontecarlo(
              partita.squadra_ospite,
              partita.squadra_ospite_originale
            );

            const risultatoDisponibile =
              partita.goal_casa !== null &&
              partita.goal_ospite !== null;

            return (
              <div
                key={partita.id}
                className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 py-4 ${
                  index !== partiteEffettive.length - 1
                    ? "border-b border-gray-200"
                    : ""
                } ${
                  montecarloCasa || montecarloOspite
                    ? "bg-red-50"
                    : index % 2 === 0
                    ? "bg-white"
                    : "bg-[#f3f3f3]"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className={`min-w-0 text-right text-sm leading-tight ${
                        montecarloCasa
                          ? "font-extrabold text-red-600"
                          : "font-bold text-[#202020]"
                      }`}
                    >
                      {nomeVisualizzato(
                        partita.squadra_casa,
                        partita.squadra_casa_originale
                      )}
                    </span>

                    {partita.logo_casa ? (
                      <img
                        src={partita.logo_casa}
                        alt={`Logo ${nomeVisualizzato(
                          partita.squadra_casa,
                          partita.squadra_casa_originale
                        )}`}
                        className="h-9 w-9 flex-shrink-0 object-contain"
                      />
                    ) : (
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#333333] text-xs font-bold text-white">
                        {nomeVisualizzato(
                          partita.squadra_casa,
                          partita.squadra_casa_originale
                        ).charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-w-[54px] items-center justify-center">
                  <div className="rounded-lg bg-[#303030] px-3 py-2 text-center text-base font-extrabold text-white">
                    {risultatoDisponibile
                      ? `${partita.goal_casa} - ${partita.goal_ospite}`
                      : "-"}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {partita.logo_ospite ? (
                      <img
                        src={partita.logo_ospite}
                        alt={`Logo ${nomeVisualizzato(
                          partita.squadra_ospite,
                          partita.squadra_ospite_originale
                        )}`}
                        className="h-9 w-9 flex-shrink-0 object-contain"
                      />
                    ) : (
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#333333] text-xs font-bold text-white">
                        {nomeVisualizzato(
                          partita.squadra_ospite,
                          partita.squadra_ospite_originale
                        ).charAt(0)}
                      </div>
                    )}

                    <span
                      className={`min-w-0 text-left text-sm leading-tight ${
                        montecarloOspite
                          ? "font-extrabold text-red-600"
                          : "font-bold text-[#202020]"
                      }`}
                    >
                      {nomeVisualizzato(
                        partita.squadra_ospite,
                        partita.squadra_ospite_originale
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 6. Riposo */}
          {squadraARiposo && (
            <div className="border-t border-gray-200 bg-[#e8e8e8] px-3 py-3 text-center text-sm text-gray-700">
              <span className="font-semibold">Riposa:</span>{" "}
              <span
                className={
                  normalizza(squadraARiposo) === "montecarlo"
                    ? "font-extrabold text-red-600"
                    : "font-bold"
                }
              >
                {squadraARiposo}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 7. Nessuna partita */}
      {!errore && partiteGiornata.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-[#252525]/90 p-5 text-center text-white">
          Nessuna partita disponibile per questa giornata.
        </div>
      )}
                       {/* 8. Pulsanti navigazione */}
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.30)] transition hover:-translate-y-[1px]"
        >
          ← Indietro
        </button>

        <button
          type="button"
          onClick={() => navigate("/classifica")}
          className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.30)] transition hover:-translate-y-[1px]"
        >
          Classifica
        </button>
      </div>
    </div>
  );
}