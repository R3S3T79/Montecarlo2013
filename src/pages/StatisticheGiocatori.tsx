// src/pages/StatisticheGiocatori.tsx
// Data creazione chat: 18/08/2025 (rev: adattato a v_stat_giocatore_stagione)

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface Stagione {
  id: string;
  nome: string;
  data_inizio: string;
  data_fine: string;
}

interface Statistica {
  giocatore_uid: string;
  giocatore_nome: string | null;
  giocatore_cognome: string | null;
  foto_url: string | null;
  ruolo: string | null;
  presenze: number;
  gol: number;
  subiti: number;
  media: number;
  media_voti: number;
}

export default function StatisticheGiocatori(): JSX.Element {
  const navigate = useNavigate();

  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<Statistica[]>([]);

  const [sortField, setSortField] = useState<'giocatore' | 'gol' | 'presenze' | 'media' | 'media_voti'>('giocatore');
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

  // Carica statistiche dalla vista unica
  useEffect(() => {
    if (!stagioneSelezionata) {
      setRows([]);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
  .from('v_stat_giocatore_stagione')
  .select('giocatore_uid, nome, cognome, foto_url, ruolo, presenze_totali, goal_totali, goal_subiti, media_voti')
  .eq('stagione_id', stagioneSelezionata);


        if (error || !data) {
          setRows([]);
        } else {
          const mapped: Statistica[] = data.map((r: any) => {
            const presenze = r.presenze_totali ?? 0;
            const gol = r.goal_totali ?? 0;
            const subiti = r.goal_subiti ?? 0;
            let media = 0;

            if (presenze > 0) {
              if (r.ruolo?.toLowerCase() === 'portiere') {
                media = parseFloat((subiti / presenze).toFixed(2));
              } else {
                media = parseFloat((gol / presenze).toFixed(2));
              }
            }

            return {
  giocatore_uid: r.giocatore_uid,
  giocatore_nome: r.nome,
  giocatore_cognome: r.cognome,
  foto_url: r.foto_url,
  ruolo: r.ruolo,
  presenze,
  gol,
  subiti,
  media,
  media_voti: r.media_voti ?? 0,
};

          });
          setRows(mapped);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [stagioneSelezionata]);

  // Ordinamento
  const sortData = (field: 'giocatore' | 'gol' | 'presenze' | 'media' | 'media_voti') => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedRows = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'giocatore') {
        const an = `${a.giocatore_cognome ?? ''} ${a.giocatore_nome ?? ''}`.trim();
        const bn = `${b.giocatore_cognome ?? ''} ${b.giocatore_nome ?? ''}`.trim();
        cmp = an.localeCompare(bn);
      } else if (sortField === 'gol') {
        cmp = a.gol - b.gol;
      } else if (sortField === 'presenze') {
        cmp = a.presenze - b.presenze;
      } else if (sortField === 'media') {
        cmp = a.media - b.media;
      } else {
        cmp = a.media_voti - b.media_voti;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [rows, sortField, sortOrder]);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto pt-2 px-2">
        
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
          <div className="text-sm text-gray-600 flex space-x-6 pt-2 px-2 text-white">
            <span><strong>G</strong> = Gol</span>
            <span><strong>P</strong> = Presenze</span>
            <span><strong>M</strong> = Media Goal Fatti/Subiti</span>
            <span><strong>M.V</strong> = Media Voti</span>
          </div>

          {loading ? (
            <div className="text-center text-montecarlo-secondary">Caricamento...</div>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full bg-white/90 rounded-lg overflow-hidden">
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
                    <th className="px-4 py-2 text-center cursor-pointer" onClick={() => sortData('media_voti')}>
                      M.V
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((st) => (
                    <tr
                      key={st.giocatore_uid}
                      className="border-b border-red-500 last:border-0 hover:bg-gray-50 cursor-pointer"
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
                        <div className="flex flex-col">
                          <span>{st.giocatore_cognome}</span>
                          <span>{st.giocatore_nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">{st.gol}</td>
                      <td className="px-4 py-2 text-center">{st.presenze}</td>
                      <td className="px-4 py-2 text-center">{st.media.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">{st.media_voti.toFixed(2)}</td>
                    </tr>
                  ))}
                  {sortedRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-montecarlo-neutral">
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
    
  );
}
