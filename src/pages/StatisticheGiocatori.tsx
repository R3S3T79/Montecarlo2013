// src/pages/StatisticheGiocatori.tsx
// Data creazione chat: 18/08/2025 (rev: doppia colonna Media Voti Utenti + Mister)

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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

        // 2) Medie voti utenti + mister (media stagionale già calcolata nella vista)
const { data: voti, error: vErr } = await supabase
  .from('voti_giocatori_media')
  .select('giocatore_uid, media_voto_utenti, media_voto_mister')
  .eq('stagione_id', stagioneSelezionata);

const medieMap: Record<string, { utenti: number; mister: number }> = {};

if (!vErr && voti) {
  voti.forEach((v: any) => {
    medieMap[v.giocatore_uid] = {
      utenti: v.media_voto_utenti !== null ? Number(v.media_voto_utenti) : 0,
      mister: v.media_voto_mister !== null ? Number(v.media_voto_mister) : 0,
    };
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
      <div className="w-full px-[2px] pt-2 box-border">

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
  <table className="w-full bg-white/90 rounded-lg overflow-hidden border-collapse text-sm">
    <thead className="bg-montecarlo-red-600 text-white">
      <tr className="text-center">
        <th
          className="px-2 py-2 text-left cursor-pointer whitespace-nowrap"
          onClick={() => sortData('giocatore')}
        >
          Giocatore{" "}
          {sortField === "giocatore" ? (
            sortOrder === "asc" ? <ArrowUp size={13} className="inline ml-0.5" /> : <ArrowDown size={13} className="inline ml-0.5" />
          ) : (
            <ArrowUpDown size={13} className="inline ml-0.5 opacity-70" />
          )}
        </th>

        {[
          ["gol", "G"],
          ["presenze", "P"],
          ["media", "M"],
          ["media_voti_utenti", "M.V.U"],
          ["media_voti_mister", "M.V.A"],
        ].map(([field, label]) => (
          <th
            key={field}
            className="px-1 py-2 cursor-pointer whitespace-nowrap"
            onClick={() => sortData(field as any)}
          >
            {label}{" "}
            {sortField === field ? (
              sortOrder === "asc" ? <ArrowUp size={13} className="inline ml-0.5" /> : <ArrowDown size={13} className="inline ml-0.5" />
            ) : (
              <ArrowUpDown size={13} className="inline ml-0.5 opacity-70" />
            )}
          </th>
        ))}
      </tr>
    </thead>

    <tbody>
  {sortedRows.map((st) => (
    <tr
      key={st.giocatore_uid}
      className="border-b border-red-200 hover:bg-red-50 cursor-pointer transition-colors"
      onClick={() => navigate(`/giocatore/${st.giocatore_uid}`)}
    >
      {/* Giocatore */}
      <td className="py-1 pl-3 pr-2 flex items-center gap-2 text-left whitespace-nowrap">
        {st.foto_url ? (
          <img
            src={st.foto_url}
            alt="foto"
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm text-white">
            ?
          </div>
        )}
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-[14px]">{st.giocatore_cognome}</span>
          <span className="text-[12px] text-gray-600">{st.giocatore_nome}</span>
        </div>
      </td>

      {/* G */}
      <td className="py-1 px-[4px] text-center">
        {st.ruolo?.toLowerCase() === "portiere" ? st.subiti : st.gol}
      </td>

      {/* P */}
      <td className="py-1 px-[4px] text-center">{st.presenze}</td>

      {/* M */}
      <td className="py-1 px-[4px] text-center">{st.media.toFixed(2)}</td>

      {/* M.V.U */}
      <td className="py-1 px-[4px] text-center">{st.media_voti_utenti.toFixed(2)}</td>

      {/* M.V.A */}
      <td className="py-1 px-[4px] text-center">{st.media_voti_mister.toFixed(2)}</td>
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