// src/pages/tornei/NuovoTorneo/EditFaseGironiPartita.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface Partita {
  id: string;
  goal_casa: number;
  goal_ospite: number;
  rigori_vincitore: string | null;
  data_ora: string | null;
  squadra_casa: Squadra;
  squadra_ospite: Squadra;
}

export default function EditFaseGironiPartita() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [partita, setPartita] = useState<Partita | null>(null);
  const [casaGol, setCasaGol] = useState(0);
  const [ospiteGol, setOspiteGol] = useState(0);
  const [rigoriWinner, setRigoriWinner] = useState<string | null>(null);
  const [dataOra, setDataOra] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!matchId) return;
      setLoading(true);

      const { data, error } = await supabase
        .from<Partita>('partite_torneo')
        .select(`
          id,
          goal_casa,
          goal_ospite,
          rigori_vincitore,
          data_ora,
          squadra_casa: squadra_casa_id(id,nome,logo_url),
          squadra_ospite: squadra_ospite_id(id,nome,logo_url)
        `)
        .eq('id', matchId)
        .single();

      if (error || !data) {
        console.error('Errore fetch partita:', error);
        setLoading(false);
        return;
      }
      setPartita(data);
      setCasaGol(data.goal_casa);
      setOspiteGol(data.goal_ospite);
      setRigoriWinner(data.rigori_vincitore);
      setDataOra(data.data_ora ? data.data_ora.slice(0, 16) : '');
      setLoading(false);
    })();
  }, [matchId]);

  const handleSave = async () => {
    if (!partita || !matchId) return;
    setLoading(true);

    const isDraw = casaGol === ospiteGol;
    const rigori = isDraw ? rigoriWinner : null;

    const updates: Partial<Partita> = {
      goal_casa: casaGol,
      goal_ospite: ospiteGol,
      rigori_vincitore: rigori,
      data_ora: dataOra ? new Date(dataOra).toISOString() : null,
      stato: 'Giocata',
    };

    const { error } = await supabase
      .from('partite_torneo')
      .update(updates)
      .eq('id', matchId);

    setLoading(false);
    if (error) {
      alert('Errore durante il salvataggio: ' + error.message);
    } else {
      navigate(-1);
    }
  };

  if (loading || !partita) {
    return <p className="text-center py-6">Caricamento…</p>;
  }

  const isDraw = casaGol === ospiteGol;

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 hover:underline mb-4"
      >
        <ArrowLeft size={20} /><span className="ml-1">Torna indietro</span>
      </button>

      <h2 className="text-xl font-semibold text-center mb-6">
        Modifica Risultato
      </h2>

      {/* Casa */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {partita.squadra_casa.logo_url && (
            <img
              src={partita.squadra_casa.logo_url}
              alt={partita.squadra_casa.nome}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="font-medium">{partita.squadra_casa.nome}</span>
        </div>
        <input
          type="number"
          min={0}
          value={casaGol}
          onChange={e => setCasaGol(+e.target.value)}
          onFocus={e => e.currentTarget.select()}
          className="w-16 text-center border rounded"
        />
      </div>

      {/* Ospite */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          {partita.squadra_ospite.logo_url && (
            <img
              src={partita.squadra_ospite.logo_url}
              alt={partita.squadra_ospite.nome}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="font-medium">{partita.squadra_ospite.nome}</span>
        </div>
        <input
          type="number"
          min={0}
          value={ospiteGol}
          onChange={e => setOspiteGol(+e.target.value)}
          onFocus={e => e.currentTarget.select()}
          className="w-16 text-center border rounded"
        />
      </div>

      {/* Rigori */}
      {isDraw && (
        <div className="mb-6">
          <p className="mb-2 font-medium text-center">Vincitore ai rigori:</p>
          <div className="flex justify-center space-x-4">
            <label className="flex items-center space-x-1">
              <input
                type="radio"
                name="rigori"
                checked={rigoriWinner === partita.squadra_casa.id}
                onChange={() => setRigoriWinner(partita.squadra_casa.id)}
              />
              <span>{partita.squadra_casa.nome}</span>
            </label>
            <label className="flex items-center space-x-1">
              <input
                type="radio"
                name="rigori"
                checked={rigoriWinner === partita.squadra_ospite.id}
                onChange={() => setRigoriWinner(partita.squadra_ospite.id)}
              />
              <span>{partita.squadra_ospite.nome}</span>
            </label>
          </div>
        </div>
      )}

      {/* Data & Ora */}
      <div className="mb-6">
        <label className="block mb-1 font-medium">Data &amp; Ora Incontro</label>
        <input
          type="datetime-local"
          value={dataOra}
          onChange={e => {
            setDataOra(e.target.value);
            e.currentTarget.blur();      // ← chiude il calendario subito
          }}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* Salva */}
      <button
        onClick={handleSave}
        disabled={loading || (isDraw && !rigoriWinner)}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Salva risultato
      </button>
    </div>
  );
}
