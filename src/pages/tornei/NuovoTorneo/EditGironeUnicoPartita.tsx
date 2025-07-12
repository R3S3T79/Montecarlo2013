// src/pages/tornei/NuovoTorneo/EditGironeUnicoPartita.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
}

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

export default function EditGironeUnicoPartita() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [partita, setPartita] = useState<Partita | null>(null);
  const [teams, setTeams] = useState<Record<string, Squadra>>({});
  const [scoreCasa, setScoreCasa] = useState(0);
  const [scoreOspite, setScoreOspite] = useState(0);
  const [rigoriUsed, setRigoriUsed] = useState(false);
  const [rigoriVincitore, setRigoriVincitore] = useState<string | null>(null);
  const [dataOra, setDataOra] = useState('');

  // fetch dati
  useEffect(() => {
    if (!matchId) return;
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
      setRigoriUsed(!!p.rigori_vincitore);
      setRigoriVincitore(p.rigori_vincitore);
      setDataOra(p.data_ora ? p.data_ora.slice(0, 16) : '');

      // carica nomi e logo delle squadre
      const ids = [p.squadra_casa_id, p.squadra_ospite_id];
      const { data: sqs } = await supabase
        .from<Squadra>('squadre')
        .select('id,nome,logo_url')
        .in('id', ids);
      if (sqs) {
        const map: Record<string, Squadra> = {};
        sqs.forEach(s => (map[s.id] = s));
        setTeams(map);
      }
      setLoading(false);
    })();
  }, [matchId]);

  const handleSave = async () => {
    if (!partita) return;
    setSaving(true);
    let winner_id: string | null = null;
    if (scoreCasa > scoreOspite) winner_id = partita.squadra_casa_id;
    else if (scoreOspite > scoreCasa) winner_id = partita.squadra_ospite_id;
    else winner_id = rigoriVincitore;

    const updates: any = {
      goal_casa: scoreCasa,
      goal_ospite: scoreOspite,
      winner_id,
      rigori_vincitore: scoreCasa === scoreOspite ? rigoriVincitore : null,
      data_ora: dataOra ? new Date(dataOra).toISOString() : null,
      stato: 'Giocata',
    };

    const { error: upErr } = await supabase
      .from('partite_torneo')
      .update(updates)
      .eq('id', partita.id);

    setSaving(false);
    if (upErr) {
      setError('Errore in salvataggio.');
    } else {
      navigate(-1);
    }
  };

  if (loading) return <p className="text-center py-6">Caricamento…</p>;
  if (error) return <p className="text-center py-6 text-red-600">{error}</p>;
  if (!partita) return <p className="text-center py-6">Partita non trovata.</p>;

  const casa = teams[partita.squadra_casa_id];
  const ospite = teams[partita.squadra_ospite_id];
  const casaName = casa?.nome || '';
  const ospiteName = ospite?.nome || '';
  const casaLogo = casa?.logo_url;
  const ospiteLogo = ospite?.logo_url;

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow space-y-6">
      {/* Torna indietro */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 hover:underline"
      >
        <ArrowLeft size={20} /> <span className="ml-1">Indietro</span>
      </button>

      <h2 className="text-xl font-semibold text-center">Modifica Risultato</h2>

      {/* Squadra Casa */}
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
          value={scoreCasa}
          onChange={e => setScoreCasa(+e.target.value)}
          onFocus={e => e.currentTarget.select()}
          className="w-16 text-center border rounded"
        />
      </div>

      {/* Squadra Ospite */}
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
          value={scoreOspite}
          onChange={e => setScoreOspite(+e.target.value)}
          onFocus={e => e.currentTarget.select()}
          className="w-16 text-center border rounded"
        />
      </div>

      {/* Rigori */}
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
              <span>{casaName}</span>
            </label>
            <label className="flex items-center space-x-1">
              <input
                type="radio"
                name="rigori"
                checked={rigoriVincitore === partita.squadra_ospite_id}
                onChange={() => setRigoriVincitore(partita.squadra_ospite_id)}
              />
              <span>{ospiteName}</span>
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

      {/* Salva */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Salvando…' : 'Salva Risultato e Esci'}
      </button>
    </div>
  );
}
