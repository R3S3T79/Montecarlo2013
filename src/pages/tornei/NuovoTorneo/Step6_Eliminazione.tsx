// src/pages/tornei/NuovoTorneo/Step6_Eliminazione.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Outlet } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Bracket from "../../../components/Bracket";
import { Team, MatchData } from "../../../types";
import { useAuth } from "../../../context/AuthContext";
import { UserRole } from "../../../lib/roles";

export default function Step6_Eliminazione() {
  const { torneoId } = useParams<{ torneoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, loading: authLoading } = useAuth();
  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  const canEdit = role === UserRole.Admin || role === UserRole.Creator;

  const [torneoNome, setTorneoNome] = useState<string>("Torneo");
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!torneoId) {
      navigate("/tornei");
      return;
    }
    setLoading(true);
    (async () => {
      // 1) Nome del torneo
      const { data: tData } = await supabase
        .from("tornei")
        .select("nome")
        .eq("id", torneoId)
        .single();
      if (tData?.nome) setTorneoNome(tData.nome);

      // 2) Squadre disponibili
      const { data: squadreData } = await supabase
        .from<Team>("squadre")
        .select("id, nome, logo_url");
      if (squadreData) setTeams(squadreData);

      // 3) Partite di eliminazione (escludi finale)
      const { data: partiteData } = await supabase
        .from<MatchData>("partite_torneo")
        .select(
          [
            "id",
            "squadra_casa_id",
            "squadra_ospite_id",
            "data_ora",
            "next_match_id",
            "winner_id",
            "ordine_fase",
            "goal_casa",
            "goal_ospite",
          ].join(", ")
        )
        .eq("torneo_id", torneoId)
        .eq("is_finale", false)
        .order("created_at", { ascending: true });
      if (partiteData) setMatches(partiteData);

      setLoading(false);
    })();
  }, [torneoId, navigate, location.key]);

  if (authLoading || loading) {
    return <p className="text-center py-6">Caricamento in corso…</p>;
  }

  const handleEditResult = (matchId: string) => {
    if (!canEdit) return; // normal users non fanno nulla
    navigate(
      `/tornei/nuovo/step6-eliminazione/${torneoId}/edit/${matchId}`,
      { state: { torneoId } }
    );
  };

  const handlePrint = () => window.print();
  const handleSaveAndExit = () => navigate("/tornei");
  const handleExit = () => navigate("/tornei");

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Titolo torneo */}
      <h2 className="text-2xl font-bold text-center">{torneoNome}</h2>

      {/* Bracket: sempre con cursore a mano, click attivo ma gestito solo da canEdit */}
      <Bracket
        teams={teams}
        matches={matches}
        onEditResult={canEdit ? handleEditResult : undefined}
      />

      {/* Pulsanti (stampabile) */}
      <div className="mt-6 flex justify-center space-x-4 print:hidden">
        {/* Indietro solo per chi edita */}
        {canEdit && (
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
          >
            Indietro
          </button>
        )}

        {/* Stampa per tutti */}
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Stampa
        </button>

        {/* Salva+Esci per admin/creator, Esci per gli altri */}
        {canEdit ? (
          <button
            onClick={handleSaveAndExit}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Salva ed Esci
          </button>
        ) : (
          <button
            onClick={handleExit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Esci
          </button>
        )}
      </div>

      {/* Outlet per i nested routes di editing (solo per chi edita) */}
      {canEdit && <Outlet />}
    </div>
  );
}
