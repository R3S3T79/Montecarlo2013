// src/pages/tornei/NuovoTorneo/Step4_FaseGironi.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

interface Squadra {
  id: string;
  nome: string;
}

interface StateType {
  torneoNome: string;
  torneoLuogo: string;
  stagioneSelezionata: string;
  formatoTorneo: 'fase_gironi';
  numSquadre: number;
}

export default function Step4_FaseGironi() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as StateType | null;

  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [scelte, setScelte] = useState<(string | null)[]>([]);

  // Se non ho lo state di base, torno al primo step
  useEffect(() => {
    if (!state) {
      navigate('/tornei/nuovo/step1');
      return;
    }
    // inizializza array di selezioni vuote
    setScelte(Array(state.numSquadre).fill(null));

    // carica tutte le squadre ordinate (Montecarlo prima, poi alfabetico)
    (async () => {
      const { data, error } = await supabase
        .from<Squadra>('squadre')
        .select('id, nome');
      if (error) {
        console.error('Errore recupero squadre:', error.message);
        return;
      }
      if (data) {
        const montecarlo = data.find(s =>
          s.nome.toLowerCase().includes('montecarlo')
        );
        const altre = data.filter(
          s => !s.nome.toLowerCase().includes('montecarlo')
        );
        altre.sort((a, b) => a.nome.localeCompare(b.nome));
        setSquadre(montecarlo ? [montecarlo, ...altre] : altre);
      }
    })();
  }, [state, navigate]);

  // quando cambio una select
  const handleSelect = (idx: number, val: string) => {
    const copy = [...scelte];
    copy[idx] = val || null;
    setScelte(copy);
  };

  // tutte le scelte devono essere non-null e uniche
  const tutteValide = () =>
    scelte.every(v => v !== null) &&
    new Set(scelte as string[]).size === scelte.length;

  const handleContinue = () => {
    if (!state || !tutteValide()) return;
    navigate('/tornei/nuovo/step5-fasegironi', {
      state: {
        ...state,
        squadreSelezionate: scelte as string[],
      },
    });
  };

  // opzioni filtrate per non permettere duplicati
  const squadreDisponibili = (idx: number) =>
    squadre.filter(
      s => !scelte.includes(s.id) || scelte[idx] === s.id
    );

  if (!state) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h2 className="text-2xl font-bold text-center mb-4">
        Seleziona {state.numSquadre} squadre
      </h2>

      {scelte.map((val, idx) => (
        <select
          key={idx}
          value={val || ''}
          onChange={e => handleSelect(idx, e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">– Seleziona squadra –</option>
          {squadreDisponibili(idx).map(s => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      ))}

      <div className="flex flex-col gap-4 pt-4">
        <button
          onClick={handleContinue}
          disabled={!tutteValide()}
          className={`w-full py-2 rounded-lg text-white ${
            tutteValide() ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-400 cursor-not-allowed'
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
