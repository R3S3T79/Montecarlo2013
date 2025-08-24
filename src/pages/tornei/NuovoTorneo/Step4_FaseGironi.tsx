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
  formatoTorneo: 'Fase_Gironi';
  numSquadre: number;
}

export default function Step4_FaseGironi() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as StateType | null;

  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [scelte, setScelte] = useState<(string | null)[]>([]);
  const [numGironi, setNumGironi] = useState<number | null>(null);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  useEffect(() => {
    if (!state) {
      navigate('/tornei/nuovo/step1');
      return;
    }

    (async () => {
      const { data, error } = await supabase.from('squadre').select('id, nome');
      if (error || !data) {
        console.error('[Step4_FaseGironi] Errore Supabase:', error);
        return;
      }

      // Montecarlo come prima voce, resto alfabetico
      const MONTECARLO_ID = 'a16a8645-9f86-41d9-a81f-a92931f1cc67';
      let elenco: Squadra[] = data ?? [];

      if (!elenco.some(s => s.id === MONTECARLO_ID)) {
        const { data: mc } = await supabase
          .from('squadre')
          .select('id, nome')
          .eq('id', MONTECARLO_ID)
          .maybeSingle();
        if (mc) elenco = [...elenco, mc];
      }

      const montecarlo =
        elenco.find(s => s.id === MONTECARLO_ID) ||
        elenco.find(s => s.nome.trim().toLowerCase() === 'montecarlo');

      const altre = elenco
        .filter(s => s.id !== montecarlo?.id)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));

      const ordered = montecarlo ? [montecarlo, ...altre] : altre;

      setSquadre(ordered);
      setScelte(Array(state.numSquadre).fill(null));
    })();
  }, [state, navigate]);

  if (!state) return null;

  const handleSelect = (idx: number, val: string) => {
    const nuove = [...scelte];
    nuove[idx] = val;
    setScelte(nuove);
  };

  const tutteValide = () =>
    scelte.every((v) => v !== null) && new Set(scelte).size === scelte.length;

  const getOpzioniGironi = () => {
    const n = state.numSquadre;
    const opzioni: number[] = [];
    for (let i = 2; i <= n; i++) {
      if (n % i === 0 && n / i >= 2) opzioni.push(i); // almeno 2 squadre per girone
    }
    return opzioni;
  };

  const handleContinue = async () => {
    if (!tutteValide() || !numGironi || salvataggioInCorso) return;
    setSalvataggioInCorso(true);

    const { data: torneo, error } = await supabase
      .from('tornei')
      .insert({
        nome_torneo: state.torneoNome,
        luogo: state.torneoLuogo,
        stagioni: state.stagioneSelezionata,
        formato_torneo: 'Fase_Gironi',
        numero_squadre: state.numSquadre,
      })
      .select('id')
      .single();

    if (error || !torneo) {
      console.error('Errore creazione torneo:', error);
      alert('Errore nella creazione del torneo.');
      setSalvataggioInCorso(false);
      return;
    }

    navigate(`/tornei/nuovo/step5-5-fasegironi/${torneo.id}`, {
      state: {
        ...state,
        torneoId: torneo.id,
        squadreSelezionate: scelte,
        numGironi,
      },
    });
  };

  const perGirone = numGironi ? state.numSquadre / numGironi : 0;

  return (
    <div className="max-w-2xl mx-auto px-2 py-2 space-y-4">
      <div>
        <select
          value={numGironi ?? ''}
          onChange={(e) => setNumGironi(Number(e.target.value))}
          className="bg-white/90 border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">– Seleziona numero di gironi –</option>
          {getOpzioniGironi().map((n) => (
            <option key={n} value={n}>
              {n} gironi da {state.numSquadre / n}
            </option>
          ))}
        </select>
      </div>

      {/* Raggruppa per girone in container con titolo unico */}
      {numGironi !== null &&
        Array.from({ length: numGironi }).map((_, g) => {
          const lettera = String.fromCharCode(65 + g);
          const startIdx = g * perGirone;
          const idxList = Array.from({ length: perGirone }, (_, i) => startIdx + i);

          return (
            <div key={g} className="mt-3 rounded-lg border border-gray-200 bg-white/90">
              <div className="px-3 py-2 font-semibold bg-gray-50 rounded-t-lg">
                Girone {lettera}
              </div>
              <div className="p-3 space-y-2">
                {idxList.map((idx) => (
                  <select
                    key={idx}
                    value={scelte[idx] ?? ''}
                    onChange={(e) => handleSelect(idx, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="">– Seleziona squadra –</option>
                    {squadre
                      .filter((s) => !scelte.includes(s.id) || scelte[idx] === s.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                        </option>
                      ))}
                  </select>
                ))}
              </div>
            </div>
          );
        })}

      <div className="flex flex-col gap-4 pt-4">
        <button
          onClick={handleContinue}
          disabled={!tutteValide() || !numGironi || salvataggioInCorso}
          className={`w-full py-2 rounded-lg text-white ${
            (tutteValide() && numGironi && !salvataggioInCorso)
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-400 cursor-not-allowed'
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
