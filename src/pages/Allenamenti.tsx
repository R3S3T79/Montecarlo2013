// src/pages/Allenamenti.tsx
// Data creazione chat: 2026-02-03
// Fix definitivo: conteggio allenamenti via RPC con paginazione
// 1 riga in tabella allenamenti = 1 allenamento per giocatore
// Supera il limite Supabase/PostgREST di 1000 righe

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

interface AllenamentoRPC {
  giocatore_uid: string;
  presente: boolean | null;
}

export default function Allenamenti(): JSX.Element {
  const [rows, setRows] = useState<GiocatorePresenza[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const oggi = new Date().toISOString().slice(0, 10);

      /* =========================
         1️⃣ Stagione attiva
      ========================= */
      const { data: stagione, error: stagioneErr } = await supabase
        .from('stagioni')
        .select('id')
        .lte('data_inizio', oggi)
        .gte('data_fine', oggi)
        .single();

      if (stagioneErr || !stagione) {
        console.error('Stagione non trovata', stagioneErr);
        setRows([]);
        setLoading(false);
        return;
      }

      /* =========================
         2️⃣ Giocatori stagione
      ========================= */
      const { data: gs, error: gsErr } = await supabase
        .from('giocatori_stagioni_view')
        .select('id, giocatore_uid, nome, cognome')
        .eq('stagione_id', stagione.id);

      if (gsErr || !gs || gs.length === 0) {
        console.error('Giocatori stagione non trovati', gsErr);
        setRows([]);
        setLoading(false);
        return;
      }

      // Ordinamento cognome / nome
      const gsSorted = [...gs].sort((a: any, b: any) => {
        const ac = (a.cognome ?? '').localeCompare(b.cognome ?? '');
        if (ac !== 0) return ac;
        return (a.nome ?? '').localeCompare(b.nome ?? '');
      });

      /* =========================
         3️⃣ RPC con paginazione
      ========================= */
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
          console.error('Errore RPC allenamenti', error);
          break;
        }

        if (!data || data.length === 0) break;

        allenamenti = allenamenti.concat(data);

        if (data.length < limit) break;
        offset += limit;
      }

      console.log(
        'RPC allenamenti frontend TOTALI:',
        allenamenti.length
      );

      /* =========================
         4️⃣ Conteggio per giocatore
         (IDENTICO a AllenamentiGiocatore)
      ========================= */
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

      /* =========================
         5️⃣ Risultato finale
      ========================= */
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
                  <th className="px-4 py-3 text-left text-white uppercase sticky top-0 z-10">
                    Giocatore
                  </th>
                  <th className="px-4 py-3 text-center text-white uppercase sticky top-0 z-10">
                    All.
                  </th>
                  <th className="px-4 py-3 text-center text-white uppercase sticky top-0 z-10">
                    Pres.
                  </th>
                  <th className="px-4 py-3 text-center text-white uppercase sticky top-0 z-10">
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
