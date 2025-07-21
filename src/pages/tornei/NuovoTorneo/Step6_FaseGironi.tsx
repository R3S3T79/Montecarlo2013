// src/pages/tornei/NuovoTorneo/Step6_FaseGironi.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Outlet } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface Partita {
  id: string;
  goal_casa: number;
  goal_ospite: number;
  data_ora: string | null;
  stato: string;
  squadra_casa: Squadra;
  squadra_ospite: Squadra;
}

export default function Step6_FaseGironi() {
  const { torneoId } = useParams<{ torneoId: string }>();
  const navigate = useNavigate();

  const [torneoNome, setTorneoNome] = useState('');
  const [groups, setGroups] = useState<Record<number, Squadra[]>>({});
  const [matches, setMatches] = useState<Partita[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!torneoId) return;

      // 1) nome del torneo
      const { data: t } = await supabase
        .from('tornei')
        .select('nome')
        .eq('id', torneoId)
        .single();
      if (t) setTorneoNome(t.nome);

      // 2) fase multi_gironi
      const { data: f } = await supabase
        .from('fasi_torneo')
        .select('id')
        .eq('torneo_id', torneoId)
        .eq('tipo_fase', 'multi_gironi')
        .single();
      if (!f) { console.error('Fase multi_gironi non trovata'); setLoading(false); return; }

      // 3) squadre per gironi
      const { data: gs } = await supabase
        .from('gironi_squadre')
        .select('girone, squadra: squadra_id(id,nome,logo_url)')
        .eq('fase_id', f.id)
        .order('girone', { ascending: true });
      const grp: Record<number, Squadra[]> = {};
      gs?.forEach(r => {
        grp[r.girone] = grp[r.girone] || [];
        grp[r.girone].push(r.squadra);
      });
      setGroups(grp);

      // 4) partite
      const { data: pts } = await supabase
        .from<Partita>('partite_torneo')
        .select(`
          id,
          goal_casa,
          goal_ospite,
          data_ora,
          stato,
          squadra_casa: squadra_casa_id(id,nome,logo_url),
          squadra_ospite: squadra_ospite_id(id,nome,logo_url)
        `)
        .eq('torneo_id', torneoId)
        .eq('fase_id', f.id)
        .order('data_ora', { ascending: true });
      setMatches(pts || []);

      setLoading(false);
    })();
  }, [torneoId]);

  const letterFor = (n: number) => String.fromCharCode(64 + n);
  const matchesOfGroup = (teams: Squadra[]) =>
    matches.filter(m =>
      teams.some(t => t.id === m.squadra_casa.id) &&
      teams.some(t => t.id === m.squadra_ospite.id)
    );

  const calcClassifica = (teams: Squadra[]) => {
    type Stat = { squadra: Squadra; pg: number; v: number; n: number; p: number; gf: number; gs: number; dr: number; pt: number };
    const stats: Record<string, Stat> = {};
    teams.forEach(t => stats[t.id] = { squadra: t, pg: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, dr: 0, pt: 0 });
    matchesOfGroup(teams).filter(m => m.stato === 'Giocata').forEach(m => {
      const home = stats[m.squadra_casa.id], away = stats[m.squadra_ospite.id];
      home.pg++; away.pg++;
      home.gf += m.goal_casa; home.gs += m.goal_ospite;
      away.gf += m.goal_ospite; away.gs += m.goal_casa;
      if (m.goal_casa > m.goal_ospite)      { home.v++; home.pt += 3; away.p++; }
      else if (m.goal_ospite > m.goal_casa) { away.v++; away.pt += 3; home.p++; }
      else { home.n++; away.n++; home.pt++; away.pt++; }
    });
    return Object.values(stats)
      .map(s => ({ ...s, dr: s.gf - s.gs }))
      .sort((a,b) => b.pt - a.pt || b.dr - a.dr || b.gf - a.gf);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day:'2-digit',month:'2-digit',year:'numeric' })
      + ' ' + d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  };

  if (loading) return <p className="text-center py-6">Caricamento…</p>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-12">
      <h2 className="text-2xl font-bold text-center">{torneoNome}</h2>

      {Object.entries(groups).map(([g, teamsArr]) => {
        const num = Number(g), letter = letterFor(num);
        const scontri = matchesOfGroup(teamsArr);
        const classifica = calcClassifica(teamsArr);

        return (
          <div key={g} className="space-y-6">
            <h3 className="text-lg font-semibold">Girone {letter}</h3>

            <div className="space-y-3">
              {scontri.map(m => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/tornei/nuovo/step6-fasegironi/${torneoId}/edit/${m.id}`)}
                  className="
                    bg-white rounded-lg shadow-md hover:shadow-lg
                    hover:bg-gray-50 transition-all duration-200
                    p-4 cursor-pointer max-w-lg mx-auto
                  "
                >
                  {/* Data */}
                  <div className="text-xs text-gray-500 mb-3 text-center">
                    {formatDate(m.data_ora)}
                  </div>
                  
                  {/* Layout orizzontale con grid */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    {/* Squadra Casa */}
                    <div className="flex items-center space-x-2 min-w-0">
                      {m.squadra_casa.logo_url && (
                        <img 
                          src={m.squadra_casa.logo_url}
                          className="w-6 h-6 rounded-full flex-shrink-0" 
                          alt="" 
                        />
                      )}
                      <span className="text-sm font-medium truncate">
                        {m.squadra_casa.nome}
                      </span>
                    </div>

                    {/* Punteggio */}
                    <div className="flex items-center space-x-2 text-lg font-bold text-blue-600 flex-shrink-0">
                      <span>{m.goal_casa}</span>
                      <span>-</span>
                      <span>{m.goal_ospite}</span>
                    </div>

                    {/* Squadra Ospite */}
                    <div className="flex items-center space-x-2 justify-end min-w-0">
                      <span className="text-sm font-medium truncate">
                        {m.squadra_ospite.nome}
                      </span>
                      {m.squadra_ospite.logo_url && (
                        <img 
                          src={m.squadra_ospite.logo_url}
                          className="w-6 h-6 rounded-full flex-shrink-0" 
                          alt="" 
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CLASSIFICA */}
            <div>
              <h4 className="text-lg font-semibold mb-2">Classifica {letter}</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded shadow">
                  <thead className="bg-gray-100 text-xs text-gray-600 uppercase">
                    <tr>
                      <th className="border px-3 py-2 text-left w-48">Squadra</th>
                      <th className="border px-3 py-2">PG</th>
                      <th className="border px-3 py-2">V</th>
                      <th className="border px-3 py-2">N</th>
                      <th className="border px-3 py-2">P</th>
                      <th className="border px-3 py-2">GF</th>
                      <th className="border px-3 py-2">GS</th>
                      <th className="border px-3 py-2">DR</th>
                      <th className="border px-3 py-2">Pt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classifica.map((r, i) => (
                      <tr key={r.squadra.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="border px-3 py-2 flex items-center space-x-2 w-48">
                          {r.squadra.logo_url && (
                            <img src={r.squadra.logo_url}
                                 className="w-6 h-6 rounded-full" alt="" />
                          )}
                          <span>{r.squadra.nome}</span>
                        </td>
                        <td className="border px-3 py-2 text-center">{r.pg}</td>
                        <td className="border px-3 py-2 text-center">{r.v}</td>
                        <td className="border px-3 py-2 text-center">{r.n}</td>
                        <td className="border px-3 py-2 text-center">{r.p}</td>
                        <td className="border px-3 py-2 text-center">{r.gf}</td>
                        <td className="border px-3 py-2 text-center">{r.gs}</td>
                        <td className="border px-3 py-2 text-center">{r.dr}</td>
                        <td className="border px-3 py-2 text-center">{r.pt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex justify-between">
        <button onClick={() => window.print()} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
          Stampa
        </button>
        <button onClick={() => navigate(`/tornei/nuovo/step7-fasegironi/${torneoId}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Gironi Finali
        </button>
      </div>

      <Outlet />
    </div>
  );
}
