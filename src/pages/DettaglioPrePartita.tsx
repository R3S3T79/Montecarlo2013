// src/pages/DettaglioPrePartita.tsx
// Data creazione chat: 2025-08-01 (rev5: aggiunto stato nella view resocontopartita + filtro Giocata)

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';


interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
  nome_stadio: string | null;
  indirizzo: string | null;
}

interface Partita {
  id: string;
  data_ora: string;
  goal_a: number;
  goal_b: number;
  stato: string;
  arbitro_nome: string | null;
  campionato_torneo: string;
  nome_torneo: string | null;
  luogo_torneo: string | null;
  squadra_casa_id: Squadra;
  squadra_ospite_id: Squadra;
}

interface Resoconto {
  partita_id: string;
  data_ora: string;
  stato: string; // 👈 nuovo campo dalla view
  squadra_casa: string | null;
  squadra_ospite: string | null;
  goal_montecarlo_1: number | null;
  goal_avversaria_1: number | null;
  goal_montecarlo_2: number | null;
  goal_avversaria_2: number | null;
  goal_montecarlo_3: number | null;
  goal_avversaria_3: number | null;
  goal_montecarlo_4: number | null;
  goal_avversaria_4: number | null;
  goal_montecarlo_tot: number | null;
  goal_avversaria_tot: number | null;
  esito: string | null;
}

export default function DettaglioPrePartita(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();

  const [partita, setPartita] = useState<Partita | null>(null);
  const [precedenti, setPrecedenti] = useState<Resoconto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);


  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);

      // partita corrente
      const { data: d, error: err } = await supabase
        .from('partite')
        .select(`
          id,
          data_ora,
          goal_a,
          goal_b,
          stato,
          arbitro_nome,
          campionato_torneo,
          nome_torneo,
          luogo_torneo,
          squadra_casa_id(id, nome, logo_url, nome_stadio, indirizzo),
          squadra_ospite_id(id, nome, logo_url, nome_stadio, indirizzo)
        `)
        .eq('id', id)
        .single();

      if (err || !d) {
        alert('Partita non trovata');
        setLoading(false);
        return;
      }
     setPartita({
  ...d,
  squadra_casa_id: Array.isArray(d.squadra_casa_id)
    ? d.squadra_casa_id[0]
    : d.squadra_casa_id,
  squadra_ospite_id: Array.isArray(d.squadra_ospite_id)
    ? d.squadra_ospite_id[0]
    : d.squadra_ospite_id,
});

      // precedenti SOLO con stato = Giocata
const squadraCasa = Array.isArray(d.squadra_casa_id)
  ? d.squadra_casa_id[0]
  : d.squadra_casa_id;

const squadraOspite = Array.isArray(d.squadra_ospite_id)
  ? d.squadra_ospite_id[0]
  : d.squadra_ospite_id;

const { data: prev, error: errPrev } = await supabase
  .from('resocontopartita')
  .select('*')
  .or(
    `and(squadra_casa.eq.${squadraCasa.nome},squadra_ospite.eq.${squadraOspite.nome}),and(squadra_casa.eq.${squadraOspite.nome},squadra_ospite.eq.${squadraCasa.nome})`
  )
  .eq('stato', 'Giocata') // 👈 filtro qui
  .order('data_ora', { ascending: false })
  .limit(5);

if (!errPrev && prev) {
  setPrecedenti(prev);
}
      setLoading(false);
    })();
  }, [id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-[#202020]/90 px-6 py-4 text-white text-lg shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          Caricamento…
        </div>
      </div>
    );
  }
  if (!partita) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-[#202020]/90 px-6 py-4 text-white text-lg shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          Partita non trovata
        </div>
      </div>
    );
  }

  const formattedDate = new Date(partita.data_ora).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

 // ======== CALCOLO STATISTICHE =========

// individua il nome "nostra squadra" (es. Montecarlo o Montecarlo B)
const nomeMontecarlo =
  partita.squadra_casa_id.nome.includes("Montecarlo")
    ? partita.squadra_casa_id.nome
    : partita.squadra_ospite_id.nome;

// inizializza contatori
let vittorie = 0;
let sconfitte = 0;
let pareggi = 0;
let goalFatti = 0;
let goalSubiti = 0;

precedenti.forEach(p => {
  // identifica se Montecarlo era in casa o trasferta
  const isMontecarloCasa = p.squadra_casa === nomeMontecarlo;

  const goalMC = isMontecarloCasa
    ? p.goal_montecarlo_tot ?? 0
    : p.goal_avversaria_tot ?? 0;

  const goalAvv = isMontecarloCasa
    ? p.goal_avversaria_tot ?? 0
    : p.goal_montecarlo_tot ?? 0;

  goalFatti += goalMC;
  goalSubiti += goalAvv;

  if (goalMC > goalAvv) vittorie++;
  else if (goalMC < goalAvv) sconfitte++;
  else pareggi++;
});

const totale = vittorie + sconfitte + pareggi;
const perc = (n: number) => (totale > 0 ? (n / totale) * 100 : 0);


  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] px-[2px] pt-2 pb-6 box-border">
      <div className="w-full">

        {/* Dettaglio partita */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fafafa] to-[#eeeeee] shadow-[0_8px_24px_rgba(0,0,0,0.40)]">

          <div className="border-l-4 border-red-600 bg-gradient-to-r from-red-600 via-red-700 to-[#454545] px-4 py-3">
            <h2 className="text-center text-[17px] font-extrabold uppercase tracking-wide text-white">
              Dettaglio Pre-Partita
            </h2>
          </div>

          {/* Informazioni partita */}
<div className="mt-6 border-t border-gray-200 pt-4">
  <div className="grid grid-cols-3 divide-x divide-gray-200">

    <div className="px-2 text-center">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
        Stadio
      </div>

      <div className="mt-1 text-[12px] font-bold leading-tight text-[#252525]">
        {partita.luogo_torneo ||
          partita.squadra_casa_id.nome_stadio ||
          "Da definire"}
      </div>

      {!partita.luogo_torneo && partita.squadra_casa_id.indirizzo && (
        <div className="mt-1 text-[10px] leading-tight text-gray-400">
          {partita.squadra_casa_id.indirizzo}
        </div>
      )}
    </div>

    <div className="px-2 text-center">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
        Arbitro
      </div>

      <div className="mt-1 text-[12px] font-bold leading-tight text-[#252525]">
        {partita.arbitro_nome || "Da definire"}
      </div>
    </div>

    <div className="px-2 text-center">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
        Competizione
      </div>

      <div className="mt-1 text-[12px] font-bold leading-tight text-[#252525]">
        {partita.nome_torneo || partita.campionato_torneo}
      </div>
    </div>

  </div>
</div>

          <div className="p-4 sm:p-6">

            {/* Data */}
            <div className="mb-6 flex justify-center">
              <div className="flex items-center gap-2 rounded-full bg-[#f1f1f1] px-4 py-2 text-sm font-bold text-[#252525] shadow-sm">
                <span className="text-red-600">📅</span>
                <span>{formattedDate}</span>
              </div>
            </div>

            {/* Dettaglio squadre */}
            <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">

              <div className="flex min-w-0 flex-col items-center">
                <div className="flex h-[92px] w-[92px] items-center justify-center">
                  {partita.squadra_casa_id.logo_url ? (
                    <img
                      src={partita.squadra_casa_id.logo_url}
                      alt={partita.squadra_casa_id.nome}
                      className="h-[86px] w-[86px] object-contain"
                    />
                  ) : (
                    <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full border-2 border-red-600 bg-[#2b2b2b] text-2xl font-bold text-white">
                      {partita.squadra_casa_id.nome.charAt(0)}
                    </div>
                  )}
                </div>

                <span className="mt-3 max-w-full text-center text-[15px] font-extrabold uppercase leading-tight text-[#202020]">
                  {partita.squadra_casa_id.nome}
                </span>

                <div className="mt-2 h-[3px] w-12 rounded-full bg-red-600" />
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="h-6 w-px bg-gray-300" />

                <div className="my-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#202020] to-[#454545] text-[11px] font-extrabold text-white shadow-md">
                  VS
                </div>

                <div className="h-6 w-px bg-gray-300" />
              </div>

              <div className="flex min-w-0 flex-col items-center">
                <div className="flex h-[92px] w-[92px] items-center justify-center">
                  {partita.squadra_ospite_id.logo_url ? (
                    <img
                      src={partita.squadra_ospite_id.logo_url}
                      alt={partita.squadra_ospite_id.nome}
                      className="h-[86px] w-[86px] object-contain"
                    />
                  ) : (
                    <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full border-2 border-[#454545] bg-[#2b2b2b] text-2xl font-bold text-white">
                      {partita.squadra_ospite_id.nome.charAt(0)}
                    </div>
                  )}
                </div>

                <span className="mt-3 max-w-full text-center text-[15px] font-extrabold uppercase leading-tight text-[#202020]">
                  {partita.squadra_ospite_id.nome}
                </span>

                <div className="mt-2 h-[3px] w-12 rounded-full bg-[#454545]" />
              </div>

            </div>
          </div>
        </div>

        {/* Container separato scontri precedenti */}
        {precedenti.length > 0 ? (
          <>
            <section className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fafafa] to-[#eeeeee] shadow-[0_8px_24px_rgba(0,0,0,0.40)]">

              <div className="border-l-4 border-red-600 bg-gradient-to-r from-red-600 via-red-700 to-[#454545] px-4 py-3">
                <h3 className="text-center text-[15px] font-extrabold uppercase tracking-wide text-white">
                  Statistiche precedenti
                </h3>
              </div>

              <div className="p-4">

                <div className="grid grid-cols-3 gap-2">

                  <div className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
                    <div className="text-[11px] font-bold uppercase text-gray-500">
                      Vittorie
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-green-600">
                      {vittorie}
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500">
                      {Math.round(perc(vittorie))}%
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: perc(vittorie) + '%' }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
                    <div className="text-[11px] font-bold uppercase text-gray-500">
                      Pareggi
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-gray-500">
                      {pareggi}
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500">
                      {Math.round(perc(pareggi))}%
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-gray-500"
                        style={{ width: perc(pareggi) + '%' }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
                    <div className="text-[11px] font-bold uppercase text-gray-500">
                      Sconfitte
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-red-600">
                      {sconfitte}
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500">
                      {Math.round(perc(sconfitte))}%
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: perc(sconfitte) + '%' }}
                      />
                    </div>
                  </div>

                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center shadow-sm">
                    <div className="text-[11px] font-bold uppercase text-gray-500">
                      Goal fatti
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-green-600">
                      {goalFatti}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center shadow-sm">
                    <div className="text-[11px] font-bold uppercase text-gray-500">
                      Goal subiti
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-red-600">
                      {goalSubiti}
                    </div>
                  </div>

                </div>

                <div className="mt-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {totale} partite considerate
                </div>

              </div>
            </section>

            {/* Lista scontri */}
            <section className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fafafa] to-[#eeeeee] shadow-[0_8px_24px_rgba(0,0,0,0.40)]">

              <div className="border-l-4 border-red-600 bg-gradient-to-r from-red-600 via-red-700 to-[#454545] px-4 py-3">
                <h3 className="text-center text-[15px] font-extrabold uppercase tracking-wide text-white">
                  Ultimi precedenti
                </h3>
              </div>

              <div className="p-3">
                <ul className="space-y-2">
                  {precedenti.map((p) => {
                    const d = new Date(p.data_ora).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    });

                    return (
                      <li
                        key={p.partita_id}
                        onClick={() => navigate(`/partita/${p.partita_id}`)}
                        className="cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md"
                      >
                        <div className="grid grid-cols-[58px_1fr_auto] items-center gap-2 px-3 py-3">

                          <div className="text-center text-[11px] font-bold text-gray-500">
                            {d}
                          </div>

                          <div className="min-w-0 text-center">
                            <div className="truncate text-[12px] font-bold uppercase leading-tight text-[#252525]">
                              {p.squadra_casa}
                            </div>

                            <div className="my-1 text-[10px] font-bold text-gray-300">
                              VS
                            </div>

                            <div className="truncate text-[12px] font-bold uppercase leading-tight text-[#252525]">
                              {p.squadra_ospite}
                            </div>
                          </div>

                          <div className="flex min-w-[48px] items-center justify-center rounded-lg bg-gradient-to-br from-[#202020] to-[#454545] px-3 py-2 text-[17px] font-extrabold text-white shadow-sm">
                            {(p.goal_montecarlo_tot ?? 0)}-{(p.goal_avversaria_tot ?? 0)}
                          </div>

                        </div>

                        {p.esito && (
                          <div className="border-t border-gray-100 px-3 py-2 text-center">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                                p.esito.toLowerCase().includes("vitt")
                                  ? "bg-green-100 text-green-700"
                                  : p.esito.toLowerCase().includes("sconf")
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {p.esito}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          </>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fafafa] to-[#eeeeee] shadow-[0_8px_24px_rgba(0,0,0,0.40)]">
            <div className="border-l-4 border-red-600 bg-gradient-to-r from-red-600 via-red-700 to-[#454545] px-4 py-3">
              <h3 className="text-center text-[15px] font-extrabold uppercase tracking-wide text-white">
                Ultimi precedenti
              </h3>
            </div>

            <div className="p-5 text-center text-sm font-medium text-gray-500">
              Nessuno scontro precedente registrato.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}