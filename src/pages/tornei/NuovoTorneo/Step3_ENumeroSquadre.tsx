// src/pages/tornei/NuovoTorneo/Step3_ENumeroSquadre.tsx
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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
    if (!state) {
      navigate("/tornei/nuovo/step1");
    }
  }, [state, navigate]);

  if (!state) return null;

  const handleClick = (num: number) => {
  navigate(`/tornei/nuovo/step4-eliminazione/${state.torneoId}`, {
    state: {
      ...state,
      numSquadre: num,
      formatoTorneo: "Eliminazione",
    },
  });
};

  const handleBack = () => {
    navigate("/tornei/nuovo/step1-5", {
      state: {
        torneoNome: state.torneoNome,
        torneoLuogo: state.torneoLuogo,
        stagioneSelezionata: state.stagioneSelezionata,
      },
    });
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-4 py-6 bg-white/90 rounded-lg shadow space-y-6">
     

      <div className="grid grid-cols-2 gap-4 pt-2">
        {[4, 8, 16, 32].map((n) => (
          <button
            key={n}
            onClick={() => handleClick(n)}
            className="bg-blue-600 text-white text-lg py-3 rounded-lg hover:bg-blue-700 shadow hover:shadow-md transition"
          >
            {n} squadre
          </button>
        ))}
      </div>

      <button
        onClick={handleBack}
        className="w-full bg-gray-200 text-black py-2 rounded-lg hover:bg-gray-300 transition"
      >
        Indietro
      </button>
    </div>
  );
}
