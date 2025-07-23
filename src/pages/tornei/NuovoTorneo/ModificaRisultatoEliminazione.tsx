// src/pages/tornei/NuovoTorneo/ModificaRisultatoEliminazione.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

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
  ordine_fase?: number | null;
}

export default function ModificaRisultatoEliminazione() {
  const { torneoId, id } = useParams<{ torneoId: string; id: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [teams, setTeams] = useState<Record<string, Squadra>>({});
  const [goal1, setGoal1] = useState(0);
  const [goal2, setGoal2] = useState(0);
  const [rigoriVincitore, setRigoriVincitore] = useState<string | null>(null);
  const [dataOra, setDataOra] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carica dati partita, inclusi next_match_id e ordine_fase
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: m, error: me } = await supabase
        .from<MatchRecord>("partite_torneo")
        .select(
          "squadra_casa_id,squadra_ospite_id,goal_casa,goal_ospite,rigori_vincitore,data_ora,next_match_id,ordine_fase"
        )
        .eq("id", id)
        .single();

      if (me || !m) {
        console.error("Errore fetch partita:", me);
        navigate(-1);
        return;
      }

      setMatch(m);
      setGoal1(m.goal_casa);
      setGoal2(m.goal_ospite);
      setRigoriVincitore(m.rigori_vincitore);
      setDataOra(m.data_ora ? m.data_ora.slice(0, 16) : "");

      // Carica dati squadre se definiti
      const ids = [m.squadra_casa_id, m.squadra_ospite_id].filter(Boolean) as string[];
      if (ids.length) {
        const { data: sqs } = await supabase
          .from<Squadra>("squadre")
          .select("id,nome,logo_url")
          .in("id", ids);
        if (sqs) {
          const map: Record<string, Squadra> = {};
          sqs.forEach((s) => (map[s.id] = s));
          setTeams(map);
        }
      }

      setLoading(false);
    })();
  }, [id, navigate]);

  // Salva risultato e propaga vincitore
  const handleSave = async () => {
    if (!match) return;
    setSaving(true);

    // Determina winner_id
    let winner_id: string | null = null;
    if (goal1 > goal2) winner_id = match.squadra_casa_id;
    else if (goal2 > goal1) winner_id = match.squadra_ospite_id;
    else winner_id = rigoriVincitore;

    const updates = {
      goal_casa: goal1,
      goal_ospite: goal2,
      winner_id,
      rigori_vincitore: goal1 === goal2 ? rigoriVincitore : null,
      data_ora: dataOra ? `${dataOra}:00` : null,
      stato: "Giocata",
    };

    // 1) aggiorna la partita corrente
    const { error } = await supabase
      .from("partite_torneo")
      .update(updates)
      .eq("id", id);

    // 2) se esiste next_match_id, aggiorna il record successivo
    if (!error && match.next_match_id && match.ordine_fase != null) {
      const isCasa = (match.ordine_fase % 2) === 0;
      const campo = isCasa ? "squadra_casa_id" : "squadra_ospite_id";
      await supabase
        .from("partite_torneo")
        .update({ [campo]: winner_id })
        .eq("id", match.next_match_id);
    }

    setSaving(false);
    if (error) {
      alert("Errore salvataggio: " + error.message);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return <p className="text-center py-6">Caricamento…</p>;
  }

  // Se le squadre non sono ancora definite (es. finale non pronta)
  if (!match?.squadra_casa_id || !match?.squadra_ospite_id) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:underline mb-4"
        >
          <ArrowLeft size={20} /> <span className="ml-1">Indietro</span>
        </button>
        <p className="text-center">
          Le squadre non sono ancora definite per questa partita.
        </p>
      </div>
    );
  }

  const casa = teams[match.squadra_casa_id]!;
  const ospite = teams[match.squadra_ospite_id]!;

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 hover:underline"
      >
        <ArrowLeft size={20} /> <span className="ml-1">Indietro</span>
      </button>

      <h2 className="text-xl font-semibold text-center">Modifica Risultato</h2>

      {/* CASA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {casa.logo_url && (
            <img
              src={casa.logo_url}
              alt={casa.nome}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="font-medium">{casa.nome}</span>
        </div>
        <input
          type="number"
          min={0}
          value={goal1}
          onChange={(e) => setGoal1(+e.currentTarget.value)}
          onFocus={(e) => e.currentTarget.select()}
          className="w-16 text-center border rounded"
        />
      </div>

      {/* OSPITE */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {ospite.logo_url && (
            <img
              src={ospite.logo_url}
              alt={ospite.nome}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="font-medium">{ospite.nome}</span>
        </div>
        <input
          type="number"
          min={0}
          value={goal2}
          onChange={(e) => setGoal2(+e.currentTarget.value)}
          onFocus={(e) => e.currentTarget.select()}
          className="w-16 text-center border rounded"
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
                checked={rigoriVincitore === match.squadra_casa_id}
                onChange={() => setRigoriVincitore(match.squadra_casa_id!)}
              />
              <span>{casa.nome}</span>
            </label>
            <label className="flex items-center space-x-1">
              <input
                type="radio"
                name="rigori"
                checked={rigoriVincitore === match.squadra_ospite_id}
                onChange={() => setRigoriVincitore(match.squadra_ospite_id!)}
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

      {/* SALVA */}
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
