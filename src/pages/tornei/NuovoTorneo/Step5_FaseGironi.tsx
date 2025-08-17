// src/pages/tornei/NuovoTorneo/Step5_FaseGironi.tsx
import React, { useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface StateType {
  torneoId: string;
  torneoNome: string;
  torneoLuogo: string;
  stagioneSelezionata: string;
  formatoTorneo: 'fase_gironi';
  numSquadre: number;
  squadreSelezionate: string[];
}

export default function Step5_FaseGironi() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as StateType | null;

  // 🔍 Debug in console
  useEffect(() => {
    console.log('🛡️ Sono in Step5_FaseGironi, path:', location.pathname, 'state:', state);
  }, [location, state]);

  if (!state) {
    return (
      <p className="text-center mt-10 text-red-500">
        Dati torneo mancanti — torna indietro.
      </p>
    );
  }

  const { numSquadre, torneoId, squadreSelezionate } = state;

  // Calcola i divisori validi di numSquadre (>=2 gironi, almeno 2 squadre per girone)
  const possibiliDivisioni = useMemo(() => {
    const divs: number[] = [];
    for (let i = 2; i <= numSquadre / 2; i++) {
      if (numSquadre % i === 0) {
        divs.push(i);
      }
    }
    return divs;
  }, [numSquadre]);

  const handleSelectDivision = (numGironi: number) => {
    navigate('/tornei/nuovo/step5-5-fasegironi', {
      state: {
        ...state,
        numGironi,
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
  

      <h2 className="text-2xl font-bold text-center">
        Dividi le <strong>{numSquadre}</strong> squadre in gironi
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {possibiliDivisioni.map((n) => (
          <button
            key={n}
            onClick={() => handleSelectDivision(n)}
            className="py-3 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {n} gironi da {numSquadre / n} squadre
          </button>
        ))}
      </div>

      <div className="flex justify-center pt-6">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-300 text-black px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Indietro
        </button>
      </div>
    </div>
  );
}
