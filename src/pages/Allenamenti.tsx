// src/pages/Allenamenti.tsx
// Data creazione chat: 03/02/2026
// Versione definitiva con RPC + paginazione (supera limite 1000 Supabase)

import { useEffect, useState } from 'react';
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

interface AllenamentoRPC {
  giocatore_uid: string;
  presente: boolean | null;
}

// ======================
// 1. COMPONENTE
// ======================

export default function Allenamenti(): JSX.Element {
  const [rows, setRows] = useState<GiocatorePresenza[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // ======================
  // 2. CARICAMENTO DATI
  // ======================

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const oggi = new Date().toISOString().slice(0, 10);

      /* ======================
         3. Stagione attiva
      ====================== */
      const { data: stagione, error: stagErr } = await supabase
        .from('stagioni')
        .select('id')
        .lte('data_inizio', oggi)
        .gte('data_fine', oggi)
        .single();

      if (stagErr || !stagione) {
        console.error('Stagione non trovata', stagErr);
        setLoading(false);
        return;
      }

      /* ======================
         4. Giocatori stagione
      ====================== */
      const { data: gs, error: gsErr } = await supabase
        .from('giocatori_stagioni_view')
        .select('id, giocatore_uid, nome, cognome')
        .eq('stagione_id', stagione.id);

      if (gsErr || !gs) {
        console.error('Errore caricamento giocatori', gsErr);
        setLoading(false);
        return;
      }

      const gsSorted = [...gs].sort((a: any, b: any) => {
        const ac = (a.cognome ?? '').localeCompare(b.cognome ?? '');
        if (ac !== 0) return ac;
        return (a.nome ?? '').localeCompare(b.nome ?? '');
      });

      /* ======================
         5. RPC con paginazione
      ====================== */
      let allenamenti: AllenamentoRPC[] = [];
      let offset = 0;
      const limit = 1000;

      while (true) {
        const { data, error } = await supabase.rpc(
          'get_allenamenti_stagione',
          {
            _stagione: stagione.id,
            _offset: offset,
            _limit: limit,
          }
        );

        if (error) {
          console.error('Errore RPC', error);
          break;
        }

        if (!data || data.length === 0) break;

        allenamenti = allenamenti.concat(data);

        if (data.length < limit) break;
        offset += limit;
      }

      console.log('ALLENAMENTI TOTALI:', allenamenti.length);

      /* ======================
         6. Conteggio per giocatore
      ====================== */
      const counts: Record<
        string,
        { totale: number; presenze: number; assenze: number }
      > = {};

      gsSorted.forEach((g: any) => {
        counts[g.giocatore_uid] = { totale: 0, presenze: 0, assenze: 0 };
      });

      allenamenti.forEach((a) => {
        const c = counts[a.giocatore_uid];
        if (!c) return;
        c.totale += 1;
        if (a.presente) c.presenze += 1;
        else c.assenze += 1;
      });

      /* ======================
         7. Risultato finale
      ====================== */
      const result: GiocatorePresenza[] = gsSorted.map((r: any) => ({
        record_id: r.id,
        giocatore_uid: r.giocatore_uid,
        nome: r.nome ?? null,
        cognome: r.cognome ?? null,
        totaleAll: counts[r.giocatore_uid]?.totale ?? 0,
        presenze: counts[r.giocatore_uid]?.presenze ?? 0,
        assenze: counts[r.giocatore_uid]?.assenze ?? 0,
      }));

      setRows(result);
      setLoading(false);
    }

    fetchData();
  }, []);

  // ======================
  // 8. CARICAMENTO
  // ======================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-[#252525]/90 px-6 py-4 text-lg font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          Caricamento…
        </div>
      </div>
    );
  }

  // ======================
  // 9. RENDER
  // ======================

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] px-2 pb-3 pt-2">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#252525]/95 shadow-[0_10px_30px_rgba(0,0,0,0.40)]">

        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-4">
          <div className="text-lg font-bold text-white">
            Allenamenti
          </div>
          <div className="mt-1 text-xs text-white/80">
            Presenze e assenze dei giocatori
          </div>
        </div>

        <div className="max-h-[calc(100vh-150px)] overflow-x-auto overflow-y-auto">
          <table
            className="table-auto w-full border-separate"
            style={{ borderSpacing: 0 }}
          >
            <thead>
              <tr>
                <th className="sticky top-0 z-10 border-b border-white/10 bg-[#1f1f1f] px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Giocatore
                </th>
                <th className="sticky top-0 z-10 border-b border-white/10 bg-[#1f1f1f] px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-white">
                  All.
                </th>
                <th className="sticky top-0 z-10 border-b border-white/10 bg-[#1f1f1f] px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-white">
                  Pres.
                </th>
                <th className="sticky top-0 z-10 border-b border-white/10 bg-[#1f1f1f] px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-white">
                  Ass.
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => {
                const rowBg =
                  idx % 2 === 0 ? 'bg-[#292929]' : 'bg-[#242424]';

                return (
                  <tr
                    key={r.record_id}
                    onClick={() => navigate(`/allenamenti/${r.giocatore_uid}`)}
                    className={`${rowBg} cursor-pointer transition hover:bg-[#383838]`}
                  >
                    <td className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
                      {r.cognome} {r.nome}
                    </td>

                    <td className="border-b border-white/10 px-3 py-3 text-center text-sm font-bold text-gray-200">
                      {r.totaleAll}
                    </td>

                    <td className="border-b border-white/10 px-3 py-3 text-center">
                      <span className="inline-flex min-w-[32px] justify-center rounded-lg bg-green-600/20 px-2 py-1 text-sm font-bold text-green-400">
                        {r.presenze}
                      </span>
                    </td>

                    <td className="border-b border-white/10 px-3 py-3 text-center">
                      <span className="inline-flex min-w-[32px] justify-center rounded-lg bg-red-600/20 px-2 py-1 text-sm font-bold text-red-400">
                        {r.assenze}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}