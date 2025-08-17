// src/pages/tornei/NuovoTorneo/Step3_GuNumeroSquadre.tsx

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Step3_GuNumeroSquadre() {
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
    navigate(`/tornei/nuovo/step4-gironeunico/${state.torneoId}`, {
      state: {
        ...state,
        numSquadre: num,
        formatoTorneo: 'Girone_Unico',
      },
    });
  };

  const teamNumbers = Array.from({ length: 13 }, (_, i) => i + 3); // da 3 a 15

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {teamNumbers.map((n) => (
          <button
            key={n}
            onClick={() => handleClick(n)}
            className="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
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
