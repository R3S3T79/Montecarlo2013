// src/pages/Allenamenti.tsx
// Data creazione chat: 2025-08-03
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

interface GiocatorePresenza {
  record_id: string;
  giocatore_uid: string;
  nome: string | null;
  cognome: string | null;
  totaleAll: number;
  presenze: number;
  assenze: number;
}

export default function Allenamenti(): JSX.Element {
  const [rows, setRows] = useState<GiocatorePresenza[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const oggi = new Date().toISOString().split('T')[0];
      const { data: stagione } = await supabase
        .from('stagioni')
        .select('id')
        .lte('data_inizio', oggi)
        .gte('data_fine', oggi)
        .single();
      if (!stagione) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Query dalla view con nome/cognome già inclusi
      const { data: gs } = await supabase
        .from('v_giocatori_stagioni')
        .select('id, giocatore_id, nome, cognome')
        .eq('stagione_id', stagione.id);

      if (!gs || gs.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Ordinamento lato client: cognome, poi nome
      const gsSorted = [...gs].sort((a: any, b: any) => {
        const ac = (a.cognome ?? '').localeCompare(b.cognome ?? '');
        if (ac !== 0) return ac;
        return (a.nome ?? '').localeCompare(b.nome ?? '');
      });

      const giocatoreUids = gsSorted.map((r: any) => r.giocatore_id);

      // Evita 400: non chiamare .in(...) con lista vuota
      let allen: { giocatore_uid: string; presente: boolean | null }[] = [];
      if (giocatoreUids.length > 0) {
        const { data: allenData } = await supabase
          .from('allenamenti')
          .select('giocatore_uid, presente')
          .in('giocatore_uid', giocatoreUids)
          .eq('stagione_id', stagione.id);
        allen = allenData ?? [];
      }

      const counts: Record<string, { totale: number; presenze: number }> = {};
      giocatoreUids.forEach(id => (counts[id] = { totale: 0, presenze: 0 }));
      allen.forEach(a => {
        const c = counts[a.giocatore_uid];
        if (!c) return;
        c.totale += 1;
        if (a.presente) c.presenze += 1;
      });

      const result: GiocatorePresenza[] = gsSorted.map((r: any) => ({
        record_id: r.id,
        giocatore_uid: r.giocatore_id,
        nome: r.nome ?? null,
        cognome: r.cognome ?? null,
        totaleAll: counts[r.giocatore_id]?.totale ?? 0,
        presenze: counts[r.giocatore_id]?.presenze ?? 0,
        assenze: (counts[r.giocatore_id]?.totale ?? 0) - (counts[r.giocatore_id]?.presenze ?? 0),
      }));

      setRows(result);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B7280] to-[#bfb9b9]">
        <div className="text-white text-lg">Caricamento…</div>
      </div>
    );
  }

  const colBg = ['bg-red-50', 'bg-white', 'bg-red-50', 'bg-white'];

  return (
    <div className="min-h-screen px-4 pb-6">
      {rows.length === 0 ? (
        <div className="text-center text-gray-500 italic">
          Nessun giocatore trovato per la stagione attuale.
        </div>
      ) : (
        <div className="w-full">
          <div className="bg-white rounded-xl shadow-montecarlo p-6 overflow-x-auto">
            <table className="table-auto w-full border-separate" style={{ borderSpacing: 0 }}>
              <thead className="bg-gradient-to-br from-[#d61f1f] to-[#f45e5e]">
                <tr>
                  <th className={`px-4 py-3 text-left text-red-600 uppercase ${colBg[0]}`}>Giocatore</th>
                  <th className={`px-4 py-3 text-center text-red-600 uppercase ${colBg[1]}`}>All.</th>
                  <th className={`px-4 py-3 text-center text-red-600 uppercase ${colBg[2]}`}>Pres.</th>
                  <th className={`px-4 py-3 text-center text-red-600 uppercase ${colBg[3]}`}>Ass.</th>
                </tr>
              </thead>
              <tbody>
  {rows.map((r, idx) => (
    <tr
      key={r.record_id}
      onClick={() => navigate(`/allenamenti/${r.giocatore_uid}`)}
      className="cursor-pointer hover:bg-red-50 transition-colors duration-200"
    >
      <td className="px-4 py-2 text-gray-800 bg-red-50 border-b border-gray-300">
        {r.cognome} {r.nome}
      </td>
      <td className="px-4 py-2 text-center text-gray-800 bg-white border-b border-gray-300">
        {r.totaleAll}
      </td>
      <td className="px-4 py-2 text-center text-gray-800 bg-red-50 border-b border-gray-300">
        {r.presenze}
      </td>
      <td className="px-4 py-2 text-center text-gray-800 bg-white border-b border-gray-300">
        {r.assenze}
      </td>
    </tr>
  ))}
</tbody>

            </table>
          </div>
        </div>
      )}
    </div>
  );
}
