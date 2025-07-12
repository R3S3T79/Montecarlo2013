import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { ArrowLeftRight } from 'lucide-react';

interface Squadra { id: string; nome: string; logo_url: string | null }
interface StateType {
  torneoNome: string;
  torneoLuogo: string;
  stagioneSelezionata: string;
  formatoTorneo: 'girone_unico' | 'eliminazione' | 'fase_gironi';
  numSquadre: number;
  numGironi: number;
  squadreSelezionate: string[];
}
type IncontroDate = { andata: string; ritorno?: string };

export default function Step5_5_FaseGironi() {
  const { state } = useLocation() as { state: StateType | null };
  const navigate = useNavigate();
  if (!state) {
    return <p className="text-center text-red-500 mt-6">Dati torneo mancanti.</p>;
  }

  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [accoppiamenti, setAccoppiamenti] = useState<
    { casa: string; ospite: string; girone: number }[]
  >([]);
  const [dateIncontri, setDateIncontri] = useState<Record<string,IncontroDate>>({});
  const [andataRitorno, setAndataRitorno] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1) carico le squadre
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from<Squadra>('squadre')
        .select('id,nome,logo_url')
        .in('id', state.squadreSelezionate);
      if (!data) return;
      setSquadre(data);

      // 2) genero accoppiamenti con numero di girone
      const per = state.numSquadre / state.numGironi;
      const gironiArr: string[][] = [];
      for (let i = 0; i < state.numGironi; i++) {
        gironiArr.push(state.squadreSelezionate.slice(i * per, (i + 1) * per));
      }
      const acc: typeof accoppiamenti = [];
      gironiArr.forEach((g, gi) =>
        g.forEach((c, idx) =>
          g.slice(idx + 1).forEach(o =>
            acc.push({ casa: c, ospite: o, girone: gi + 1 })
          )
        )
      );
      setAccoppiamenti(acc);
    })();
  }, [state]);

  // helpers per date e swap
  const aggiornaData = (
    key: string,
    tipo: 'andata' | 'ritorno',
    val: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDateIncontri(p => ({ ...p, [key]: { ...p[key], [tipo]: val } }));
    e.target.blur();
  };
  const handleSwap = (i: number) => {
    setAccoppiamenti(p => {
      const nxt = [...p];
      const { casa, ospite, girone } = nxt[i];
      nxt[i] = { casa: ospite, ospite: casa, girone };
      return nxt;
    });
    setDateIncontri(p => {
      const nxt = { ...p };
      const oldK = `${accoppiamenti[i].casa}-${accoppiamenti[i].ospite}`;
      const newK = `${accoppiamenti[i].ospite}-${accoppiamenti[i].casa}`;
      if (p[oldK]) {
        nxt[newK] = p[oldK];
        delete nxt[oldK];
      }
      return nxt;
    });
  };
  const allDatesSet = () =>
    accoppiamenti.every(({ casa, ospite }) => {
      const k = `${casa}-${ospite}`;
      if (!dateIncontri[k]?.andata) return false;
      if (andataRitorno && !dateIncontri[k]?.ritorno) return false;
      return true;
    });

  // 3) salva tutto e naviga allo step6
  const handleNext = async () => {
    if (!allDatesSet() || loading) return;
    setLoading(true);
    try {
      // crea torneo
      const { data: torneo, error: eT } = await supabase
        .from('tornei')
        .insert({
          nome: state.torneoNome,
          luogo: state.torneoLuogo,
          stagione_id: state.stagioneSelezionata,
          formato: state.formatoTorneo,
          numero_squadre: state.numSquadre,
        })
        .select('id')
        .single();
      if (eT || !torneo) throw eT;
      const torneoId = torneo.id;

      // config gironi
      await supabase.from('config_torneo').insert({
        torneo_id: torneoId,
        girone_andata_ritorno: andataRitorno,
        num_qualificate_per_girone: state.numGironi,
      });

      // crea fase a gironi
      const { data: fase, error: eF } = await supabase
        .from('fasi_torneo')
        .insert({
          torneo_id: torneoId,
          tipo_fase: 'multi_gironi',
          fase_numerica: 1,
          round: 1,
        })
        .select('id')
        .single();
      if (eF || !fase) throw eF;
      const faseId = fase.id;

      // popola gironi_squadre
      const per = state.numSquadre / state.numGironi;
      const gironiArr = Array.from({ length: state.numGironi }, (_, i) =>
        state.squadreSelezionate.slice(i * per, (i + 1) * per)
      );
      const gsInserts = gironiArr.flatMap((g, gi) =>
        g.map(sid => ({ fase_id: faseId, squadra_id: sid, girone: gi + 1 }))
      );
      await supabase.from('gironi_squadre').insert(gsInserts);

      // inserisci partite
      const partite = accoppiamenti.flatMap(({ casa, ospite }) => {
        const key = `${casa}-${ospite}`;
        const arr = [
          {
            torneo_id: torneoId,
            fase_id: faseId,
            squadra_casa_id: casa,
            squadra_ospite_id: ospite,
            goal_casa: 0,
            goal_ospite: 0,
            stato: 'DaGiocare',
            data_ora: dateIncontri[key].andata,
            rigori_vincitore: null,
          },
        ];
        if (andataRitorno) {
          arr.push({
            torneo_id: torneoId,
            fase_id: faseId,
            squadra_casa_id: ospite,
            squadra_ospite_id: casa,
            goal_casa: 0,
            goal_ospite: 0,
            stato: 'DaGiocare',
            data_ora: dateIncontri[key].ritorno!,
            rigori_vincitore: null,
          });
        }
        return arr;
      });
      await supabase.from('partite_torneo').insert(partite);

      // naviga a step6
      navigate(`/tornei/nuovo/step6-fasegironi/${torneoId}`);
    } catch (err) {
      console.error(err);
      alert('Errore imprevisto durante il salvataggio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-center">{state.torneoNome}</h2>

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={andataRitorno}
          onChange={e => setAndataRitorno(e.target.checked)}
          className="form-checkbox h-4 w-4 text-blue-600"
        />
        <span>Andata e ritorno</span>
      </label>

      {accoppiamenti.map(({ casa, ospite, girone }, i) => {
        const key = `${casa}-${ospite}`;
        const home = squadre.find(s => s.id === casa)!;
        const away = squadre.find(s => s.id === ospite)!;
        return (
          <div key={key} className="bg-white shadow rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Girone {girone}</span>
            </div>
            <div className="flex items-center justify-center space-x-3 mb-3">
              {home.logo_url && (
                <img src={home.logo_url} alt={home.nome} className="w-6 h-6 rounded-full" />
              )}
              <span className="font-medium">{home.nome}</span>
              <button onClick={() => handleSwap(i)} className="p-1 bg-gray-100 rounded hover:bg-gray-200">
                <ArrowLeftRight size={16} />
              </button>
              <span className="font-medium">{away.nome}</span>
              {away.logo_url && (
                <img src={away.logo_url} alt={away.nome} className="w-6 h-6 rounded-full" />
              )}
            </div>
            <label className="block text-sm mb-1">Data andata</label>
            <input
              type="datetime-local"
              className="w-full border rounded px-3 py-2"
              value={dateIncontri[key]?.andata || ''}
              onChange={e => aggiornaData(key, 'andata', e.target.value, e)}
            />
            {andataRitorno && (
              <>
                <label className="block text-sm mt-3 mb-1">Data ritorno</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded px-3 py-2"
                  value={dateIncontri[key]?.ritorno || ''}
                  onChange={e => aggiornaData(key, 'ritorno', e.target.value, e)}
                />
              </>
            )}
          </div>
        );
      })}

      <button
        onClick={handleNext}
        disabled={!allDatesSet() || loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        Avanti
      </button>
      <button onClick={() => navigate(-1)} className="w-full bg-gray-300 text-black py-2 rounded-lg hover:bg-gray-400">
        Indietro
      </button>
    </div>
  );
}
