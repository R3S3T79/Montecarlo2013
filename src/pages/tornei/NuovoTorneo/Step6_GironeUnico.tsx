// src/pages/tornei/NuovoTorneo/Step6_GironeUnico.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface Partita {
  id: string;
  squadra_casa_id: string;
  squadra_ospite_id: string;
  goal_casa: number;
  goal_ospite: number;
  rigori_vincitore: string | null;
  stato: string;
  data_ora: string | null;
}

export default function Step6_GironeUnico() {
  const navigate = useNavigate();
  const location = useLocation();
  const { torneoId: paramId } = useParams<{ torneoId?: string }>();
  const torneoId = (location.state as { torneoId?: string })?.torneoId || paramId;

  const [torneoNome, setTorneoNome] = useState('Torneo');
  const [matches, setMatches] = useState<Partita[]>([]);
  const [squadreMap, setSquadreMap] = useState<Record<string, Squadra>>({});

  useEffect(() => {
    if (!torneoId) return;
    (async () => {
      // 1) prendi nome del torneo
      const { data: tData, error: tErr } = await supabase
        .from('tornei')
        .select('nome')
        .eq('id', torneoId)
        .single();
      if (!tErr && tData) {
        setTorneoNome(tData.nome);
      }

      // 2) prendi partite
      const { data: raw, error: mErr } = await supabase
        .from<Partita>('partite_torneo')
        .select(`
          id,
          squadra_casa_id,
          squadra_ospite_id,
          goal_casa,
          goal_ospite,
          rigori_vincitore,
          stato,
          data_ora
        `)
        .eq('torneo_id', torneoId)
        .order('data_ora', { ascending: true });

      if (mErr || !raw) {
        console.error('Errore fetch partite:', mErr);
        return;
      }

      // ordina anche per id se stesse date
      const ordered = [...raw].sort((a, b) => {
        const t1 = new Date(a.data_ora || '').getTime() - new Date(b.data_ora || '').getTime();
        return t1 !== 0 ? t1 : a.id.localeCompare(b.id);
      });
      setMatches(ordered);

      // 3) prendi squadre
      const ids = Array.from(new Set(raw.flatMap(m => [m.squadra_casa_id, m.squadra_ospite_id])));
      const { data: sData, error: sErr } = await supabase
        .from<Squadra>('squadre')
        .select('id, nome, logo_url')
        .in('id', ids);

      if (sErr || !sData) {
        console.error('Errore fetch squadre:', sErr);
        return;
      }
      setSquadreMap(Object.fromEntries(sData.map(s => [s.id, s])));
    })();
  }, [torneoId]);

  const classifica = useMemo(() => {
    type Row = {
      id: string; nome: string; logo_url: string | null;
      PG: number; V: number; N: number; P: number;
      GF: number; GS: number; DR: number; Pt: number;
    };
    const tbl: Record<string, Row> = {};

    matches.forEach(m => {
      [m.squadra_casa_id, m.squadra_ospite_id].forEach(id => {
        if (!tbl[id]) {
          const s = squadreMap[id];
          tbl[id] = {
            id,
            nome: s?.nome || id,
            logo_url: s?.logo_url || null,
            PG: 0, V: 0, N: 0, P: 0, GF: 0, GS: 0, DR: 0, Pt: 0,
          };
        }
      });
    });

    matches.filter(m => m.stato === 'Giocata').forEach(m => {
      const home = tbl[m.squadra_casa_id];
      const away = tbl[m.squadra_ospite_id];
      if (!home || !away) return;

      home.PG++; away.PG++;
      home.GF += m.goal_casa; home.GS += m.goal_ospite;
      away.GF += m.goal_ospite; away.GS += m.goal_casa;

      const draw = m.goal_casa === m.goal_ospite;
      const rigori = draw && !!m.rigori_vincitore;

      if (m.goal_casa > m.goal_ospite) {
        home.V++; away.P++; home.Pt += 3;
      } else if (m.goal_ospite > m.goal_casa) {
        away.V++; home.P++; away.Pt += 3;
      } else if (rigori) {
        if (m.rigori_vincitore === m.squadra_casa_id) {
          home.V++; away.P++; home.Pt += 3;
        } else {
          away.V++; home.P++; away.Pt += 3;
        }
      } else {
        home.N++; away.N++; home.Pt++; away.Pt++;
      }
    });

    Object.values(tbl).forEach(r => r.DR = r.GF - r.GS);
    return Object.values(tbl).sort((a, b) =>
      b.Pt - a.Pt || b.DR - a.DR || b.GF - a.GF
    );
  }, [matches, squadreMap]);

  const handlePrint = () => window.print();
  const handleSaveAndExit = () => navigate('/tornei');

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return (
      d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' +
      d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-4 print:p-0">
      {/* Header dinamico con nome torneo */}
      <h2 className="text-2xl font-bold text-center mb-4">
        {torneoNome}
      </h2>

      {/* Tabellone */}
      <div className="space-y-3 mb-6">
        {matches.map(m => {
          const home = squadreMap[m.squadra_casa_id];
          const away = squadreMap[m.squadra_ospite_id];

          let score: React.ReactNode = <span className="text-sm font-medium">VS</span>;
          if (m.stato === 'Giocata') {
            let a = String(m.goal_casa), b = String(m.goal_ospite);
            if (a === b && m.rigori_vincitore) {
              if (m.rigori_vincitore === m.squadra_casa_id) a = `.${a}`;
              else b = `${b}.`;
            }
            score = <span className="text-sm font-medium">{a}-{b}</span>;
          }

          return (
            <div
              key={m.id}
              onClick={() =>
                navigate(
                  `/tornei/nuovo/step6-gironeunico/${torneoId}/edit/${m.id}`,
                  { state: { torneoId } }
                )
              }
              className="bg-white shadow-lg hover:shadow-xl rounded-lg p-2 cursor-pointer hover:bg-gray-50"
            >
              <div className="text-xs text-gray-500 mb-1 text-center">
                {formatDate(m.data_ora)}
              </div>
              <div className="flex items-center">
                <span className="w-1/3 text-left text-sm">{home?.nome || m.squadra_casa_id}</span>
                <span className="w-1/3 text-center">{score}</span>
                <span className="w-1/3 text-right text-sm">{away?.nome || m.squadra_ospite_id}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Classifica */}
      <table className="w-full table-auto border-collapse text-center text-sm mb-6">
        <thead className="text-xs bg-gray-100">
          <tr>
            <th className="border px-1 py-1 text-left">Squadra</th>
            <th className="border px-1 py-1">PG</th>
            <th className="border px-1 py-1">V</th>
            <th className="border px-1 py-1">N</th>
            <th className="border px-1 py-1">P</th>
            <th className="border px-1 py-1">GF</th>
            <th className="border px-1 py-1">GS</th>
            <th className="border px-1 py-1">DR</th>
            <th className="border px-1 py-1">Pt</th>
          </tr>
        </thead>
        <tbody>
          {classifica.map((r, i) => (
            <tr key={r.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
              <td className="border px-1 py-1 flex items-center text-sm">
                {r.logo_url && <img src={r.logo_url} alt={r.nome} className="w-5 h-5 rounded-full mr-2" />}
                {r.nome}
              </td>
              <td className="border px-1 py-1">{r.PG}</td>
              <td className="border px-1 py-1">{r.V}</td>
              <td className="border px-1 py-1">{r.N}</td>
              <td className="border px-1 py-1">{r.P}</td>
              <td className="border px-1 py-1">{r.GF}</td>
              <td className="border px-1 py-1">{r.GS}</td>
              <td className="border px-1 py-1">{r.DR}</td>
              <td className="border px-1 py-1">{r.Pt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Stampa + Salva */}
      <div className="flex justify-between print:hidden">
        <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Stampa
        </button>
        <button onClick={handleSaveAndExit} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Salva Torneo
        </button>
      </div>
    </div>
  );
}
