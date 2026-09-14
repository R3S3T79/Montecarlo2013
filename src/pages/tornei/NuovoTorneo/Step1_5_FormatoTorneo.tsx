// src/pages/tornei/NuovoTorneo/Step1_5_FormatoTorneo.tsx

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
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-md mx-auto">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo">

          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="p-4 sm:p-6">

            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">
                Formato Torneo
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Seleziona la modalità di svolgimento del torneo
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">

              <button
                onClick={() => handleSelectFormat("Eliminazione")}
                className="group w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition hover:border-red-200 hover:bg-red-50 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                    🏆
                  </div>

                  <div>
                    <div className="font-semibold text-gray-900 group-hover:text-montecarlo-secondary">
                      Eliminazione Diretta
                    </div>

                    <div className="mt-0.5 text-xs text-gray-500">
                      Sfide a eliminazione fino alla finale
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSelectFormat("Girone_Unico")}
                className="group w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition hover:border-red-200 hover:bg-red-50 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                    ⚽
                  </div>

                  <div>
                    <div className="font-semibold text-gray-900 group-hover:text-montecarlo-secondary">
                      Girone Unico
                    </div>

                    <div className="mt-0.5 text-xs text-gray-500">
                      Tutte le squadre nello stesso girone
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSelectFormat("Fase_Gironi")}
                className="group w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition hover:border-red-200 hover:bg-red-50 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                    🥇
                  </div>

                  <div>
                    <div className="font-semibold text-gray-900 group-hover:text-montecarlo-secondary">
                      Fase a Gironi
                    </div>

                    <div className="mt-0.5 text-xs text-gray-500">
                      Più gironi con successiva fase del torneo
                    </div>
                  </div>
                </div>
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