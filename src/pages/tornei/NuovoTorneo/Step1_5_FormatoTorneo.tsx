import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface StateType {
  torneoNome: string;
  torneoLuogo: string;
  stagioneSelezionata: string;
}

export default function Step1_5_FormatoTorneo() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as StateType | null;

  if (!state) {
    navigate('/tornei/nuovo/step1');
    return null;
  }

  const handleFormato = (formatoTorneo: 'eliminazione' | 'girone_unico' | 'fase_gironi') => {
    let nextPath = '/tornei/nuovo/step3-eliminazione';
    if (formatoTorneo === 'girone_unico') {
      nextPath = '/tornei/nuovo/step3-gironeunico';
    } else if (formatoTorneo === 'fase_gironi') {
      nextPath = '/tornei/nuovo/step3-fasegironi';
    }

    navigate(nextPath, {
      state: {
        ...state,
        formatoTorneo,
      },
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-center">Seleziona il Formato del Torneo</h2>

      <div className="space-y-4">
        <button
          onClick={() => handleFormato('eliminazione')}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Eliminazione Diretta
        </button>
        <button
          onClick={() => handleFormato('girone_unico')}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
        >
          Girone Unico
        </button>
        <button
          onClick={() => handleFormato('fase_gironi')}
          className="w-full bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600 transition-colors"
        >
          Fase a Gironi
        </button>
      </div>

      <button
        onClick={() => navigate('/tornei/nuovo/step1', { state })}
        className="w-full bg-gray-300 text-black py-2 rounded-lg hover:bg-gray-400"
      >
        Indietro
      </button>
    </div>
  );
}
