// src/pages/tornei/NuovoTorneo/Step5_Eliminazione.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

interface Squadra {
  id: string;
  nome: string;
}

interface StateType {
  torneoId: string;
  squadreSelezionate: string[];
}

interface MatchInput {
  casa: string | null;
  ospite: string | null;
  data: string;
}

export default function Step5_Eliminazione() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as StateType | null;
  const torneoId = state?.torneoId;

  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [accoppiamenti, setAccoppiamenti] = useState<MatchInput[]>([]);
  const [semifinaliData, setSemifinaliData] = useState<string[]>([]);
  const [finaleData, setFinaleData] = useState<string>('');

  // 1) Carica le squadre e imposta gli slot data
  useEffect(() => {
    if (!state) return;
    (async () => {
      const { data: sqs, error: err } = await supabase
        .from('squadre')
        .select('id,nome')
        .in('id', state.squadreSelezionate);
      if (err) {
        console.error(err);
        return;
      }
      // Ordino come nello state
      const ordered = state.squadreSelezionate
        .map((id) => sqs?.find((s) => s.id === id))
        .filter((s): s is Squadra => !!s);
      setSquadre(ordered);

      // Primo turno: accoppiamenti iniziali
      const init: MatchInput[] = [];
      for (let i = 0; i < ordered.length; i += 2) {
        init.push({ casa: ordered[i].id, ospite: ordered[i + 1].id, data: '' });
      }
      setAccoppiamenti(init);
      setSemifinaliData(new Array(init.length / 2).fill(''));
      setFinaleData('');
    })();
  }, [state]);

  const aggiornaData = (i: number, val: string, tgt: HTMLInputElement) => {
    setAccoppiamenti((p) =>
      p.map((m, idx) => (idx === i ? { ...m, data: val } : m))
    );
    tgt.blur();
  };
  const aggiornaDataSemi = (i: number, val: string, tgt: HTMLInputElement) => {
    setSemifinaliData((p) => p.map((d, idx) => (idx === i ? val : d)));
    tgt.blur();
  };
  const aggiornaDataFinale = (val: string, tgt: HTMLInputElement) => {
    setFinaleData(val);
    tgt.blur();
  };
  const inverti = (i: number) => {
    setAccoppiamenti((p) =>
      p.map((m, idx) =>
        idx === i
          ? { casa: m.ospite, ospite: m.casa, data: m.data }
          : m
      )
    );
  };

  const getPhaseName = (c: number) => {
    if (c === 1) return 'Finale';
    if (c === 2) return 'Semifinale';
    if (c === 4) return 'Quarti di Finale';
    if (c === 8) return 'Ottavi di Finale';
    return 'Fase Sconosciuta';
  };

  // 2) Alla pressione di "Salva e continua"...
  const generaPartiteEliminazione = async () => {
    if (!torneoId) return;

    // **Controllo se esiste già una fase di eliminazione**
    const { data: fasi, error: errFasi } = await supabase
      .from('fasi_torneo')
      .select('id')
      .eq('torneo_id', torneoId)
      .eq('tipo_fase', 'eliminazione')
      .limit(1);
    if (!errFasi && fasi && fasi.length > 0) {
      // Esiste già: salto generazione e vado a step6
      navigate(`/tornei/nuovo/step6-eliminazione/${torneoId}`, {
        state: { torneoId },
      });
      return;
    }

    // **1. Upsert torneo_squadre** (no duplicati)
    await supabase
      .from('torneo_squadre')
      .upsert(
        state!.squadreSelezionate.map((id) => ({
          torneo_id: torneoId,
          squadra_id: id,
        })),
        { onConflict: ['torneo_id', 'squadra_id'] }
      );

    // **2. Creo fase eliminazione**
    const { data: fase, error: errF } = await supabase
      .from('fasi_torneo')
      .insert({
        torneo_id: torneoId,
        tipo_fase: 'eliminazione',
        fase_numerica: 1,
        round: 1,
      })
      .select('id')
      .single();
    if (errF || !fase) {
      console.error(errF);
      return;
    }
    const faseId = fase.id;

    // **3. Inserisco primo turno**
    const { data: prime, error: errP } = await supabase
      .from('partite_torneo')
      .insert(
        accoppiamenti.map((m, idx) => ({
          squadra_casa_id: m.casa,
          squadra_ospite_id: m.ospite,
          data_ora: m.data || null,
          torneo_id: torneoId,
          fase: getPhaseName(accoppiamenti.length),
          fase_id: faseId,
          ordine_fase: idx,
          next_match_id: null,
        }))
      )
      .select('id');
    if (errP || !prime) {
      console.error(errP);
      return;
    }

    // **4. Genero semifinali e finale**
    let current = prime.map((r) => r.id);
    while (current.length > 1) {
      const phase = getPhaseName(current.length / 2);
      const nextIds: string[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const dVal =
          phase === 'Semifinale'
            ? semifinaliData[i / 2] || null
            : finaleData || null;
        const { data: nm, error: errN } = await supabase
          .from('partite_torneo')
          .insert({
            squadra_casa_id: null,
            squadra_ospite_id: null,
            data_ora: dVal,
            torneo_id: torneoId,
            fase: phase,
            fase_id: faseId,
            ordine_fase: i / 2,
            next_match_id: null,
          })
          .select('id')
          .single();
        if (errN || !nm) {
          console.error(errN);
          return;
        }
        nextIds.push(nm.id);
        // link delle due partite precedenti
        await supabase
          .from('partite_torneo')
          .update({ next_match_id: nm.id })
          .in('id', [current[i], current[i + 1]]);
      }
      current = nextIds;
    }

    // **5. Vai in Step6**
    navigate(`/tornei/nuovo/step6-eliminazione/${torneoId}`, {
      state: { torneoId },
    });
  };

  if (!state) {
    return (
      <p className="text-center text-red-500 mt-6">
        Dati torneo mancanti — torna indietro.
      </p>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-gray-600 hover:text-gray-800 font-medium"
      >
        ← Indietro
      </button>

      <h2 className="text-2xl font-bold text-center">
        Imposta {getPhaseName(accoppiamenti.length)}
      </h2>

      {accoppiamenti.map((m, idx) => {
        const casa = squadre.find((s) => s.id === m.casa)?.nome ?? '???';
        const ospite = squadre.find((s) => s.id === m.ospite)?.nome ?? '???';
        return (
          <div key={idx} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <span>{casa}</span>
              <button
                onClick={() => inverti(idx)}
                title="Inverti casa/ospite"
                className="text-blue-600 hover:text-blue-800"
              >
                ↔
              </button>
              <span>{ospite}</span>
            </div>
            <input
              type="datetime-local"
              value={m.data}
              onChange={(e) =>
                aggiornaData(idx, e.target.value, e.target)
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        );
      })}

      {accoppiamenti.length > 2 && (
        <>
          <h2 className="text-2xl font-bold text-center mt-8">
            Imposta Semifinali
          </h2>
          {semifinaliData.map((d, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <input
                type="datetime-local"
                value={d}
                onChange={(e) =>
                  aggiornaDataSemi(i, e.target.value, e.target)
                }
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          ))}
        </>
      )}

      <h2 className="text-2xl font-bold text-center mt-8">Imposta Finale</h2>
      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="datetime-local"
          value={finaleData}
          onChange={(e) => aggiornaDataFinale(e.target.value, e.target)}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      <button
        onClick={generaPartiteEliminazione}
        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
      >
        Salva e continua
      </button>
    </div>
  );
}
