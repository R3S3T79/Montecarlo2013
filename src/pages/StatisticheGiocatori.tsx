// src/pages/StatisticheGiocatori.tsx
// Data creazione chat: 18/08/2025 (rev: doppia colonna Media Voti Utenti + Mister)

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from '../context/AuthContext';



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
  media_voti_mister: number;
    gialli: number;
  rossi: number;
    assist: number;
}

export default function StatisticheGiocatori(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
const [, setRole] = useState<string | null>(null);

useEffect(() => {
  if (!user) return;

  (async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
  setRole(data.role);
  console.log("[StatisticheGiocatori] Ruolo utente:", data.role);
}
  })();
}, [user]);


  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>('');
  const [ruoloSelezionato, setRuoloSelezionato] = useState<string>(''); // 🔹 filtro per ruolo
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<Statistica[]>([]);

  const [sortField, setSortField] = useState<
  'giocatore' | 'gol' | 'presenze' | 'media' | 'media_voti_mister' | 'assist' | 'gialli' | 'rossi'
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

// 3) Carico cartellini della stagione
const { data: cartellini, error: cErr } = await supabase
  .from('cartellini')
  .select('giocatore_stagione_id, tipo')
  .eq('stagione_id', stagioneSelezionata);

  const cartelliniMap: Record<string, { gialli: number; rossi: number }> = {};

if (!cErr && cartellini) {
  cartellini.forEach((c: any) => {
    if (!cartelliniMap[c.giocatore_stagione_id]) {
      cartelliniMap[c.giocatore_stagione_id] = {
        gialli: 0,
        rossi: 0,
      };
    }

    if (c.tipo?.toLowerCase() === 'giallo') {
      cartelliniMap[c.giocatore_stagione_id].gialli++;
    }

    if (c.tipo?.toLowerCase() === 'rosso') {
      cartelliniMap[c.giocatore_stagione_id].rossi++;
    }
  });
}

const { data: giocatoriStagioneIds, error: gsErr } = await supabase
  .from('giocatori_stagioni_view')
  .select('id, giocatore_uid')
  .eq('stagione_id', stagioneSelezionata);

  const giocatoreStagioneMap: Record<string, string> = {};

if (!gsErr && giocatoriStagioneIds) {
  giocatoriStagioneIds.forEach((g: any) => {
    giocatoreStagioneMap[g.giocatore_uid] = g.id;
  });
}

// 4) Carico gli assist della stagione
const { data: assistData, error: assistErr } = await supabase
  .from('marcatori')
  .select('assist_giocatore_stagione_id')
  .eq('stagione_id', stagioneSelezionata);

const assistMap: Record<string, number> = {};

if (!assistErr && assistData) {
  assistData.forEach((a: any) => {
    if (!a.assist_giocatore_stagione_id) return;

    assistMap[a.assist_giocatore_stagione_id] =
      (assistMap[a.assist_giocatore_stagione_id] ?? 0) + 1;
  });
}


        // 3) Mappiamo dati finali
        const mapped: Statistica[] = data.map((r: any) => {
          const presenze = r.presenze_totali ?? 0;
          const gol = r.goal_totali ?? 0;
          const subiti = r.goal_subiti ?? 0;
          const giocatoreStagioneId = giocatoreStagioneMap[r.giocatore_uid];
          const assist = giocatoreStagioneId
  ? assistMap[giocatoreStagioneId] ?? 0
  : 0;

const gialli = giocatoreStagioneId
  ? cartelliniMap[giocatoreStagioneId]?.gialli ?? 0
  : 0;

const rossi = giocatoreStagioneId
  ? cartelliniMap[giocatoreStagioneId]?.rossi ?? 0
  : 0;
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
            media_voti_mister: medieMap[r.giocatore_uid]?.mister ?? 0,
            gialli,
            rossi,
            assist,
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
  field: 'giocatore' | 'gol' | 'presenze' | 'media' | 'media_voti_mister' | 'assist' | 'gialli' | 'rossi'
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
} else if (sortField === 'assist') {
  cmp = a.assist - b.assist;
} else if (sortField === 'gialli') {
  cmp = a.gialli - b.gialli;
} else if (sortField === 'rossi') {
  cmp = a.rossi - b.rossi;
} else {
  cmp = a.media_voti_mister - b.media_voti_mister;
}
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [filteredRows, sortField, sortOrder]);

  return (
    <div className="min-h-screen">
      <div className="w-full px-[2px] pt-2 pb-6 box-border">

        {/* 1. Filtri Stagione + Ruolo */}
        <div className="flex gap-2 mb-4">

          <div className="relative flex-1 overflow-hidden rounded-xl shadow-[0_5px_14px_rgba(0,0,0,0.35)]">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-12 items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-[20px] text-white">
              📅
            </div>

            <select
              className="w-full appearance-none rounded-xl border border-white/60 bg-white/90 py-3 pl-[58px] pr-8 text-[14px] font-semibold text-[#171717] outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              value={stagioneSelezionata}
              onChange={(e) => setStagioneSelezionata(e.target.value)}
            >
              {stagioni.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-lg font-bold text-black">
              ⌄
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-xl shadow-[0_5px_14px_rgba(0,0,0,0.35)]">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-12 items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-[20px] text-white">
              🏆
            </div>

            <select
              className="w-full appearance-none rounded-xl border border-white/60 bg-white/90 py-3 pl-[58px] pr-8 text-[14px] font-semibold text-[#171717] outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              value={ruoloSelezionato}
              onChange={(e) => setRuoloSelezionato(e.target.value)}
            >
              <option value="">Tutti i ruoli</option>
              <option value="Portiere">Portiere</option>
              <option value="Difensore">Difensore</option>
              <option value="Centrocampista">Centrocampista</option>
              <option value="Attaccante">Attaccante</option>
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-lg font-bold text-black">
              ⌄
            </div>
          </div>

        </div>

        {/* 2. Legenda */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4 px-3 text-[14px] font-medium text-white drop-shadow-md">
          <div><strong>G</strong> = Fatti/Subiti</div>
          <div><strong>P</strong> = Presenze</div>
          <div><strong>A</strong> = Assist</div>
          <div><strong>M</strong> = Media Goal fatti/subiti</div>
        </div>


        {loading ? (
          <div className="rounded-xl border border-white/30 bg-white/85 px-4 py-8 text-center font-semibold text-red-600 shadow-md">
            Caricamento...
          </div>
        ) : (

         /* 3. Tabella giocatori */
         <div className="overflow-x-auto rounded-2xl border border-white/50 bg-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.38)]">
  <table className="w-full border-collapse text-sm">

    <thead className="bg-gradient-to-r from-red-600 via-red-600 to-red-700 text-white">
      <tr className="text-center">
        <th
          className="px-3 py-3 text-left cursor-pointer whitespace-nowrap"
          onClick={() => sortData('giocatore')}
        >
          <span className="text-[15px] font-extrabold">
            Giocatore{" "}
          </span>

          {sortField === "giocatore" ? (
            sortOrder === "asc" ? <ArrowUp size={14} className="inline ml-0.5" /> : <ArrowDown size={14} className="inline ml-0.5" />
          ) : (
            <ArrowUpDown size={14} className="inline ml-0.5 opacity-70" />
          )}
        </th>

        {[
          ["gol", "G"],
["assist", "A"],
["media", "M"],
["gialli", "🟨"],
["rossi", "🟥"],
["presenze", "P"],
// ...(role === 'admin' || role === 'creator'
//   ? [["media_voti_mister", "M.V.A"]]
//   : []),

        ].map(([field, label]) => (
          <th
            key={field}
            className="px-1 py-3 cursor-pointer whitespace-nowrap font-extrabold"
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
  {sortedRows.map((st, index) => (
    <tr
      key={st.giocatore_uid}
      className={`border-b border-red-200 cursor-pointer transition-colors hover:bg-red-50 ${
        index % 2 === 0 ? "bg-white/80" : "bg-white/65"
      }`}
      onClick={() => navigate(`/giocatore/${st.giocatore_uid}`)}
    >
      {/* Giocatore */}
      <td className="py-2 pl-3 pr-2 flex items-center gap-3 text-left whitespace-nowrap">
        {st.foto_url ? (
          <img
            src={st.foto_url}
            alt="foto"
            className="w-12 h-12 rounded-full object-cover border-2 border-red-500 shadow-[0_3px_8px_rgba(0,0,0,0.25)]"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#333333] border-2 border-red-500 flex items-center justify-center text-sm text-white shadow-[0_3px_8px_rgba(0,0,0,0.25)]">
            ?
          </div>
        )}

        <div className="flex flex-col leading-tight">
          <span className="font-extrabold text-[14px] text-[#181818]">
            {st.giocatore_cognome}
          </span>
          <span className="mt-[2px] text-[12px] font-medium text-gray-600">
            {st.giocatore_nome}
          </span>
        </div>
      </td>

      {/* G */}
<td className="py-2 px-[4px] text-center font-medium text-[#202020]">
  {st.ruolo?.toLowerCase() === "portiere" ? st.subiti : st.gol}
</td>

{/* A - Assist */}
<td className="py-2 px-[4px] text-center font-medium text-[#202020]">
  {st.assist}
</td>

{/* M */}
<td className="py-2 px-[4px] text-center font-medium text-[#202020]">{st.media.toFixed(2)}</td>

{/* 🟨 Gialli */}
<td className="py-2 px-[4px] text-center font-medium text-[#202020]">
  {st.gialli}
</td>

{/* 🟥 Rossi */}
<td className="py-2 px-[4px] text-center font-medium text-[#202020]">
  {st.rossi}
</td>

{/* P */}
<td className="py-2 px-[4px] text-center font-medium text-[#202020]">{st.presenze}</td>


      {/* {(role === 'admin' || role === 'creator') && (
  <td className="py-1 px-[4px] text-center">
    {st.media_voti_mister.toFixed(2)}
  </td>
)} */}

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