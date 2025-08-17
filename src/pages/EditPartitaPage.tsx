// src/pages/EditPartitaPage.tsx
// Data creazione chat: 2025-07-26

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
  const [formData, setFormData] = useState<
    Omit<Partita, 'id' | 'data_ora'> & { data: string; ora: string }
  >({
    stagione_id: '',
    data: '',
    ora: '',
    stato: 'DaGiocare',
    squadra_casa_id: '',
    squadra_ospite_id: '',
    campionato_torneo: 'Campionato',
    luogo_torneo: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: squadreData } = await supabase
          .from('squadre')
          .select('id, nome')
          .order('nome');
        if (squadreData) setSquadre(squadreData);

        const { data: stagioniData } = await supabase
          .from('stagioni')
          .select('id, nome')
          .order('data_inizio', { ascending: false });
        if (stagioniData) setStagioni(stagioniData);

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
          campionato_torneo: formData.campionato_torneo,
          luogo_torneo: formData.luogo_torneo || null,
        })
        .eq('id', id);
      if (error) throw error;
      navigate('/calendario');
    } catch (err) {
      console.error('Error updating match:', err);
      alert('Salvataggio fallito');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B7280] to-[#bfb9b9]">
        <div className="text-white text-lg">Caricamento…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-10 px-4 pb-6">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-montecarlo p-6">
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              value={formData.data}
              onChange={e =>
                setFormData({ ...formData, data: e.target.value })
              }
              className="w-full border border-montecarlo-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-montecarlo-accent"
              required
            />
            <input
              type="time"
              value={formData.ora}
              onChange={e =>
                setFormData({ ...formData, ora: e.target.value })
              }
              className="w-full border border-montecarlo-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-montecarlo-accent"
              required
            />
          </div>

          <select
            value={formData.stagione_id}
            onChange={e =>
              setFormData({ ...formData, stagione_id: e.target.value })
            }
            className="w-full border border-montecarlo-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-montecarlo-accent"
            required
          >
            <option value="">Seleziona stagione</option>
            {stagioni.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>

          <select
            value={formData.squadra_casa_id}
            onChange={e =>
              setFormData({ ...formData, squadra_casa_id: e.target.value })
            }
            className="w-full border border-montecarlo-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-montecarlo-accent"
            required
          >
            <option value="">Squadra Casa</option>
            {squadre.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>

          <select
            value={formData.squadra_ospite_id}
            onChange={e =>
              setFormData({ ...formData, squadra_ospite_id: e.target.value })
            }
            className="w-full border border-montecarlo-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-montecarlo-accent"
            required
          >
            <option value="">Squadra Ospite</option>
            {squadre.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>

          <select
            value={formData.stato}
            onChange={e => setFormData({ ...formData, stato: e.target.value })}
            className="w-full border border-montecarlo-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-montecarlo-accent"
            required
          >
            <option value="DaGiocare">Da Giocare</option>
            <option value="Giocata">Giocata</option>
          </select>

          <select
            value={formData.campionato_torneo}
            onChange={e =>
              setFormData({ ...formData, campionato_torneo: e.target.value })
            }
            className="w-full border border-montecarlo-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-montecarlo-accent"
            required
          >
            <option value="Campionato">Campionato</option>
            <option value="Torneo">Torneo</option>
            <option value="Amichevole">Amichevole</option>
          </select>

          <input
            type="text"
            placeholder="Luogo (opzionale)"
            value={formData.luogo_torneo}
            onChange={e =>
              setFormData({ ...formData, luogo_torneo: e.target.value })
            }
            className="w-full border border-montecarlo-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-montecarlo-accent"
          />

          <div className="flex justify-end space-x-4 pt-4 border-t border-montecarlo-gray-200">
            <button
              type="button"
              onClick={() => navigate('/calendario')}
              className="px-5 py-2 font-medium text-montecarlo-secondary hover:text-montecarlo-accent transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white rounded-lg font-semibold hover:from-[#c11b1b] transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
