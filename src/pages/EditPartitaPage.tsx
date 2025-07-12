// src/pages/EditPartitaPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface Squadra {
  id: string;
  nome: string;
}

interface Stagione {
  id: string;
  nome: string;
}

interface Partita {
  id: string;
  stagione_id: string;
  data_ora: string;
  stato: string;
  squadra_casa_id: string;
  squadra_ospite_id: string;
  campionato_torneo: string;
  luogo_torneo: string | null;
}

export default function EditPartitaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [formData, setFormData] = useState<Omit<Partita, 'id' | 'data_ora'> & {
    data: string;
    ora: string;
    campionato_torneo: string;
    luogo_torneo: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch squadre
        const { data: squadreData } = await supabase
          .from('squadre')
          .select('id, nome')
          .order('nome');
        if (squadreData) setSquadre(squadreData);

        // Fetch stagioni
        const { data: stagioniData } = await supabase
          .from('stagioni')
          .select('id, nome')
          .order('data_inizio', { ascending: false });
        if (stagioniData) setStagioni(stagioniData);

        // Fetch partita
        const { data: partitaData, error } = await supabase
          .from('partite')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        if (partitaData) {
          const dt = new Date(partitaData.data_ora);
          setFormData({
            stagione_id: partitaData.stagione_id,
            data: dt.toISOString().split('T')[0],
            ora: dt.toTimeString().slice(0, 5),
            stato: partitaData.stato,
            squadra_casa_id: partitaData.squadra_casa_id,
            squadra_ospite_id: partitaData.squadra_ospite_id,
            campionato_torneo: partitaData.campionato_torneo,
            luogo_torneo: partitaData.luogo_torneo || '',
          });
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setLoading(true);
    try {
      const dataOra = new Date(`${formData.data}T${formData.ora}`).toISOString();
      const { error } = await supabase
        .from('partite')
        .update({
          stagione_id: formData.stagione_id,
          data_ora: dataOra,
          stato: formData.stato,
          squadra_casa_id: formData.squadra_casa_id,
          squadra_ospite_id: formData.squadra_ospite_id,
          // qui salviamo il valore con la "C" maiuscola
          campionato_torneo: formData.campionato_torneo,
          luogo_torneo: formData.luogo_torneo || null,
        })
        .eq('id', id);

      if (error) throw error;
      navigate('/calendario');
    } catch (err) {
      console.error('Error updating match:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Caricamento...</div>;
  if (!formData) return <div className="p-6">Partita non trovata</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Modifica Partita</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Data e ora */}
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            value={formData.data}
            onChange={e => setFormData({ ...formData, data: e.target.value })}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="time"
            value={formData.ora}
            onChange={e => setFormData({ ...formData, ora: e.target.value })}
            className="border rounded px-3 py-2"
            required
          />
        </div>

        {/* Stagione */}
        <select
          value={formData.stagione_id}
          onChange={e => setFormData({ ...formData, stagione_id: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        >
          <option value="">Seleziona stagione</option>
          {stagioni.map(s => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>

        {/* Squadre */}
        <select
          value={formData.squadra_casa_id}
          onChange={e => setFormData({ ...formData, squadra_casa_id: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        >
          <option value="">Squadra Casa</option>
          {squadre.map(s => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
        <select
          value={formData.squadra_ospite_id}
          onChange={e => setFormData({ ...formData, squadra_ospite_id: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        >
          <option value="">Squadra Ospite</option>
          {squadre.map(s => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>

        {/* Stato */}
        <select
          value={formData.stato}
          onChange={e => setFormData({ ...formData, stato: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        >
          <option value="DaGiocare">Da Giocare</option>
          <option value="Giocata">Giocata</option>
        </select>

        {/* Campionato/Torneo con C maiuscola */}
        <select
          value={formData.campionato_torneo}
          onChange={e => setFormData({ ...formData, campionato_torneo: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        >
          <option value="Campionato">Campionato</option>
          <option value="Torneo">Torneo</option>
          <option value="Amichevole">Amichevole</option>
        </select>

        {/* Luogo */}
        <input
          type="text"
          placeholder="Luogo (opzionale)"
          value={formData.luogo_torneo}
          onChange={e => setFormData({ ...formData, luogo_torneo: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />

        {/* Pulsanti */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/calendario')}
            className="px-4 py-2 text-gray-600"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </form>
    </div>
  );
}
