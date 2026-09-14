// src/pages/tornei/NuovoTorneo/Step6_Eliminazione.tsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Bracket from "../../../components/Bracket";
import { Team, MatchData } from "../../../types";

export default function Step6_Eliminazione() {
  const { torneoId } = useParams<{ torneoId: string }>();
  const navigate = useNavigate();
  const [torneoNome, setTorneoNome] = useState<string>("Torneo");
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const didInit = useRef(false);

  useEffect(() => {
    console.log("🌀 useEffect triggered – torneoId:", torneoId);
    if (!torneoId || didInit.current) return;
    didInit.current = true;
    (async () => {
      setLoading(true);
      try {
        // Carica nome torneo
        const { data: tData, error: tErr } = await supabase
          .from("tornei")
          .select("nome_torneo")
          .eq("id", torneoId)
          .single();
        if (tErr) console.error("❌ Errore torneo:", tErr);
        else console.log("✅ Nome torneo:", tData?.nome_torneo);
        if (tData) setTorneoNome(tData.nome_torneo);

        // Carica squadre
        const { data: sq, error: sqErr } = await supabase
          .from("squadre")
          .select("id, nome, logo_url");
        if (sqErr) console.error("❌ Errore squadre:", sqErr);
        else console.log("✅ Squadre caricate:", sq?.length);
        if (sq) setTeams(sq);

        // Carica partite
        const { data: p, error: pErr } = await supabase
          .from("tornei_eliminazione")
          .select(
            "id, squadra_casa, squadra_ospite, data_match, round_number, match_number, vincitore, gol_casa, gol_ospite, next_match_id"
          )
          .eq("torneo_id", torneoId)
          .order("round_number", { ascending: true })
          .order("match_number", { ascending: true });
        if (pErr) console.error("❌ Errore partite:", pErr);
        else console.log("✅ Partite caricate:", p?.length);

        const raw = p || [];

        const uniq = raw.filter(
          (m, i, a) =>
            i ===
            a.findIndex(
              x =>
                x.round_number === m.round_number &&
                x.match_number === m.match_number
            )
        );

        const formatted: MatchData[] = uniq.map(m => ({
          id: m.id,
          torneo_id: torneoId,
          round_number: m.round_number,
          fase_torneo: "",
          squadra_casa_id: m.squadra_casa,
          squadra_ospite_id: m.squadra_ospite,
          data_ora: m.data_match,
          ordine_fase: m.round_number,
          match_number: m.match_number,
          vincitore_id: m.vincitore,
          rigori_vincitore: null,
          lettera: null,
          gol_casa: m.gol_casa ?? 0,
          gol_ospite: m.gol_ospite ?? 0,
          next_match_id: m.next_match_id,
        }));
        console.log("✅ Match formattati:", formatted.length);
        setMatches(formatted);
      } catch (err) {
        console.error("❌ Errore generale:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [torneoId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-2">
        <div className="rounded-xl border border-gray-200 bg-white/90 px-6 py-4 shadow-montecarlo">
          <div className="text-sm font-semibold text-montecarlo-secondary">
            Caricamento…
          </div>
        </div>
      </div>
    );
  }

  const handleEditResult = (matchId: string) => {
    navigate(
      `/tornei/nuovo/step6-eliminazione/${torneoId}/partita/${matchId}`,
      { state: { torneoId } }
    );
  };

  return (
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-7xl mx-auto space-y-4">

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo print:hidden">
          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl ring-1 ring-inset ring-red-200">
                🏆
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-xl sm:text-2xl font-bold text-gray-900">
                  {torneoNome}
                </h1>

                <p className="mt-0.5 text-sm text-gray-500">
                  Tabellone eliminazione diretta
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo">
          <div className="border-b border-gray-100 px-4 py-3 print:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Tabellone
                </h2>

                <p className="text-xs text-gray-500">
                  Tocca una partita per inserire o modificare il risultato
                </p>
              </div>

              <div className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                Eliminazione diretta
              </div>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-hidden px-2 py-4 sm:px-4">
            <div className="flex min-w-max flex-col items-center pb-2">
              <Bracket
                teams={teams}
                matches={matches}
                onEditResult={handleEditResult}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:hidden">
          <button
            onClick={() =>
              navigate(`/tornei/nuovo/step5-eliminazione/${torneoId}`)
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-200"
          >
            Indietro
          </button>

          <button
            onClick={() => window.print()}
            className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 font-semibold text-montecarlo-secondary transition hover:bg-red-100"
          >
            🖨️ Stampa
          </button>

          <button
            onClick={() => navigate("/tornei")}
            className="w-full rounded-lg bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Salva ed Esci
          </button>
        </div>

      </div>
    </div>
  );
}