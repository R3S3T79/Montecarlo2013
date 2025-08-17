// src/pages/tornei/NuovoTorneo/Step5_Eliminazione.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

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

type DateTurniMap = { [round: number]: string[] };

export default function Step5_Eliminazione() {
  const { state } = useLocation() as { state: StateType | null };
  const { torneoId: paramId } = useParams();
  const navigate = useNavigate();
  const torneoId = state?.torneoId || paramId;

  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [accoppiamenti, setAccoppiamenti] = useState<MatchInput[]>([]);
  const [dateTurni, setDateTurni] = useState<DateTurniMap>({});

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const getNumeroTurni = (n: number): number => Math.ceil(Math.log2(n));
  const getEtichettaFase = (ri: number, total: number): string => {
    const nomi = [
      'Finale',
      'Semifinale',
      'Quarti di Finale',
      'Ottavi di Finale',
      'Sedicesimi di Finale',
      'Trentaduesimi di Finale',
    ];
    return nomi[total - ri - 1] || `Turno ${ri + 1}`;
  };

  const formatDateForInput = (val: string | null): string => {
    if (!val) return '';
    const d = new Date(val);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  useEffect(() => {
    if (!torneoId) return;

    const fetchFromState = async () => {
      const ids = state!.squadreSelezionate;
      const { data: sqs, error } = await supabase
        .from('squadre')
        .select('id,nome')
        .in('id', ids);
      if (error || !sqs) return;
      const ordered = ids.map(id => sqs.find(s => s.id === id)).filter((s): s is Squadra => !!s);
      setSquadre(ordered);

      const iniziali: MatchInput[] = [];
      for (let i = 0; i < ordered.length; i += 2) {
        iniziali.push({ casa: ordered[i].id, ospite: ordered[i + 1].id, data: '' });
      }
      setAccoppiamenti(iniziali);

      const totTurni = getNumeroTurni(ordered.length);
      const dt: DateTurniMap = {};
      for (let r = 1; r < totTurni; r++) {
        dt[r] = new Array(ordered.length / Math.pow(2, r + 1)).fill('');
      }
      setDateTurni(dt);
    };

    const fetchFromDB = async () => {
      const { data: partite } = await supabase
        .from('tornei_eliminazione')
        .select('squadra_casa, squadra_ospite, data_match, round_number')
        .eq('torneo_id', torneoId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (!partite) return;

      const iniziali = partite.filter(p => p.round_number === 1);
      const successive = partite.filter(p => p.round_number > 1);

      const ids = Array.from(new Set([
        ...iniziali.map(p => p.squadra_casa),
        ...iniziali.map(p => p.squadra_ospite),
      ])).filter((x): x is string => !!x);

      const { data: sqs } = await supabase
        .from('squadre')
        .select('id,nome')
        .in('id', ids);
      if (!sqs) return;

      setSquadre(sqs);

      const acc: MatchInput[] = iniziali.map(p => ({
        casa: p.squadra_casa,
        ospite: p.squadra_ospite,
        data: p.data_match || '',
      }));
      setAccoppiamenti(acc);

      const dateMap: DateTurniMap = {};
      successive.forEach(p => {
        if (!dateMap[p.round_number]) dateMap[p.round_number] = [];
        dateMap[p.round_number].push(p.data_match || '');
      });
      setDateTurni(dateMap);
    };

    if (state?.squadreSelezionate?.length) {
      fetchFromState();
    } else {
      fetchFromDB();
    }
  }, [state, torneoId]);

  const aggiornaData = (i: number, val: string) => {
    setAccoppiamenti(prev =>
      prev.map((m, idx) => (idx === i ? { ...m, data: val } : m))
    );
  };

  const aggiornaDataTurno = (r: number, i: number, val: string) => {
    setDateTurni(prev => ({
      ...prev,
      [r]: prev[r].map((d, idx) => (idx === i ? val : d)),
    }));
  };

  const inverti = (i: number) => {
    setAccoppiamenti(prev =>
      prev.map((m, idx) =>
        idx === i ? { casa: m.ospite, ospite: m.casa, data: m.data } : m
      )
    );
  };

  const salvaEliminazione = async () => {
    if (!torneoId || accoppiamenti.length === 0) return;

    type Partita = {
      id: string;
      torneo_id: string;
      round_number: number;
      match_number: number;
      fase_torneo: string;
      squadra_casa: string | null;
      squadra_ospite: string | null;
      data_match: string | null;
      lettera: string;
      next_match_id: string | null;
    };

    const totTurni = getNumeroTurni(squadre.length);
    const partite: Partita[] = [];
    const idMap: { [key: string]: string } = {};

    accoppiamenti.forEach((m, i) => {
      const matchId = uuidv4();
      idMap[`R0M${i}`] = matchId;
      partite.push({
        id: matchId,
        torneo_id: torneoId as string,
        round_number: 1,
        match_number: i + 1,
        fase_torneo: getEtichettaFase(0, totTurni),
        squadra_casa: m.casa,
        squadra_ospite: m.ospite,
        data_match: m.data || null,
        lettera: letters[i],
        next_match_id: null,
      });
    });

    let prevCount = accoppiamenti.length;
    for (let r = 1; r < totTurni; r++) {
      const count = prevCount / 2;
      for (let i = 0; i < count; i++) {
        const matchId = uuidv4();
        const label = letters[accoppiamenti.length + (prevCount / 2 - count) + i];
        const dataValue = dateTurni[r]?.[i] || null;
        partite.push({
          id: matchId,
          torneo_id: torneoId as string,
          round_number: r + 1,
          match_number: i + 1,
          fase_torneo: getEtichettaFase(r, totTurni),
          squadra_casa: null,
          squadra_ospite: null,
          data_match: dataValue,
          lettera: label,
          next_match_id: null,
        });
        const p1 = idMap[`R${r - 1}M${2 * i}`];
        const p2 = idMap[`R${r - 1}M${2 * i + 1}`];
        idMap[`R${r}M${i}`] = matchId;

        const idx1 = partite.findIndex(p => p.id === p1);
        const idx2 = partite.findIndex(p => p.id === p2);
        if (idx1 >= 0) partite[idx1].next_match_id = matchId;
        if (idx2 >= 0) partite[idx2].next_match_id = matchId;
      }
      prevCount = count;
    }

    await supabase.from('tornei_eliminazione').delete().eq('torneo_id', torneoId);

    const insertData = partite.map(({ next_match_id, ...rest }) => rest);
    await supabase
      .from('tornei_eliminazione')
      .insert(insertData)
      .select('id');

    for (const match of partite) {
      if (!match.next_match_id) continue;
      await supabase
        .from('tornei_eliminazione')
        .update({ next_match_id: match.next_match_id })
        .eq('id', match.id);
    }

    navigate(`/tornei/nuovo/step6-eliminazione/${torneoId}`);
  };

  if (!torneoId) {
    return <p className="text-center mt-10 text-red-500">Errore: torneoId mancante.</p>;
  }

  const totTurni = getNumeroTurni(squadre.length);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-center border-b pb-2">
        {getEtichettaFase(0, totTurni)}
      </h2>

      {accoppiamenti.map((m, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-4">
          <div className="relative mb-3 h-6 text-sm font-medium text-gray-700">
            <span className="absolute left-0">{squadre.find(s => s.id === m.casa)?.nome}</span>
            <span className="absolute right-0">{squadre.find(s => s.id === m.ospite)?.nome}</span>
            <button
              onClick={() => inverti(i)}
              className="absolute inset-y-0 left-1/2 transform -translate-x-1/2"
            >
              {letters[i]}
            </button>
          </div>
          <input
            type="datetime-local"
            value={formatDateForInput(m.data)}
            onChange={e => {
              aggiornaData(i, e.target.value);
              e.target.blur();
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none transition"
          />
        </div>
      ))}

      {Object.entries(dateTurni).map(([roundStr, arr]) => {
        const round = parseInt(roundStr, 10);
        const startIdx = accoppiamenti.length + (accoppiamenti.length / 2) * (round - 1);
        return (
          <div key={round}>
            <h3 className="text-xl font-semibold text-center mt-6">
              {getEtichettaFase(round, totTurni)}
            </h3>
            {arr.map((d, i) => {
              const letter = letters[startIdx + i];
              const prev1 = letters[startIdx - (accoppiamenti.length / Math.pow(2, round)) * 2 + 2 * i];
              const prev2 = letters[startIdx - (accoppiamenti.length / Math.pow(2, round)) * 2 + 2 * i + 1];
              return (
                <div key={i} className="bg-white rounded-lg shadow p-4 mt-2">
                  <div className="relative mb-3 h-6 text-sm font-medium text-gray-700">
                    <span className="absolute left-0">Vincitrice {prev1}</span>
                    <span className="absolute right-0">Vincitrice {prev2}</span>
                    <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2">
                      {letter}
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    value={formatDateForInput(d)}
                    onChange={e => {
                      aggiornaDataTurno(round, i, e.target.value);
                      e.target.blur();
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none transition"
                  />
                </div>
              );
            })}
          </div>
        );
      })}

      <button
        onClick={salvaEliminazione}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold shadow"
      >
        Continua
      </button>

      <button
        onClick={() => navigate(-1)}
        className="w-full bg-gray-300 text-black py-2 rounded-lg hover:bg-gray-400 transition"
      >
        Indietro
      </button>
    </div>
  );
}
