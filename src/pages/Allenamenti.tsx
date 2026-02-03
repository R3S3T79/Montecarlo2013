// src/pages/Allenamenti.tsx
// Data creazione chat: 2026-02-03
// Fix: conteggio corretto allenamenti (totale stagione basato su date distinte)

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

      // Recupera stagione attiva
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

      // Recupera giocatori stagione (view)
      const { data: gs } = await supabase
        .from('giocatori_stagioni_view')
        .select('id, giocatore_uid, nome, cognome')
        .eq('stagione_id', stagione.id);

      if (!gs || gs.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Ordinamento lato client
      const gsSorted = [...gs].sort((a: any, b: any) => {
        const ac = (a.cognome ?? '').localeCompare(b.cognome ?? '');
        if (ac !== 0) return ac;
        return (a.nome ?? '').localeCompare(b.nome ?? '');
      });

      const giocatoreUids = gsSorted.map((r: any) => r.giocatore_uid);

      // Recupera TUTTE le date allenamento della stagione (per totale reale)
      const { data: allDates } = await supabase
        .from('allenamenti')
        .select('data_allenamento')
        .eq('stagione_id', stagione.id);

      const totaleAllenamenti = new Set(
        (allDates ?? []).map(a => a.data_allenamento)
      ).size;

      // Recupera presenze per giocatore
      let allen: { giocatore_uid: string; presente: boolean | null }[] = [];
      if (giocatoreUids.length > 0) {
        const { data: allenData } = await supabase
          .from('allenamenti')
          .select('giocatore_uid, presente')
          .in('giocatore_uid', giocatoreUids)
          .eq('stagione_id', stagione.id);

        allen = allenData ?? [];
      }

      // Conta presenze
      const counts: Record<string, { presenze: number }> = {};
      giocatoreUids.forEach(id => (counts[id] = { presenze: 0 }));

      allen.forEach(a => {
        if (a.presente && counts[a.giocatore_uid]) {
          counts[a.giocatore_uid].presenze += 1;
        }
      });

      // Risultato finale
      const result: GiocatorePresenza[] = gsSorted.map((r: any) => {
        const pres = counts[r.giocatore_uid]?.presenze ?? 0;
        return {
          record_id: r.id,
          giocatore_uid: r.giocatore_uid,
          nome: r.nome ?? null,
          cognome: r.cognome ?? null,
          totaleAll: totaleAllenamenti,
          presenze: pres,
          assenze: totaleAllenamenti - pres,
        };
      });

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

  return (
    <div className="min-h-screen px-2 pb-2">
      {rows.length === 0 ? (
        <div className="text-center text-white italic">
          Nessun giocatore trovato per la stagione attuale, Aggiungi nuovo Allenamento.
        </div>
      ) : (
        <div className="w-full">
          <div className="overflow-x-auto overflow-y-auto h-[calc(100vh-50px)]">
            <table
              className="table-auto w-full border-separate"
              style={{ borderSpacing: 0 }}
            >
              <thead className="bg-gradient-to-br from-[#d61f1f]/90 to-[#f45e5e]/90">
                <tr>
                  <th className="px-4 py-3 text-left text-white uppercase sticky top-0 z-10 bg-gradient-to-br from-[#d61f1f]/90 to-[#f45e5e]/90">
                    Giocatore
                  </th>
                  <th className="px-4 py-3 text-center text-white uppercase sticky top-0 z-10 bg-gradient-to-br from-[#d61f1f]/90 to-[#f45e5e]/90">
                    All.
                  </th>
                  <th className="px-4 py-3 text-center text-white uppercase sticky top-0 z-10 bg-gradient-to-br from-[#d61f1f]/90 to-[#f45e5e]/90">
                    Pres.
                  </th>
                  <th className="px-4 py-3 text-center text-white uppercase sticky top-0 z-10 bg-gradient-to-br from-[#d61f1f]/90 to-[#f45e5e]/90">
                    Ass.
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, idx) => {
                  const rowBg = idx % 2 === 0 ? 'bg-white/90' : 'bg-white/85';
                  const rowHover = 'hover:bg-white/80';
                  const cell = `px-4 py-2 text-gray-900 border-b border-white/30 ${rowBg} ${rowHover}`;

                  return (
                    <tr
                      key={r.record_id}
                      onClick={() => navigate(`/allenamenti/${r.giocatore_uid}`)}
                      className="cursor-pointer transition-colors duration-200"
                    >
                      <td className={cell}>
                        {r.cognome} {r.nome}
                      </td>
                      <td className={`${cell} text-center`}>{r.totaleAll}</td>
                      <td className={`${cell} text-center`}>{r.presenze}</td>
                      <td className={`${cell} text-center`}>{r.assenze}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
