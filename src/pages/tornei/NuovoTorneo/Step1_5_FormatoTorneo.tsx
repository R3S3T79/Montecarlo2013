// src/pages/tornei/NuovoTorneo/Step1_5_FormatoTorneo.tsx
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

  const handleSelectFormat = (format: string) => {
    let nextStepPath = '';
    switch (format) {
      case 'eliminazione':
        nextStepPath = '/tornei/nuovo/step3-eliminazione';
        break;
      case 'girone_unico':
        nextStepPath = '/tornei/nuovo/step3-gironeunico';
        break;
      case 'fase_gironi':
        nextStepPath = '/tornei/nuovo/step3-fasegironi';
        break;
      default:
        return;
    }

    navigate(nextStepPath, {
      state: {
        ...state,
        formatoTorneo: format,
      },
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-center">Seleziona Formato Torneo</h2>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => handleSelectFormat('eliminazione')}
          className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Eliminazione Diretta
        </button>
        <button
          onClick={() => handleSelectFormat('girone_unico')}
          className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
        >
          Girone Unico
        </button>
        <button
          onClick={() => handleSelectFormat('fase_gironi')}
          className="bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Fase a Gironi
        </button>
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
