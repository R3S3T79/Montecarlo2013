// src/pages/tornei/NuovoTorneo/Step5_FaseGironi.tsx
import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface StateType {
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

  if (!state) {
    return (
      <p className="text-center mt-10 text-red-500">
        Dati torneo mancanti.
      </p>
    );
  }

  const { numSquadre } = state;

  // tutti i divisori di numSquadre che danno più di 1 squadra per girone
  const possibiliDivisioni = useMemo(() => {
    const divs: number[] = [];
    for (let i = 2; i <= numSquadre; i++) {
      if (numSquadre % i === 0 && numSquadre / i > 1) {
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
        Dividi le {numSquadre} squadre in gironi
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {possibiliDivisioni.map((n) => (
          <button
            key={n}
            onClick={() => handleSelectDivision(n)}
            className="py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {n} Gironi da {numSquadre / n} Squadre
          </button>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Indietro
        </button>
      </div>
    </div>
  );
}
