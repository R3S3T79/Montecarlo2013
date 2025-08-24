// src/pages/tornei/NuovoTorneo/Step3_FgNumeroSquadre.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Step3_FgNumeroSquadre() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    torneoId: string;
    torneoNome: string;
    torneoLuogo: string;
    stagioneSelezionata: string;
    formatoTorneo: string;
  } | null;

  if (!state) {
    navigate('/tornei/nuovo/step1');
    return null;
  }

  const handleClick = (num: number) => {
    navigate(`/tornei/nuovo/step4-fasegironi/${state.torneoId}`, {
      state: {
        ...state,
        numSquadre: num,
        formatoTorneo: 'fase_gironi',
      },
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">

      <div className="grid grid-cols-2 gap-4">
        {[4, 6, 8, 10, 12, 14, 16].map((n) => (
          <button
            key={n}
            onClick={() => handleClick(n)}
            className="bg-green-500 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            {n} squadre
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate(-1)}
        className="w-full bg-gray-300 text-black py-2 rounded-lg hover:bg-gray-400 transition-colors"
      >
        Indietro
      </button>
    </div>
  );
}
