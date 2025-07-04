// src/pages/tornei/NuovoTorneo/ModificaRisultatoEliminazione.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import { ArrowLeft } from "lucide-react";

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface MatchRecord {
  squadra_casa_id: string | null;
  squadra_ospite_id: string | null;
  goal_casa: number;
  goal_ospite: number;
  rigori_vincitore: string | null;
  data_ora: string | null;
  next_match_id?: string | null;
}

export default function ModificaRisultatoEliminazione() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [teams, setTeams] = useState<Record<string, Squadra>>({});
  const [goal1, setGoal1] = useState<number>(0);
  const [goal2, setGoal2] = useState<number>(0);
  const [winnerRigori, setWinnerRigori] = useState<string | null>(null);
  const [dataOra, setDataOra] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!matchId) return;
    (async () => {
      setLoading(true);
      const { data: m, error: me } = await supabase
        .from<MatchRecord>("partite_torneo")
        .select(
          "squadra_casa_id,squadra_ospite_id,goal_casa,goal_ospite,rigori_vincitore,data_ora,next_match_id"
        )
        .eq("id", matchId)
        .single();
      if (me || !m) {
        console.error("Errore fetch partita:", me);
        navigate(-1);
        return;
      }
      setMatch(m);
      setGoal1(m.goal_casa);
      setGoal2(m.goal_ospite);
      setWinnerRigori(m.rigori_vincitore);
      setDataOra(m.data_ora ? m.data_ora.slice(0, 16) : "");

      const ids = [m.squadra_casa_id, m.squadra_ospite_id].filter(
        (id): id is string => Boolean(id)
      );
      if (ids.length) {
        const { data: sqs, error: se } = await supabase
          .from<Squadra>("squadre")
          .select("id,nome,logo_url")
          .in("id", ids);
        if (se) console.error("Errore fetch squadre:", se);
        const map: Record<string, Squadra> = {};
        sqs?.forEach((s) => (map[s.id] = s));
        setTeams(map);
      }

      setLoading(false);
    })();
  }, [matchId, navigate]);

  const handleSave = async () => {
    if (!match || !matchId) return;
    setSaving(true);

    let winner_id: string | null = null;
    if (goal1 > goal2) winner_id = match.squadra_casa_id;
    else if (goal2 > goal1) winner_id = match.squadra_ospite_id;
    else winner_id = winnerRigori;

    const updates: any = {
      goal_casa: goal1,
      goal_ospite: goal2,
      winner_id,
      rigori_vincitore: goal1 === goal2 ? winnerRigori : null,
    };
    if (dataOra) updates.data_ora = new Date(dataOra).toISOString();

    const { error } = await supabase
      .from("partite_torneo")
      .update(updates)
      .eq("id", matchId);

    // Aggiorna il prossimo match con il vincitore, se presente
    if (!error && winner_id && match.next_match_id) {
      const nextId = match.next_match_id;
      const { data: nextMatch, error: nextErr } = await supabase
        .from<MatchRecord>("partite_torneo")
        .select("squadra_casa_id,squadra_ospite_id")
        .eq("id", nextId)
        .single();
      if (!nextErr && nextMatch) {
        const fieldToSet = !nextMatch.squadra_casa_id
          ? "squadra_casa_id"
          : !nextMatch.squadra_ospite_id
          ? "squadra_ospite_id"
          : null;
        if (fieldToSet) {
          await supabase
            .from("partite_torneo")
            .update({ [fieldToSet]: winner_id })
            .eq("id", nextId);
        }
      }
    }

    setSaving(false);
    if (error) {
      alert("Errore salvataggio: " + error.message);
    } else {
      navigate(-1);
    }
  };

  // nuovo handler: aggiorna data e chiude il box
  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDataOra(newValue);
    if (!matchId) return;

    setSaving(true);
    const { error } = await supabase
      .from("partite_torneo")
      .update({ data_ora: new Date(newValue).toISOString() })
      .eq("id", matchId);
    setSaving(false);

    if (error) {
      alert("Errore aggiornamento data: " + error.message);
    } else {
      navigate(-1);
    }
  };

  if (loading || !match) {
    return <p className="text-center py-6">Caricamento…</p>;
  }

  const casaName =
    (match.squadra_casa_id && teams[match.squadra_casa_id]?.nome) ||
    "Vincente Squadra 1";
  const ospiteName =
    (match.squadra_ospite_id && teams[match.squadra_ospite_id]?.nome) ||
    "Vincente Squadra 2";
  const casaLogo =
    match.squadra_casa_id && teams[match.squadra_casa_id]?.logo_url;
  const ospiteLogo =
    match.squadra_ospite_id && teams[match.squadra_ospite_id]?.logo_url;

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 hover:underline"
      >
        <ArrowLeft size={20} /> <span className="ml-1">Indietro</span>
      </button>

      <h2 className="text-xl font-semibold text-center">
        Modifica Risultato
      </h2>

      {/* Squadra di casa */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {casaLogo && (
            <img
              src={casaLogo}
              alt={casaName}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="font-medium">{casaName}</span>
        </div>
        <input
          type="number"
          min={0}
          value={goal1}
          onChange={(e) => setGoal1(Number(e.target.value))}
          onFocus={(e) => e.currentTarget.select()}
          className="w-16 text-center border rounded"
        />
      </div>

      {/* Squadra ospite */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {ospiteLogo && (
            <img
              src={ospiteLogo}
              alt={ospiteName}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="font-medium">{ospiteName}</span>
        </div>
        <input
          type="number"
          min={0}
          value={goal2}
          onChange={(e) => setGoal2(Number(e.target.value))}
          onFocus={(e) => e.currentTarget.select()}
          className="w-16 text-center border rounded"
        />
      </div>

      {/* Rigori se pareggio */}
      {goal1 === goal2 && (
        <div className="space-y-1">
          <span className="font-medium">Vincitore ai rigori:</span>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-1">
              <input
                type="radio"
                name="rigori"
                checked={winnerRigori === match.squadra_casa_id}
                onChange={() => setWinnerRigori(match.squadra_casa_id)}
              />
              <span>{casaName}</span>
            </label>
            <label className="flex items-center space-x-1">
              <input
                type="radio"
                name="rigori"
                checked={winnerRigori === match.squadra_ospite_id}
                onChange={() => setWinnerRigori(match.squadra_ospite_id)}
              />
              <span>{ospiteName}</span>
            </label>
          </div>
        </div>
      )}

      {/* Data/Ora */}
      <div>
        <label className="block mb-1 font-medium">
          Data &amp; Ora Incontro
        </label>
        <input
          type="datetime-local"
          value={dataOra}
          onChange={handleDateChange}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* Salva */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salva Risultato e Esci"}
      </button>
    </div>
  );
}
