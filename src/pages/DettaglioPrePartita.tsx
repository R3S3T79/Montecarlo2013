// src/pages/DettaglioPrePartita.tsx
// Data creazione chat: 2025-08-01 (rev2: separato container scontri + barra sfumata con ombra)

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface Partita {
  id: string;
  data_ora: string;
  goal_a: number;
  goal_b: number;
  squadra_casa_id: Squadra;
  squadra_ospite_id: Squadra;
}

interface Resoconto {
  partita_id: string;
  data_ora: string;
  squadra_casa: string | null;
  squadra_ospite: string | null;
  goal_montecarlo_1: number | null;
  goal_montecarlo_2: number | null;
  goal_montecarlo_3: number | null;
  goal_montecarlo_4: number | null;
  goal_avversaria_1: number | null;
  goal_avversaria_2: number | null;
  goal_avversaria_3: number | null;
  goal_avversaria_4: number | null;
  esito: string | null;
}

export default function DettaglioPrePartita(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [partita, setPartita] = useState<Partita | null>(null);
  const [precedenti, setPrecedenti] = useState<Resoconto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);

      // partita corrente
      const { data: d, error: err } = await supabase
        .from<Partita>('partite')
        .select(`
          id,
          data_ora,
          goal_a,
          goal_b,
          squadra_casa_id(id, nome, logo_url),
          squadra_ospite_id(id, nome, logo_url)
        `)
        .eq('id', id)
        .single();

      if (err || !d) {
        alert('Partita non trovata');
        setLoading(false);
        return;
      }
      setPartita(d);

      // precedenti dalla view resocontopartita
      const { data: prev, error: errPrev } = await supabase
        .from<Resoconto>('resocontopartita')
        .select('*')
        .or(
          `and(squadra_casa.eq.${d.squadra_casa_id.nome},squadra_ospite.eq.${d.squadra_ospite_id.nome}),and(squadra_casa.eq.${d.squadra_ospite_id.nome},squadra_ospite.eq.${d.squadra_casa_id.nome})`
        )
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B7280] to-[#bfb9b9]">
        <div className="text-white text-lg">Caricamento…</div>
      </div>
    );
  }
  if (!partita) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B7280] to-[#bfb9b9]">
        <div className="text-white text-lg">Partita non trovata</div>
      </div>
    );
  }

  const formattedDate = new Date(partita.data_ora).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  // ======== CALCOLO STATISTICHE =========
  const totale = precedenti.length;
  const vittorie = precedenti.filter(p => p.esito === 'Vittoria').length;
  const sconfitte = precedenti.filter(p => p.esito === 'Sconfitta').length;
  const pareggi = precedenti.filter(p => p.esito === 'Pareggio').length;

  const goalFatti = precedenti.reduce((acc, p) => {
    return (
      acc +
      (p.goal_montecarlo_1 || 0) +
      (p.goal_montecarlo_2 || 0) +
      (p.goal_montecarlo_3 || 0) +
      (p.goal_montecarlo_4 || 0)
    );
  }, 0);

  const goalSubiti = precedenti.reduce((acc, p) => {
    return (
      acc +
      (p.goal_avversaria_1 || 0) +
      (p.goal_avversaria_2 || 0) +
      (p.goal_avversaria_3 || 0) +
      (p.goal_avversaria_4 || 0)
    );
  }, 0);

  const perc = (n: number) => (totale > 0 ? (n / totale) * 100 : 0);

  return (
    <div className="min-h-screen pt-2 px-2 pb-6">
      <div className="w-full">
        <div className="p-4 sm:p-6 bg-white/90 rounded-lg shadow">
          {/* Dettaglio squadre */}
          <div className="flex flex-col items-center space-y-6 mb-6">
            <div className="flex items-center space-x-4">
              {partita.squadra_casa_id.logo_url ? (
                <img
                  src={partita.squadra_casa_id.logo_url}
                  alt={partita.squadra_casa_id.nome}
                  className="w-20 h-20 rounded-full border-2 border-montecarlo-accent"
                />
              ) : (
                <div className="w-20 h-20 bg-montecarlo-neutral rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {partita.squadra_casa_id.nome.charAt(0)}
                </div>
              )}
              <span className="text-xl font-semibold text-gray-800">
                {partita.squadra_casa_id.nome}
              </span>
            </div>

            <div className="text-base font-semibold text-gray-800">vs</div>

            <div className="flex items-center space-x-4">
              <span className="text-xl font-semibold text-gray-800">
                {partita.squadra_ospite_id.nome}
              </span>
              {partita.squadra_ospite_id.logo_url ? (
                <img
                  src={partita.squadra_ospite_id.logo_url}
                  alt={partita.squadra_ospite_id.nome}
                  className="w-20 h-20 rounded-full border-2 border-montecarlo-accent"
                />
              ) : (
                <div className="w-20 h-20 bg-montecarlo-neutral rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {partita.squadra_ospite_id.nome.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Data */}
          <div className="text-center text-gray-800 mb-2">
            <span className="px-3 py-1 bg-montecarlo-accent text-montecarlo-secondary rounded-full text-sm font-medium">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Container separato scontri precedenti */}
        {precedenti.length > 0 && (
          <section className="mt-10 p-5 bg-white/90 rounded-lg shadow-md">
            <h3 className="text-base font-medium text-red-600 mb-4 text-center">
              Scontri precedenti
            </h3>

            {/* Barra statistiche */}
            <div className="mb-6">
              <div className="text-center text-sm font-medium text-gray-700 mb-1">
                {totale} partite
              </div>
              <div className="flex w-full h-6 rounded overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400"
                  style={{ width: perc(vittorie) + '%' }}
                />
                <div
                  className="bg-gradient-to-r from-gray-500 to-gray-300"
                  style={{ width: perc(pareggi) + '%' }}
                />
                <div
                  className="bg-gradient-to-r from-red-500 to-red-400"
                  style={{ width: perc(sconfitte) + '%' }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-700 mt-1">
                <span>Vittorie: {vittorie}</span>
                <span>Pareggi: {pareggi}</span>
                <span>Sconfitte: {sconfitte}</span>
              </div>
            </div>

            {/* Goal fatti/subiti */}
            <div className="text-center text-sm text-gray-700 mb-6">
              Goal fatti: <span className="font-semibold">{goalFatti}</span> | Goal subiti:{' '}
              <span className="font-semibold">{goalSubiti}</span>
            </div>

            <hr className="border-t border-gray-300 mb-4" />

            {/* Lista scontri */}
            <ul>
              {precedenti.map((p, idx) => {
                const d = new Date(p.data_ora).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                });
                return (
                  <React.Fragment key={p.partita_id}>
                    {idx > 0 && <hr className="border-t border-gray-200 my-4" />}
                    <li
                      onClick={() => navigate(`/partita/${p.partita_id}`)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors rounded p-2"
                    >
                      <div className="text-sm text-gray-800 text-center mb-1">
                        {d}
                      </div>
                      <div className="flex justify-center items-center gap-2 text-base text-gray-800 font-medium">
                        <span>{p.squadra_casa}</span>
                        <span>
                          <span>
  {(p.squadra_casa === 'Montecarlo' ? p.goal_montecarlo_tot : p.goal_avversaria_tot) ?? 0}
  -
  {(p.squadra_ospite === 'Montecarlo' ? p.goal_montecarlo_tot : p.goal_avversaria_tot) ?? 0}
</span>


                        </span>
                        <span>{p.squadra_ospite}</span>
                      </div>
                    </li>
                  </React.Fragment>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
