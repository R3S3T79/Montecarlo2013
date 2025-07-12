
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from "../../../lib/supabaseClient";

interface LocationState {
  squadra1Name?: string;
  squadra2Name?: string;
  risultato1?: number | null;
  risultato2?: number | null;
  torneoId?: string;
  returnToStep?: number;
}

export default function EditRTorneo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: partitaId } = useParams<{ id: string }>();
  const state = location.state as LocationState || {};

  const [score1, setScore1] = useState(state.risultato1 ?? 0);
  const [score2, setScore2] = useState(state.risultato2 ?? 0);
  const [squadra1Name, setSquadra1Name] = useState(state.squadra1Name ?? '');
  const [squadra2Name, setSquadra2Name] = useState(state.squadra2Name ?? '');
  const [torneoId, setTorneoId] = useState(state.torneoId ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [squadra1Id, setSquadra1Id] = useState<string | null>(null);
  const [squadra2Id, setSquadra2Id] = useState<string | null>(null);
  const [rigoriVincitore, setRigoriVincitore] = useState<string | null>(null);

  useEffect(() => {
    const fetchPartita = async () => {
      if (!partitaId) return;

      try {
        const { data, error: err } = await supabase
          .from('partite_torneo')
          .select('goal_casa, goal_ospite, squadra_casa_id, squadra_ospite_id, torneo_id, rigori_vincitore')
          .eq('id', partitaId)
          .single();

        if (err || !data) throw new Error('Partita non trovata.');

        setScore1(data.goal_casa ?? 0);
        setScore2(data.goal_ospite ?? 0);
        setTorneoId(data.torneo_id);
        setSquadra1Id(data.squadra_casa_id);
        setSquadra2Id(data.squadra_ospite_id);
        setRigoriVincitore(data.rigori_vincitore ?? null);

        if (!squadra1Name || !squadra2Name) {
          const [s1, s2] = await Promise.all([
            supabase.from('squadre').select('nome').eq('id', data.squadra_casa_id).single(),
            supabase.from('squadre').select('nome').eq('id', data.squadra_ospite_id).single(),
          ]);

          if (s1.data) setSquadra1Name(s1.data.nome);
          if (s2.data) setSquadra2Name(s2.data.nome);
        }
      } catch (err: any) {
        console.error('Errore recupero partita:', err);
        setError('Impossibile caricare i dati della partita.');
      }
    };

    fetchPartita();
  }, [partitaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partitaId) {
      setError('ID partita non valido.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateFields: any = {
        goal_casa: score1,
        goal_ospite: score2
      };

      if (score1 === score2 && rigoriVincitore) {
        updateFields.rigori_vincitore = rigoriVincitore;
      } else {
        updateFields.rigori_vincitore = null;
      }

      const { error: updateError } = await supabase
        .from('partite_torneo')
        .update(updateFields)
        .eq('id', partitaId);

      if (updateError) throw updateError;

      const { data: currentMatch, error: fetchError } = await supabase
        .from("partite_torneo")
        .select("id, next_match_id, squadra_casa_id, squadra_ospite_id, rigori_vincitore")
        .eq("id", partitaId)
        .single();

      if (!fetchError && currentMatch?.next_match_id) {
        let winnerId: string | null = null;
        if (score1 > score2) {
          winnerId = currentMatch.squadra_casa_id;
        } else if (score2 > score1) {
          winnerId = currentMatch.squadra_ospite_id;
        } else if (score1 === score2) {
          winnerId = currentMatch.rigori_vincitore;
        }

        if (winnerId) {
          const { data: nextMatch, error: nextError } = await supabase
            .from("partite_torneo")
            .select("id, squadra_casa_id, squadra_ospite_id")
            .eq("id", currentMatch.next_match_id)
            .single();

          if (!nextError && nextMatch) {
            const updateField = !nextMatch.squadra_casa_id
              ? "squadra_casa_id"
              : !nextMatch.squadra_ospite_id
              ? "squadra_ospite_id"
              : null;

            if (updateField) {
              await supabase
                .from("partite_torneo")
                .update({ [updateField]: winnerId })
                .eq("id", currentMatch.next_match_id);
            }
          }
        }
      }

      navigate(`/tornei/${torneoId}/step5/eliminazione`);
    } catch (err: any) {
      console.error('Errore salvataggio:', err);
      setError('Errore durante il salvataggio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <button onClick={() => navigate(-1)} className="flex items-center mb-4 text-sm text-blue-600">
        <ArrowLeft className="mr-2" /> Torna Indietro
      </button>

      <div className="bg-white border rounded-xl shadow-md p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4 text-center">Modifica Risultato</h2>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center px-2 py-2 border-b">
            <span className="text-gray-800 font-medium">{squadra1Name}</span>
            <input
              type="number"
              value={score1}
              onChange={(e) => setScore1(Number(e.target.value))}
              className="w-16 text-center border rounded px-2 py-1"
            />
          </div>
          <div className="flex justify-between items-center px-2 py-2">
            <span className="text-gray-800 font-medium">{squadra2Name}</span>
            <input
              type="number"
              value={score2}
              onChange={(e) => setScore2(Number(e.target.value))}
              className="w-16 text-center border rounded px-2 py-1"
            />
          </div>

          {score1 === score2 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">Vincitore ai rigori:</p>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={rigoriVincitore === squadra1Id}
                    onChange={() => setRigoriVincitore(squadra1Id)}
                  />
                  <span>{squadra1Name}</span>
                </label>
                <label className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={rigoriVincitore === squadra2Id}
                    onChange={() => setRigoriVincitore(squadra2Id)}
                  />
                  <span>{squadra2Name}</span>
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Salvataggio...' : 'Salva Risultato'}
          </button>
        </form>
      </div>
    </div>
  );
}
