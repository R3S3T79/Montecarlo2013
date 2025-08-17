// src/pages/tornei/NuovoTorneo/Step1_DettagliBase.tsx
import React, { useEffect, useState, useCallback } from "react";
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
    <div className="max-w-md mx-auto mt-8 px-4 py-6 bg-white rounded-lg shadow space-y-6">
      

      <div className="space-y-4">
        {/* Nome Torneo */}
        <div>
          <label className="block text-sm font-medium mb-1">Nome Torneo</label>
          <input
            type="text"
            value={torneoNome}
            onChange={(e) => setTorneoNome(e.target.value)}
            placeholder="Es. Torneo Primavera 2025"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>

        {/* Luogo */}
        <div>
          <label className="block text-sm font-medium mb-1">Luogo</label>
          <input
            type="text"
            value={torneoLuogo}
            onChange={(e) => setTorneoLuogo(e.target.value)}
            placeholder="Es. Montecarlo"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>

        {/* Stagione */}
        <div>
          <label className="block text-sm font-medium mb-1">Stagione</label>
          <select
            value={stagioneSelezionata}
            onChange={(e) => setStagioneSelezionata(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
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
          <div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 py-2 rounded">
            {errorMsg}
          </div>
        )}

        {/* Pulsanti */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white text-lg py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Continua
          </button>

          <button
            onClick={() => navigate("/tornei")}
            className="w-full bg-gray-200 text-black py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Indietro
          </button>
        </div>
      </div>
    </div>
  );
}
