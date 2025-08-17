// src/pages/tornei/NuovoTorneo/Step4_GironeUnico.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

interface Squadra {
  id: string;
  nome: string;
}

interface StateType {
  torneoNome: string;
  torneoLuogo: string;
  stagioneSelezionata: string;
  formatoTorneo: 'Girone_Unico';
  numSquadre: number;
}

export default function Step4_GironeUnico() {
  const navigate = useNavigate();
  const location = useLocation();
  const { torneoId } = useParams();
  const state = location.state as StateType | null;

  console.log('[Step4_GironeUnico] render, location.state =', state, 'torneoId =', torneoId);

  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [scelte, setScelte] = useState<(string | null)[]>([]);

  useEffect(() => {
    if (!state || !torneoId) {
      console.warn('[Step4_GironeUnico] stato o torneoId mancante, torno a step1');
      navigate('/tornei/nuovo/step1');
      return;
    }

    (async () => {
      console.log('[Step4_GironeUnico] fetch squadre...');
      const { data, error } = await supabase.from('squadre').select('id, nome');
      if (error) {
        console.error('[Step4_GironeUnico] errore fetch:', error);
        return;
      }

      // --- ORDINAMENTO RICHIESTO ---
      // Montecarlo deve essere la prima voce, il resto in ordine alfabetico.
      // Usiamo l'ID noto per evitare collisioni con "Montecarlo Sq. B", ecc.
      const MONTECARLO_ID = 'a16a8645-9f86-41d9-a81f-a92931f1cc67';

      let elenco: Squadra[] = data ?? [];

      // Se Montecarlo non è nella lista, la recuperiamo e aggiungiamo
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
      // --- FINE ORDINAMENTO ---

      setSquadre(ordered);
      setScelte(Array(state.numSquadre).fill(null));
      console.log('[Step4_GironeUnico] squadre caricate:', ordered);
    })();
  }, [state, torneoId, navigate]);

  if (!state || !torneoId) return null;

  const handleSelect = (idx: number, val: string) => {
    const nuove = [...scelte];
    nuove[idx] = val;
    setScelte(nuove);
    console.log('[Step4_GironeUnico] scelte ora =', nuove);
  };

  const tutteValide = () =>
    scelte.every((v) => v !== null) && new Set(scelte).size === scelte.length;

  const handleContinue = () => {
    console.log('[Step4_GironeUnico] click Avanti, tutte valide?', tutteValide());
    if (!tutteValide()) return;
    navigate(`/tornei/nuovo/step5-gironeunico/${torneoId}`, {
      state: { ...state, squadreSelezionate: scelte },
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      

      {scelte.map((val, idx) => (
        <select
          key={idx}
          value={val ?? ''}
          onChange={(e) => handleSelect(idx, e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">– Seleziona squadra –</option>
          {squadre
            // Manteniamo l'ordine già calcolato: Montecarlo prima, poi alfabetico.
            .filter(s => !scelte.includes(s.id) || scelte[idx] === s.id)
            .map((s) => (
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
            tutteValide() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Procedi
        </button>
        <button
          onClick={() => {
            console.log('[Step4_GironeUnico] click Indietro');
            navigate(-1);
          }}
          className="w-full bg-gray-300 text-black py-2 rounded-lg hover:bg-gray-400"
        >
          Indietro
        </button>
      </div>
    </div>
  );
}
