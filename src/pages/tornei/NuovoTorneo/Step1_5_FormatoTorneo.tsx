// src/pages/tornei/NuovoTorneo/Step1_5_FormatoTorneo.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface StateType {
  torneoId: string;
  torneoNome: string;
  torneoLuogo: string;
  stagioneSelezionata: string;
}

export default function Step1_5_FormatoTorneo() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as StateType | null;

  if (!state) {
    navigate("/tornei/nuovo/step1");
    return null;
  }

  const handleSelectFormat = (format: string) => {
    let nextStepPath = "";

    switch (format) {
      case "Eliminazione":
        nextStepPath = `/tornei/nuovo/step3-enumerosquadre/${state.torneoId}`;
        break;
      case "Girone_Unico":
        nextStepPath = `/tornei/nuovo/step3-gunumerosquadre/${state.torneoId}`;
        break;
      case "Fase_Gironi":
        nextStepPath = `/tornei/nuovo/step3-fgnumerosquadre/${state.torneoId}`;
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
    <div className="max-w-md mx-auto mt-2 p-2 px-4 py-6 bg-white/90 rounded-lg shadow space-y-6">
      

      <div className="grid grid-cols-1 gap-4 pt-2">
        <button
          onClick={() => handleSelectFormat("Eliminazione")}
          className="bg-blue-600 text-white text-lg py-3 rounded-lg hover:bg-blue-700 shadow hover:shadow-md transition"
        >
          Eliminazione Diretta
        </button>
        <button
          onClick={() => handleSelectFormat("Girone_Unico")}
          className="bg-emerald-600 text-white text-lg py-3 rounded-lg hover:bg-emerald-700 shadow hover:shadow-md transition"
        >
          Girone Unico
        </button>
        <button
          onClick={() => handleSelectFormat("Fase_Gironi")}
          className="bg-purple-600 text-white text-lg py-3 rounded-lg hover:bg-purple-700 shadow hover:shadow-md transition"
        >
          Fase a Gironi
        </button>
      </div>

      <button
        onClick={() =>
          navigate("/tornei/nuovo/step1", {
            state: {
              torneoId: state.torneoId,
              torneoNome: state.torneoNome,
              torneoLuogo: state.torneoLuogo,
              stagioneSelezionata: state.stagioneSelezionata,
            },
          })
        }
        className="w-full bg-gray-200 text-black py-2 rounded-lg hover:bg-gray-300 transition"
      >
        Indietro
      </button>
    </div>
  );
}
