// src/pages/tornei/NuovoTorneo/Step3_ENumeroSquadre.tsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface StateType {
  torneoNome: string;
  torneoLuogo: string;
  stagioneSelezionata: string;
  formatoTorneo: string;
}

export default function Step3_ENumeroSquadre() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as StateType | null;

  useEffect(() => {
    console.log('STATE RICEVUTO IN Step3_ENumeroSquadre:', state);
    if (!state) {
      navigate('/tornei/nuovo/step1');
    }
  }, [state, navigate]);

  if (!state) return null;

  const handleClick = (num: number) => {
    navigate('/tornei/nuovo/step4-eliminazione', {
      state: {
        ...state,
        numSquadre: num,
        formatoTorneo: 'eliminazione',
      },
    });
  };

  const handleBack = () => {
    navigate('/tornei/nuovo/step1-5', {
      state: {
        torneoNome: state.torneoNome,
        torneoLuogo: state.torneoLuogo,
        stagioneSelezionata: state.stagioneSelezionata,
      },
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-center">Quante squadre partecipano?</h2>

      <div className="grid grid-cols-2 gap-4">
        {[4, 8, 16, 32].map((n) => (
          <button
            key={n}
            onClick={() => handleClick(n)}
            className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {n} squadre
          </button>
        ))}
      </div>

      <button
        onClick={handleBack}
        className="w-full bg-gray-300 text-black py-2 rounded-lg hover:bg-gray-400"
      >
        ← Indietro
      </button>
    </div>
  );
}
