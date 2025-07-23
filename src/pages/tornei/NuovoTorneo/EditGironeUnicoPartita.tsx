// src/pages/tornei/NuovoTorneo/EditGironeUnicoPartita.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface Partita {
  id: string;
  squadra_casa_id: string;
  squadra_ospite_id: string;
  goal_casa: number | null;
  goal_ospite: number | null;
  rigori_vincitore: string | null;
  stato: string;
  data_ora: string | null;
}

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

export default function EditGironeUnicoPartita() {
  const { id: matchId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [savingResult, setSavingResult] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [partita, setPartita] = useState<Partita | null>(null);
  const [teams, setTeams] = useState<Record<string, Squadra>>({});
  const [scoreCasa, setScoreCasa] = useState(0);
  const [scoreOspite, setScoreOspite] = useState(0);
  const [rigoriVincitore, setRigoriVincitore] = useState<string | null>(null);
  const [dataOra, setDataOra] = useState('');

  // Carica la partita e le squadre
  useEffect(() => {
    if (!matchId) {
      setError('ID partita mancante');
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data: p, error: pe } = await supabase
        .from<Partita>('partite_torneo')
        .select('*')
        .eq('id', matchId)
        .single();
      if (pe || !p) {
        setError('Impossibile caricare la partita.');
        setLoading(false);
        return;
      }
      setPartita(p);
      setScoreCasa(p.goal_casa ?? 0);
      setScoreOspite(p.goal_ospite ?? 0);
      setRigoriVincitore(p.rigori_vincitore);
      setDataOra(p.data_ora ? p.data_ora.slice(0, 16) : '');

      const ids = [p.squadra_casa_id, p.squadra_ospite_id];
      const { data: sqs } = await supabase
        .from<Squadra>('squadre')
        .select('id, nome, logo_url')
        .in('id', ids);
      if (sqs) {
        const map: Record<string, Squadra> = {};
        sqs.forEach(s => (map[s.id] = s));
        setTeams(map);
      }
      setLoading(false);
    })();
  }, [matchId]);

  // Salva risultato + data
  const handleSaveResult = async () => {
    if (!partita) return;
    setSavingResult(true);

    let winner_id: string | null = null;
    if (scoreCasa > scoreOspite) winner_id = partita.squadra_casa_id;
    else if (scoreOspite > scoreCasa) winner_id = partita.squadra_ospite_id;
    else winner_id = rigoriVincitore;

    const updates = {
      goal_casa: scoreCasa,
      goal_ospite: scoreOspite,
      winner_id,
      rigori_vincitore: scoreCasa === scoreOspite ? rigoriVincitore : null,
      data_ora: dataOra ? `${dataOra}:00` : null,
      stato: 'Giocata',
    };

    const { error: upErr } = await supabase
      .from('partite_torneo')
      .update(updates)
      .eq('id', partita.id);

    setSavingResult(false);
    if (upErr) {
      setError('Errore in salvataggio risultato.');
    } else {
      navigate(-1);
    }
  };

  // Salva solo la data
  const handleSaveDate = async () => {
    if (!partita) return;
    setSavingDate(true);

    const { error: upErr } = await supabase
      .from('partite_torneo')
      .update({ data_ora: dataOra ? `${dataOra}:00` : null })
      .eq('id', partita.id);

    setSavingDate(false);
    if (upErr) {
      setError('Errore in salvataggio data.');
    } else {
      navigate(-1);
    }
  };

  if (loading) return <p className="text-center py-6">Caricamento…</p>;
  if (error)   return <p className="text-center py-6 text-red-600">{error}</p>;
  if (!partita) return <p className="text-center py-6">Partita non trovata.</p>;

  const casa   = teams[partita.squadra_casa_id];
  const ospite = teams[partita.squadra_ospite_id];

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-blue-600 hover:underline">
        <ArrowLeft size={20} /> <span className="ml-1">Indietro</span>
      </button>

      <h2 className="text-xl font-semibold text-center">Modifica Risultato</h2>

      {/* Squadra Casa */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {casa?.logo_url && <img src={casa.logo_url} alt={casa.nome} className="w-8 h-8 rounded-full" />}
          <span className="font-medium">{casa?.nome}</span>
        </div>
        <input
          type="number"
          min={0}
          value={scoreCasa}
          onChange={e => setScoreCasa(+e.target.value)}
          onFocus={e => e.currentTarget.select()}
          className="w-16 text-center border rounded"
        />
      </div>

      {/* Squadra Ospite */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {ospite?.logo_url && <img src={ospite.logo_url} alt={ospite.nome} className="w-8 h-8 rounded-full" />}
          <span className="font-medium">{ospite?.nome}</span>
        </div>
        <input
          type="number"
          min={0}
          value={scoreOspite}
          onChange={e => setScoreOspite(+e.target.value)}
          onFocus={e => e.currentTarget.select()}
          className="w-16 text-center border rounded"
        />
      </div>

      {/* Rigori se pareggio */}
      {scoreCasa === scoreOspite && (
        <div className="space-y-1">
          <span className="font-medium">Vincitore ai rigori:</span>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-1">
              <input
                type="radio"
                name="rigori"
                checked={rigoriVincitore === partita.squadra_casa_id}
                onChange={() => setRigoriVincitore(partita.squadra_casa_id)}
              />
              <span>{casa?.nome}</span>
            </label>
            <label className="flex items-center space-x-1">
              <input
                type="radio"
                name="rigori"
                checked={rigoriVincitore === partita.squadra_ospite_id}
                onChange={() => setRigoriVincitore(partita.squadra_ospite_id)}
              />
              <span>{ospite?.nome}</span>
            </label>
          </div>
        </div>
      )}

      {/* Data & Ora */}
      <div>
        <label className="block mb-1 font-medium">Data &amp; Ora Incontro</label>
        <input
          type="datetime-local"
          value={dataOra}
          onChange={e => setDataOra(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* Pulsanti */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleSaveResult}
          disabled={savingResult}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {savingResult ? 'Salvando risultato…' : 'Salva Risultato e Data'}
        </button>
        <button
          onClick={handleSaveDate}
          disabled={savingDate}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {savingDate ? 'Salvando data…' : 'Salva Solo Data'}
        </button>
      </div>
    </div>
  );
}
