import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

interface Squadra {
  id: string;
  nome: string;
}

export default function Step4_Eliminazione() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    torneoNome: string;
    torneoLuogo: string;
    stagioneSelezionata: string;
    formatoTorneo: string;
    numSquadre: number;
  } | null;

  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [scelte, setScelte] = useState<(string | null)[]>([]);
  const [torneoId, setTorneoId] = useState<string | null>(null);

  useEffect(() => {
    if (!state) {
      navigate('/tornei/nuovo/step1');
      return;
    }

    const fetchSquadre = async () => {
      const { data, error } = await supabase.from('squadre').select('id, nome');
      if (error) {
        console.error('Errore recupero squadre:', error.message);
        return;
      }
      if (data) {
        const montecarlo = data.find(s => s.nome.toLowerCase().includes('montecarlo'));
        const altre = data.filter(s => !s.nome.toLowerCase().includes('montecarlo'));
        altre.sort((a, b) => a.nome.localeCompare(b.nome));
        const ordered = montecarlo ? [montecarlo, ...altre] : altre;
        setSquadre(ordered);
        setScelte(Array(state.numSquadre).fill(null));
      }
    };

    fetchSquadre();
  }, [state, navigate]);

  const handleSelect = (index: number, value: string) => {
    const nuoveScelte = [...scelte];
    nuoveScelte[index] = value;
    setScelte(nuoveScelte);
  };

  const tutteScelteValide = () =>
    scelte.every((val) => val !== null) &&
    new Set(scelte).size === scelte.length;

  const handleContinue = async () => {
    if (!state) return;

    try {
      const { data, error } = await supabase
        .from('tornei')
        .insert({
          nome: state.torneoNome,
          luogo: state.torneoLuogo,
          stagione_id: state.stagioneSelezionata,
          formato: 'eliminazione',
          numero_squadre: state.numSquadre
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('Errore creazione torneo:', error.message);
        return;
      }

      navigate('/tornei/nuovo/step5-eliminazione', {
        state: {
          torneoId: data.id,
          squadreSelezionate: scelte as string[]
        },
      });
    } catch (err) {
      console.error('Errore salvataggio torneo:', err);
    }
  };

  if (!state) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h2 className="text-2xl font-bold text-center mb-4">
        Seleziona {state.numSquadre} Squadre
      </h2>

      {scelte.map((val, idx) => {
        const opzioniDisponibili = squadre.filter((s) =>
          !scelte.includes(s.id) || s.id === val
        );

        return (
          <select
            key={idx}
            value={val || ''}
            onChange={(e) => handleSelect(idx, e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">{`Squadra ${idx + 1}`}</option>
            {opzioniDisponibili.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        );
      })}

      <div className="flex flex-col gap-4 pt-4">
        <button
          onClick={handleContinue}
          disabled={!tutteScelteValide()}
          className={`w-full py-2 rounded-lg text-white ${
            tutteScelteValide() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Procedi
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-gray-300 text-black py-2 rounded-lg hover:bg-gray-400"
        >
          Indietro
        </button>
      </div>
    </div>
  );
}
