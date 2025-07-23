// src/pages/tornei/NuovoTorneo/Step5_GironeUnico.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface StateType {
  torneoNome: string;
  torneoLuogo: string;
  stagioneSelezionata: string;
  formatoTorneo: 'girone_unico';
  numSquadre: number;
  squadreSelezionate: string[];
}

export default function Step5_GironeUnico() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as StateType) || null;

  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [accoppiamenti, setAccoppiamenti] = useState<[string, string][]>([]);
  const [dateIncontri, setDateIncontri] = useState<
    Record<string, { andata: string; ritorno?: string }>
  >({});
  const [andataRitorno, setAndataRitorno] = useState(false);
  const [loading, setLoading] = useState(false);

  // se manca state, torno allo step4
  useEffect(() => {
    if (!state) {
      navigate('/tornei/nuovo/step4-gironeunico', { replace: true });
    }
  }, [state, navigate]);

  // carico squadre e creo accoppiamenti
  useEffect(() => {
    if (!state) return;
    supabase
      .from<Squadra>('squadre')
      .select('id, nome, logo_url')
      .in('id', state.squadreSelezionate)
      .then(({ data, error }) => {
        if (error || !data) return;
        setSquadre(data);
        const pairs: [string, string][] = [];
        data.forEach((a, i) =>
          data.slice(i + 1).forEach((b) => pairs.push([a.id, b.id]))
        );
        setAccoppiamenti(pairs);
      });
  }, [state]);

  if (!state) return null;

  const aggiornaData = (
    key: string,
    tipo: 'andata' | 'ritorno',
    val: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDateIncontri((prev) => ({
      ...prev,
      [key]: { ...prev[key], [tipo]: val },
    }));
    e.target.blur();
  };

  const allDatesSet = () =>
    accoppiamenti.every(([a, b]) => {
      const k = `${a}-${b}`;
      if (!dateIncontri[k]?.andata) return false;
      if (andataRitorno && !dateIncontri[k]?.ritorno) return false;
      return true;
    });

  const scambia = (idx: number) => {
    setAccoppiamenti((prev) => {
      const copy = [...prev];
      const [h, o] = copy[idx];
      copy[idx] = [o, h];
      return copy;
    });
  };

  const handleNext = async () => {
    if (!allDatesSet() || loading) return;
    setLoading(true);
    try {
      // creo torneo
      const { data: t, error: eT } = await supabase
        .from('tornei')
        .insert({
          nome: state.torneoNome,
          luogo: state.torneoLuogo,
          stagione_id: state.stagioneSelezionata,
          formato: 'girone_unico',
          numero_squadre: state.numSquadre,
        })
        .select('id')
        .single();
      if (eT || !t) throw eT || new Error('No torneo');
      const torneoId = t.id;

      // config_torneo
      await supabase.from('config_torneo').insert({
        torneo_id: torneoId,
        girone_andata_ritorno: andataRitorno,
      });

      // fasi_torneo
      const { data: f, error: eF } = await supabase
        .from('fasi_torneo')
        .insert({
          torneo_id: torneoId,
          tipo_fase: 'girone_unico',
          fase_numerica: 1,
          round: 1,
        })
        .select('id')
        .single();
      if (eF || !f) throw eF || new Error('No fase');
      const faseId = f.id;

      // partite_torneo
      const partite = accoppiamenti.map(([a, b]) => {
        const key = `${a}-${b}`;
        return {
          torneo_id: torneoId,
          fase_id: faseId,
          squadra_casa_id: a,
          squadra_ospite_id: b,
          goal_casa: 0,
          goal_ospite: 0,
          stato: 'DaGiocare',
          data_ora: dateIncontri[key].andata,
          rigori_vincitore: null,
        };
      });
      await supabase.from('partite_torneo').insert(partite);

      // navigo allo step6 con il parametro torneoId
      navigate(`/tornei/nuovo/step6-gironeunico/${torneoId}`, {
        state: { torneoId },
      });
    } catch (err) {
      console.error('Errore salvataggio Girone Unico:', err);
      alert('Errore durante il salvataggio, controlla console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-center">Date Incontri</h2>

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={andataRitorno}
          onChange={(e) => setAndataRitorno(e.target.checked)}
          className="form-checkbox h-4 w-4 text-blue-600"
        />
        <span className="text-sm">Andata e ritorno</span>
      </label>

      {accoppiamenti.map(([a, b], idx) => {
        const key = `${a}-${b}`;
        const casa = squadre.find((s) => s.id === a);
        const ospite = squadre.find((s) => s.id === b);
        return (
          <div
            key={key}
            className={`relative bg-white shadow rounded-lg p-4 ${
              idx < accoppiamenti.length - 1 ? 'mb-4' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => scambia(idx)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              title="Scambia casa/trasferta"
            >
              ↔️
            </button>

            <div className="flex items-center space-x-2 mb-2">
              {casa?.logo_url && (
                <img
                  src={casa.logo_url}
                  alt={casa.nome}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm font-medium">{casa?.nome}</span>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              {ospite?.logo_url && (
                <img
                  src={ospite.logo_url}
                  alt={ospite.nome}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm font-medium">{ospite?.nome}</span>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-600 mb-1">
                Data andata
              </label>
              <input
                type="datetime-local"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                value={dateIncontri[key]?.andata || ''}
                onChange={(e) => aggiornaData(key, 'andata', e.target.value, e)}
              />
            </div>

            {andataRitorno && (
              <div className="mb-4">
                <label className="block text-xs text-gray-600 mb-1">
                  Data ritorno
                </label>
                <input
                  type="datetime-local"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  value={dateIncontri[key]?.ritorno || ''}
                  onChange={(e) =>
                    aggiornaData(key, 'ritorno', e.target.value, e)
                  }
                />
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-between">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm"
        >
          Indietro
        </button>
        <button
          onClick={handleNext}
          disabled={!allDatesSet() || loading}
          className={`px-6 py-2 rounded text-white text-sm ${
            allDatesSet() && !loading
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? 'Salvando...' : 'Avanti'}
        </button>
      </div>
    </div>
);
}
