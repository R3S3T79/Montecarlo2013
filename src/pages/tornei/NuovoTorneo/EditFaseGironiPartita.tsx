// src/pages/tornei/NuovoTorneo/EditFaseGironiPartita.tsx
// Data creazione chat: 29/07/2025

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface Partita {
  id: string;
  gol_casa: number | null;
  gol_ospite: number | null;
  rigori_vincitore: string | null;
  data_match: string | null;
  squadra_casa: Squadra;
  squadra_ospite: Squadra;
}

export default function EditFaseGironiPartita() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [partita, setPartita] = useState<Partita | null>(null);
  const [scoreCasa, setScoreCasa] = useState(0);
  const [scoreOspite, setScoreOspite] = useState(0);
  const [rigoriVincitore, setRigoriVincitore] = useState<string | null>(null);
  const [dataOra, setDataOra] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tornei_fasegironi')
        .select(`
          id,
          gol_casa,
          gol_ospite,
          rigori_vincitore,
          data_match,
          squadra_casa:squadra_casa(id,nome,logo_url),
          squadra_ospite:squadra_ospite(id,nome,logo_url)
        `)
        .eq('id', matchId)
        .single();
      if (error || !data) {
        console.error('Errore fetch partita:', error);
        setLoading(false);
        return;
      }
      setPartita(data);
      setScoreCasa(data.gol_casa ?? 0);
      setScoreOspite(data.gol_ospite ?? 0);
      setRigoriVincitore(data.rigori_vincitore);
      setDataOra(data.data_match ? data.data_match.slice(0, 16) : '');
      setLoading(false);
    })();
  }, [matchId]);

  const isDraw = scoreCasa === scoreOspite;

  const handleSaveAll = async () => {
  if (!partita || !matchId) return;
  setSaving(true);
  const updates = {
    gol_casa: scoreCasa,
    gol_ospite: scoreOspite,
    rigori_vincitore: isDraw ? rigoriVincitore : null,
    data_match: dataOra || null,   // 🔑 salva diretto, senza new Date
    giocata: true,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('tornei_fasegironi')
    .update(updates)
    .eq('id', matchId);
  setSaving(false);
  if (error) alert('Errore salvataggio: ' + error.message);
  else navigate(-1);
};

const handleSaveDateOnly = async () => {
  if (!partita || !matchId) return;
  setSaving(true);
  const { error } = await supabase
    .from('tornei_fasegironi')
    .update({
      data_match: dataOra || null,  // 🔑 idem qui
      giocata: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId);
  setSaving(false);
  if (error) alert('Errore salvataggio data: ' + error.message);
  else navigate(-1);
};


  if (loading) return <p className="text-center py-6">Caricamento…</p>;
  if (!partita) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
        <p className="text-center">Partita non trovata.</p>
      </div>
    );
  }

  const casa = partita.squadra_casa;
  const ospite = partita.squadra_ospite;

  return (
    <div className="max-w-md mx-auto mt-2 p-6 bg-white/85 rounded-lg shadow space-y-6">
     

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
          <span className="font-medium">{casa.nome}</span>
        </div>
        <input
          type="number"
          min={0}
          value={scoreCasa}
          onChange={(e) => setScoreCasa(+e.currentTarget.value)}
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
          <span className="font-medium">{ospite.nome}</span>
        </div>
        <input
          type="number"
          min={0}
          value={scoreOspite}
          onChange={(e) => setScoreOspite(+e.currentTarget.value)}
          onFocus={(e) => e.currentTarget.select()}
          className="w-16 text-center border rounded text-xl font-bold hover:ring-2 hover:ring-blue-300"
        />
      </div>

      {/* RIGORI (solo se pareggio) */}
      {isDraw && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-700">
            Vincitore ai rigori
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              checked={rigoriVincitore === casa.id}
              onChange={() => setRigoriVincitore(casa.id)}
            />
            <span>{casa.nome}</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              checked={rigoriVincitore === ospite.id}
              onChange={() => setRigoriVincitore(ospite.id)}
            />
            <span>{ospite.nome}</span>
          </label>
        </div>
      )}

      {/* DATA & ORA */}
      <div>
        <label className="block mb-1 font-medium">
          Data &amp; Ora Incontro
        </label>
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
          onClick={handleSaveAll}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Salvataggio…" : "Salva Risultato e Data"}
        </button>
        <button
          onClick={handleSaveDateOnly}
          disabled={saving}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Salvataggio…" : "Salva Solo Data"}
        </button>
      </div>
    </div>
  );
}
