// src/pages/StatisticheGiocatori.tsx
// Data creazione chat: 18/08/2025 (rev: doppia colonna Media Voti Utenti + Mister)

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
  media_voti_utenti: number;
  media_voti_mister: number;
}

export default function StatisticheGiocatori(): JSX.Element {
  const navigate = useNavigate();

  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>('');
  const [ruoloSelezionato, setRuoloSelezionato] = useState<string>(''); // 🔹 filtro per ruolo
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<Statistica[]>([]);

  const [sortField, setSortField] = useState<
    'giocatore' | 'gol' | 'presenze' | 'media' | 'media_voti_utenti' | 'media_voti_mister'
  >('giocatore');
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

  // Carica statistiche + medie voti utenti/mister
  useEffect(() => {
    if (!stagioneSelezionata) {
      setRows([]);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        // 1) Statistiche base
        const { data, error } = await supabase
          .from('v_stat_giocatore_stagione')
          .select('giocatore_uid, nome, cognome, foto_url, ruolo, presenze_totali, goal_totali, goal_subiti')
          .eq('stagione_id', stagioneSelezionata);

        if (error || !data) {
          setRows([]);
          setLoading(false);
          return;
        }

        // 2) Medie voti utenti + mister
        const { data: voti, error: vErr } = await supabase
          .from('voti_giocatori_dettaglio')
          .select('giocatore_id, role, media_voto')
          .eq('stagione_id', stagioneSelezionata);

        const medieMap: Record<string, { utenti: number; mister: number }> = {};

        if (!vErr && voti) {
          voti.forEach((v: any) => {
            if (!medieMap[v.giocatore_id]) {
              medieMap[v.giocatore_id] = { utenti: 0, mister: 0 };
            }
            if (v.role === 'mister') {
              medieMap[v.giocatore_id].mister = Number(v.media_voto) || 0;
            } else {
              medieMap[v.giocatore_id].utenti = Number(v.media_voto) || 0;
            }
          });
        }

        // 3) Mappiamo dati finali
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
            media_voti_utenti: medieMap[r.giocatore_uid]?.utenti ?? 0,
            media_voti_mister: medieMap[r.giocatore_uid]?.mister ?? 0,
          };
        });

        setRows(mapped);
      } finally {
        setLoading(false);
      }
    })();
  }, [stagioneSelezionata]);

  // Ordinamento
  const sortData = (
    field: 'giocatore' | 'gol' | 'presenze' | 'media' | 'media_voti_utenti' | 'media_voti_mister'
  ) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 🔹 Filtro ruolo
  const filteredRows = useMemo(() => {
    if (!ruoloSelezionato) return rows;
    return rows.filter((r) => r.ruolo?.toLowerCase() === ruoloSelezionato.toLowerCase());
  }, [rows, ruoloSelezionato]);

  const sortedRows = useMemo(() => {
    const out = [...filteredRows];
    out.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'giocatore') {
        const an = `${a.giocatore_cognome ?? ''} ${a.giocatore_nome ?? ''}`.trim();
        const bn = `${b.giocatore_cognome ?? ''} ${b.giocatore_nome ?? ''}`.trim();
        cmp = an.localeCompare(bn);
      } else if (sortField === 'gol') {
        const av = a.ruolo?.toLowerCase() === 'portiere' ? a.subiti : a.gol;
        const bv = b.ruolo?.toLowerCase() === 'portiere' ? b.subiti : b.gol;
        cmp = av - bv;
      } else if (sortField === 'presenze') {
        cmp = a.presenze - b.presenze;
      } else if (sortField === 'media') {
        cmp = a.media - b.media;
      } else if (sortField === 'media_voti_utenti') {
        cmp = a.media_voti_utenti - b.media_voti_utenti;
      } else {
        cmp = a.media_voti_mister - b.media_voti_mister;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [filteredRows, sortField, sortOrder]);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto pt-2 px-2">
        {/* 🔹 Filtri Stagione + Ruolo */}
        <div className="flex gap-2 mb-2">
          <select
            className="flex-1 border rounded-md px-3 py-2 text-sm"
            value={stagioneSelezionata}
            onChange={(e) => setStagioneSelezionata(e.target.value)}
          >
            {stagioni.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>

          <select
            className="flex-1 border rounded-md px-3 py-2 text-sm"
            value={ruoloSelezionato}
            onChange={(e) => setRuoloSelezionato(e.target.value)}
          >
            <option value="">Tutti i ruoli</option>
            <option value="Portiere">Portiere</option>
            <option value="Difensore">Difensore</option>
            <option value="Centrocampista">Centrocampista</option>
            <option value="Attaccante">Attaccante</option>
          </select>
        </div>

        {/* Legenda */}
<div className="grid grid-cols-2 gap-y-1 gap-x-4 text-sm text-gray-600 pt-2 px-2 text-white">
  <div><strong>G</strong> = Fatti/Subiti</div>
  <div><strong>M.V.U</strong> = Media Utenti</div>
  <div><strong>P</strong> = Presenze</div>
  <div><strong>M.V.A</strong> = Media Allenatore</div>
  <div className="col-span-2"><strong>M</strong> = Media Goal fatti/subiti</div>
</div>


        {loading ? (
          <div className="text-center text-montecarlo-secondary">Caricamento...</div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full bg-white/90 rounded-lg overflow-hidden">
              <thead className="bg-montecarlo-red-600 text-white">
                <tr>
                  <th className="px-10 py-2 text-left cursor-pointer" onClick={() => sortData('giocatore')}>
                    Giocatore
                  </th>
                  <th className="px-3 py-2 text-center cursor-pointer" onClick={() => sortData('gol')}>
                    G
                  </th>
                  <th className="px-3 py-2 text-center cursor-pointer" onClick={() => sortData('presenze')}>
                    P
                  </th>
                  <th className="px-3 py-2 text-center cursor-pointer" onClick={() => sortData('media')}>
                    M
                  </th>
                  <th className="px-3 py-2 text-center cursor-pointer" onClick={() => sortData('media_voti_utenti')}>
                    M.V.U
                  </th>
                  <th className="px-3 py-2 text-center cursor-pointer" onClick={() => sortData('media_voti_mister')}>
                    M.V.A
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

                    {/* Goal/Subiti */}
                    <td className="px-4 py-2 text-center">
                      {st.ruolo?.toLowerCase() === 'portiere' ? st.subiti : st.gol}
                    </td>

                    <td className="px-4 py-2 text-center">{st.presenze}</td>
                    <td className="px-4 py-2 text-center">{st.media.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">{st.media_voti_utenti.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">{st.media_voti_mister.toFixed(2)}</td>
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-montecarlo-neutral">
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
