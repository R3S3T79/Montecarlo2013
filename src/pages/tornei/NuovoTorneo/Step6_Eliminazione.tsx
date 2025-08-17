// src/pages/tornei/NuovoTorneo/Step6_Eliminazione.tsx
import React, { useEffect, useState, useRef } from "react";
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
          .from<Team>("squadre")
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
          squadra_casa_id: m.squadra_casa,
          squadra_ospite_id: m.squadra_ospite,
          data_ora: m.data_match,
          ordine_fase: m.round_number,
          match_number: m.match_number,
          winner_id: m.vincitore,
          goal_casa: m.gol_casa ?? 0,
          goal_ospite: m.gol_ospite ?? 0,
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
    return <p className="text-center py-6">Caricamento…</p>;
  }

  const handleEditResult = (matchId: string) => {
    navigate(
      `/tornei/nuovo/step6-eliminazione/${torneoId}/partita/${matchId}`,
      { state: { torneoId } }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      
      <div className="overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex flex-col items-center min-w-max pb-6">
          <Bracket
            teams={teams}
            matches={matches}
            onEditResult={handleEditResult}
          />
          <div className="mt-6 flex space-x-6 print:hidden">
            <button
              onClick={() => navigate(`/tornei/nuovo/step5-eliminazione/${torneoId}`)}
              className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500"
            >
              Indietro
            </button>
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Stampa
            </button>
            <button
              onClick={() => navigate("/tornei")}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Salva ed Esci
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
