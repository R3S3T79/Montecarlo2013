// src/pages/tornei/NuovoTorneo/Step6_Eliminazione.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Bracket from "../../../components/Bracket";
import { Team, MatchData } from "../../../types";

export default function Step6_Eliminazione() {
  const { torneoId } = useParams<{ torneoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [torneoNome, setTorneoNome] = useState<string>("Torneo");
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // ricarica ad ogni cambio di location.key (quando torni dal form)
  useEffect(() => {
    if (!torneoId) {
      navigate("/tornei");
      return;
    }

    setLoading(true);
    (async () => {
      // 1) prendi nome del torneo
      const { data: tData, error: tErr } = await supabase
        .from("tornei")
        .select("nome")
        .eq("id", torneoId)
        .single();
      if (!tErr && tData?.nome) {
        setTorneoNome(tData.nome);
      }

      // 2) carica squadre
      const { data: squadreData, error: sqErr } = await supabase
        .from("squadre")
        .select("id, nome, logo_url");
      if (sqErr) {
        console.error("Errore fetch squadre:", sqErr);
      } else {
        setTeams(squadreData || []);
      }

      // 3) carica partite eliminazione
      const { data: partiteData, error: pErr } = await supabase
        .from<MatchData>("partite_torneo")
        .select(
          "id, squadra_casa_id, squadra_ospite_id, data_ora, next_match_id, winner_id, ordine_fase, goal_casa, goal_ospite"
        )
        .eq("torneo_id", torneoId)
        .eq("is_finale", false)
        .order("created_at", { ascending: true });
      if (pErr) {
        console.error("Errore fetch partite eliminazione:", pErr);
      } else {
        setMatches(partiteData || []);
      }

      setLoading(false);
    })();
  }, [torneoId, navigate, location.key]);

  if (loading) {
    return <p className="text-center py-6">Caricamento in corso…</p>;
  }

  const handleEditResult = (matchId: string) => {
    navigate(
      `/tornei/nuovo/step6-eliminazione/${torneoId}/edit/${matchId}`,
      { state: { torneoId } }
    );
  };

  const handlePrint = () => window.print();
  const handleSaveAndExit = () => navigate("/tornei");

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Titolo torneo sopra il bracket */}
      <h2 className="text-2xl font-bold text-center">
        {torneoNome}
      </h2>

      <Bracket
        teams={teams}
        matches={matches}
        onEditResult={handleEditResult}
      />

      <div className="mt-6 flex justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Indietro
        </button>
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Stampa
        </button>
        <button
          onClick={handleSaveAndExit}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Salva ed Esci
        </button>
      </div>
    </div>
  );
}
