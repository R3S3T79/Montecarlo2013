// src/pages/tornei/NuovoTorneo/Step1_DettagliBase.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

interface Stagione {
  id: string;
  nome: string;
}

export default function Step1_DettagliBase() {
  const [torneoNome, setTorneoNome] = useState('');
  const [torneoLuogo, setTorneoLuogo] = useState('');
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchStagioni = useCallback(async () => {
    const { data, error } = await supabase
      .from('stagioni')
      .select('id, nome')
      .order('data_inizio', { ascending: false });

    if (error) {
      console.error('Errore fetch stagioni:', error.message);
      return;
    }
    setStagioni(data ?? []);
  }, []);

  useEffect(() => {
    fetchStagioni();
  }, [fetchStagioni]);

  const handleSubmit = () => {
    if (!torneoNome.trim() || !torneoLuogo.trim() || !stagioneSelezionata) {
      setErrorMsg('Compila tutti i campi.');
      return;
    }
    setErrorMsg(null);
    // CORREZIONE: trattino anziché underscore
    navigate('/tornei/nuovo/step1-5', {
      state: {
        torneoNome,
        torneoLuogo,
        stagioneSelezionata,
      },
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4"
      >
        ← Indietro
      </button>

      <h2 className="text-2xl font-bold mb-6 text-center">Crea Nuovo Torneo</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Nome Torneo</label>
          <input
            type="text"
            value={torneoNome}
            onChange={(e) => setTorneoNome(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Es. Torneo Primavera 2025"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Luogo</label>
          <input
            type="text"
            value={torneoLuogo}
            onChange={(e) => setTorneoLuogo(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Es. Montecarlo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Stagione</label>
          <select
            value={stagioneSelezionata}
            onChange={(e) => setStagioneSelezionata(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">– Seleziona stagione –</option>
            {stagioni.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        {errorMsg && (
          <div className="text-red-600 text-sm text-center">{errorMsg}</div>
        )}

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continua
        </button>
      </div>
    </div>
  );
}
