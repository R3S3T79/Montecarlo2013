// src/pages/tornei/NuovoTorneo/Step1_DettagliBase.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";

interface Stagione {
  id: string;
  nome: string;
}

export default function Step1_DettagliBase() {
  const [torneoNome, setTorneoNome] = useState("");
  const [torneoLuogo, setTorneoLuogo] = useState("");
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchStagioni = useCallback(async () => {
    const { data } = await supabase
      .from("stagioni")
      .select("id, nome")
      .order("data_inizio", { ascending: false });

    setStagioni(data ?? []);
  }, []);

  useEffect(() => {
    fetchStagioni();
  }, [fetchStagioni]);

  const handleSubmit = () => {
    if (!torneoNome.trim() || !torneoLuogo.trim() || !stagioneSelezionata) {
      setErrorMsg("Compila tutti i campi.");
      return;
    }
    setErrorMsg(null);
    navigate("/tornei/nuovo/step1-5", {
      state: {
        torneoNome,
        torneoLuogo,
        stagioneSelezionata,
      },
    });
  };

  return (
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-md mx-auto">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo">

          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="p-4 sm:p-6">
            <div className="space-y-4">

              {/* Nome Torneo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nome Torneo
                </label>
                <input
                  type="text"
                  value={torneoNome}
                  onChange={(e) => setTorneoNome(e.target.value)}
                  placeholder="Es. Torneo Primavera 2025"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-montecarlo-secondary transition"
                />
              </div>

              {/* Luogo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Luogo
                </label>
                <input
                  type="text"
                  value={torneoLuogo}
                  onChange={(e) => setTorneoLuogo(e.target.value)}
                  placeholder="Es. Montecarlo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-montecarlo-secondary transition"
                />
              </div>

              {/* Stagione */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Stagione
                </label>
                <select
                  value={stagioneSelezionata}
                  onChange={(e) => setStagioneSelezionata(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-montecarlo-secondary transition"
                >
                  <option value="">– Seleziona stagione –</option>
                  {stagioni.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Errore */}
              {errorMsg && (
                <div className="text-red-700 text-sm text-center font-medium bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                  {errorMsg}
                </div>
              )}

              {/* Pulsanti */}
              <div className="space-y-2 pt-3">
                <button
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white font-semibold py-2.5 rounded-lg shadow-sm hover:opacity-90 transition"
                >
                  Continua
                </button>

                <button
                  onClick={() => navigate("/tornei")}
                  className="w-full bg-gray-100 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition"
                >
                  Indietro
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}