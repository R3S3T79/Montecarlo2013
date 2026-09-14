// src/pages/tornei/NuovoTorneo/Step3_ENumeroSquadre.tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface StateType {
  torneoId: string;
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
        torneoId: state.torneoId,
        torneoNome: state.torneoNome,
        torneoLuogo: state.torneoLuogo,
        stagioneSelezionata: state.stagioneSelezionata,
      },
    });
  };

  return (
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-md mx-auto">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo">

          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="p-4 sm:p-6">

            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">
                Numero Squadre
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Seleziona il numero di squadre partecipanti
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[4, 8, 16, 32].map((n) => (
                <button
                  key={n}
                  onClick={() => handleClick(n)}
                  className="group rounded-xl border border-gray-200 bg-gray-50 px-3 py-5 transition hover:border-red-200 hover:bg-red-50 hover:shadow-sm"
                >
                  <div className="text-2xl font-bold text-montecarlo-secondary">
                    {n}
                  </div>

                  <div className="mt-1 text-sm font-medium text-gray-700">
                    squadre
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleBack}
              className="mt-5 w-full bg-gray-100 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition"
            >
              Indietro
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}