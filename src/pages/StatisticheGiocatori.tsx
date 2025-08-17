// src/pages/StatisticheGiocatori.tsx
// Data creazione chat: 15/08/2025

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface Stagione {
  id: string;
  nome: string;  
  data_inizio: string;
  data_fine: string;
}

interface ViewStatRow {
  giocatore_uid: string;
  stagione_id: string;
  goal_totali: number;
  presenze_totali: number;
}

interface GiocatoreStagioneRow {
  giocatore_uid: string;
  nome: string | null;
  cognome: string | null;
  foto_url: string | null;
}

interface Statistica {
  giocatore_uid: string;
  nome: string | null;
  cognome: string | null;
  foto_url: string | null;
  gol: number;
  presenze: number;
  media: number;
}

export default function StatisticheGiocatori(): JSX.Element {
  const navigate = useNavigate();

  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [rowsView, setRowsView] = useState<ViewStatRow[]>([]);
  const [rowsGiocatori, setRowsGiocatori] = useState<GiocatoreStagioneRow[]>([]);

  const [sortField, setSortField] = useState<'giocatore' | 'gol' | 'presenze' | 'media'>('giocatore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Carica stagioni
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('stagioni')
        .select('id, nome, data_inizio, data_fine')
        .order('data_inizio', { ascending: false });

      if (error || !data) return;

      setStagioni(data);
      const oggi = new Date().toISOString().split('T')[0];
      const corrente = data.find((s) => s.data_inizio <= oggi && s.data_fine >= oggi);
      setStagioneSelezionata(corrente?.id ?? data[0]?.id ?? '');
    })();
  }, []);

  // Carica statistiche (view) + anagrafiche (v_giocatori_stagioni) per la stagione selezionata
  useEffect(() => {
    if (!stagioneSelezionata) {
      setRowsView([]);
      setRowsGiocatori([]);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        // 1) Statistiche aggregate dalla view ufficiale
        const { data: vData, error: vErr } = await supabase
          .from('v_stat_giocatore_stagione')
          .select('giocatore_uid, stagione_id, goal_totali, presenze_totali')
          .eq('stagione_id', stagioneSelezionata);

        if (vErr || !vData) {
          setRowsView([]);
        } else {
          setRowsView(vData as ViewStatRow[]);
        }

        // 2) Anagrafiche giocatori (con foto) dalla view v_giocatori_stagioni
        const { data: gData, error: gErr } = await supabase
          .from('v_giocatori_stagioni')
          .select('giocatore_id, nome, cognome, foto_url')
          .eq('stagione_id', stagioneSelezionata)
          .order('cognome', { ascending: true });

        if (gErr || !gData) {
          setRowsGiocatori([]);
        } else {
          // rinomino giocatore_id in giocatore_uid per coerenza
          const mapped = gData.map((g) => ({
            giocatore_uid: g.giocatore_id,
            nome: g.nome,
            cognome: g.cognome,
            foto_url: g.foto_url,
          }));
          setRowsGiocatori(mapped as GiocatoreStagioneRow[]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [stagioneSelezionata]);

  // Merge view + anagrafiche
  const statistiche: Statistica[] = useMemo(() => {
    if (!rowsGiocatori.length) return [];

    const byUid = new Map<string, ViewStatRow>();
    rowsView.forEach((r) => byUid.set(r.giocatore_uid, r));

    return rowsGiocatori.map((g) => {
      const agg = byUid.get(g.giocatore_uid);
      const gol = agg?.goal_totali ?? 0;
      const presenze = agg?.presenze_totali ?? 0;
      const media = presenze > 0 ? parseFloat((gol / presenze).toFixed(2)) : 0;

      return {
        giocatore_uid: g.giocatore_uid,
        nome: g.nome ?? null,
        cognome: g.cognome ?? null,
        foto_url: g.foto_url ?? null,
        gol,
        presenze,
        media,
      };
    });
  }, [rowsGiocatori, rowsView]);

  // Ordinamento
  const sortData = (field: 'giocatore' | 'gol' | 'presenze' | 'media') => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedStatistiche = useMemo(() => {
    const out = [...statistiche];
    out.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'giocatore') {
        const an = `${a.cognome ?? ''} ${a.nome ?? ''}`.trim();
        const bn = `${b.cognome ?? ''} ${b.nome ?? ''}`.trim();
        cmp = an.localeCompare(bn);
      } else if (sortField === 'gol') {
        cmp = a.gol - b.gol;
      } else if (sortField === 'presenze') {
        cmp = a.presenze - b.presenze;
      } else {
        cmp = a.media - b.media;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [statistiche, sortField, sortOrder]);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-xl shadow-montecarlo p-6 space-y-6">
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={stagioneSelezionata}
            onChange={(e) => setStagioneSelezionata(e.target.value)}
          >
            {stagioni.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>

          {/* Legenda */}
          <div className="text-sm text-gray-600 flex space-x-6 px-2">
            <span><strong>G</strong> = Gol</span>
            <span><strong>P</strong> = Presenze</span>
            <span><strong>M</strong> = Media</span>
          </div>

          {loading ? (
            <div className="text-center text-montecarlo-secondary">Caricamento...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden">
                <thead className="bg-montecarlo-red-600 text-white">
                  <tr>
                    <th className="px-4 py-2 text-left cursor-pointer" onClick={() => sortData('giocatore')}>
                      Giocatore
                    </th>
                    <th className="px-4 py-2 text-center cursor-pointer" onClick={() => sortData('gol')}>
                      G
                    </th>
                    <th className="px-4 py-2 text-center cursor-pointer" onClick={() => sortData('presenze')}>
                      P
                    </th>
                    <th className="px-4 py-2 text-center cursor-pointer" onClick={() => sortData('media')}>
                      M
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStatistiche.map((st) => (
                    <tr
                      key={st.giocatore_uid}
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/giocatore/${st.giocatore_uid}`)}
                    >
                      <td className="px-4 py-2 flex items-center space-x-2">
                        {st.foto_url ? (
                          <img
                            src={st.foto_url}
                            alt="foto"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">
                            ?
                          </div>
                        )}
                        <span>{`${st.cognome ?? ''} ${st.nome ?? ''}`.trim()}</span>
                      </td>
                      <td className="px-4 py-2 text-center">{st.gol}</td>
                      <td className="px-4 py-2 text-center">{st.presenze}</td>
                      <td className="px-4 py-2 text-center">{st.media.toFixed(2)}</td>
                    </tr>
                  ))}
                  {sortedStatistiche.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-montecarlo-neutral">
                        Nessun dato disponibile
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
