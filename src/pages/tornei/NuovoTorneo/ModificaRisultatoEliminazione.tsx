// src/pages/tornei/NuovoTorneo/ModificaRisultatoEliminazione.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface MatchRecord {
  id: string;
  squadra_casa: string | null;
  squadra_ospite: string | null;
  gol_casa: number;
  gol_ospite: number;
  rigori_vincitore: string | null;
  data_match: string | null;
  match_number: number;
  round_number: number;
  next_match_id: string | null;
}

export default function ModificaRisultatoEliminazione() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [teams, setTeams] = useState<{ [key: string]: Squadra }>({});
  const [goal1, setGoal1] = useState(0);
  const [goal2, setGoal2] = useState(0);
  const [rigoriVincitore, setRigoriVincitore] = useState<string | null>(null);
  const [dataOra, setDataOra] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from("tornei_eliminazione")
        .select(
          "id, squadra_casa, squadra_ospite, gol_casa, gol_ospite, rigori_vincitore, data_match, match_number, round_number, next_match_id"
        )
        .eq("id", id)
        .single();
      if (!m) {
        navigate(-1);
        return;
      }
      setMatch(m);
      setGoal1(m.gol_casa);
      setGoal2(m.gol_ospite);
      setRigoriVincitore(m.rigori_vincitore);
      setDataOra(m.data_match ? m.data_match.slice(0, 16) : "");

      const ids = [m.squadra_casa, m.squadra_ospite].filter(Boolean) as string[];
      if (ids.length) {
        const { data: sqs } = await supabase
          .from("squadre")
          .select("id,nome,logo_url")
          .in("id", ids);
        if (sqs) {
          const map: { [key: string]: Squadra } = {};
          sqs.forEach((s) => (map[s.id] = s));
          setTeams(map);
        }
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  const handleSaveResults = async () => {
    if (!match || !id) return;
    setSaving(true);

    let winner_id: string | null = null;
    if (goal1 > goal2) winner_id = match.squadra_casa;
    else if (goal2 > goal1) winner_id = match.squadra_ospite;
    else winner_id = rigoriVincitore;

    const updates = {
      gol_casa: goal1,
      gol_ospite: goal2,
      rigori_vincitore: goal1 === goal2 ? rigoriVincitore : null,
      data_match: dataOra ? `${dataOra}:00` : null,
      vincitore: winner_id,
    };

    const { error: saveErr } = await supabase
      .from("tornei_eliminazione")
      .update(updates)
      .eq("id", id);

    if (!saveErr && winner_id && match.next_match_id) {
      const campo = match.match_number % 2 === 1 ? "squadra_casa" : "squadra_ospite";
      await supabase
        .from("tornei_eliminazione")
        .update({ [campo]: winner_id })
        .eq("id", match.next_match_id);
    }

    setSaving(false);
    if (saveErr) {
      alert("Errore salvataggio: " + saveErr.message);
    } else {
      navigate(-1);
    }
  };

  const handleSaveDateOnly = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("tornei_eliminazione")
      .update({ data_match: dataOra ? `${dataOra}:00` : null })
      .eq("id", id);
    setSaving(false);
    if (error) {
      alert("Errore salvataggio data: " + error.message);
    } else {
      navigate(-1);
    }
  };
  if (loading) {
    return <p className="text-center py-6">Caricamento…</p>;
  }

  if (!match?.squadra_casa || !match?.squadra_ospite) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
        <p className="text-center">
          Le squadre non sono ancora definite per questa partita.
        </p>
      </div>
    );
  }

  const casa = teams[match.squadra_casa]!;
  const ospite = teams[match.squadra_ospite]!;

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow space-y-6">
      <h2 className="text-xl font-semibold text-center border-b pb-2 mb-4">
        Modifica Risultato
      </h2>

      {/* CASA */}
      <div className="text-xs text-gray-500 uppercase mb-1">Casa</div>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
        <div className="flex items-center space-x-2">
          {casa.logo_url && (
            <img
              src={casa.logo_url}
              alt={casa.nome}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className={`font-medium ${
            goal1 === goal2 && rigoriVincitore === match.squadra_casa
              ? "text-green-600"
              : ""
          }`}>
            {casa.nome}{" "}
            {goal1 === goal2 && rigoriVincitore === match.squadra_casa && "🏆"}
          </span>
        </div>
        <input
          type="number"
          min={0}
          value={goal1}
          onChange={(e) => setGoal1(+e.currentTarget.value)}
          onFocus={(e) => e.currentTarget.select()}
          className="w-16 text-center border rounded text-xl font-bold hover:ring-2 hover:ring-blue-300"
        />
      </div>

      {/* OSPITE */}
      <div className="text-xs text-gray-500 uppercase mb-1">Ospite</div>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
        <div className="flex items-center space-x-2">
          {ospite.logo_url && (
            <img
              src={ospite.logo_url}
              alt={ospite.nome}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className={`font-medium ${
            goal1 === goal2 && rigoriVincitore === match.squadra_ospite
              ? "text-green-600"
              : ""
          }`}>
            {ospite.nome}{" "}
            {goal1 === goal2 && rigoriVincitore === match.squadra_ospite && "🏆"}
          </span>
        </div>
        <input
          type="number"
          min={0}
          value={goal2}
          onChange={(e) => setGoal2(+e.currentTarget.value)}
          onFocus={(e) => e.currentTarget.select()}
          className="w-16 text-center border rounded text-xl font-bold hover:ring-2 hover:ring-blue-300"
        />
      </div>

      {/* RIGORI */}
      {goal1 === goal2 && (
        <div className="space-y-1">
          <span className="font-medium">Vincitore ai rigori:</span>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-1">
              <input
                type="radio"
                name="rigori"
                checked={rigoriVincitore === match.squadra_casa}
                onChange={() => setRigoriVincitore(match.squadra_casa!)}
              />
              <span>{casa.nome}</span>
            </label>
            <label className="flex items-center space-x-1">
              <input
                type="radio"
                name="rigori"
                checked={rigoriVincitore === match.squadra_ospite}
                onChange={() => setRigoriVincitore(match.squadra_ospite!)}
              />
              <span>{ospite.nome}</span>
            </label>
          </div>
        </div>
      )}

      {/* DATA & ORA */}
      <div>
        <label className="block mb-1 font-medium">Data &amp; Ora Incontro</label>
        <input
          type="datetime-local"
          value={dataOra}
          onChange={(e) => setDataOra(e.currentTarget.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* PULSANTI */}
      <div className="space-y-3">
        <button
          onClick={handleSaveResults}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salva Risultato e Data"}
        </button>
        <button
          onClick={handleSaveDateOnly}
          disabled={saving}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salva Solo Data"}
        </button>
      </div>
    </div>
  );
}
