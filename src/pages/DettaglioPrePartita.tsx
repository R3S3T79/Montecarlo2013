// src/pages/DettaglioPrePartita.tsx
// Data creazione chat: 2025-08-01

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

export default function DettaglioPrePartita(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [partita, setPartita] = useState<Partita | null>(null);
  const [precedenti, setPrecedenti] = useState<Partita[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  const canView = true;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
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

      const { data: prev, error: errPrev } = await supabase
        .from<Partita>('partite')
        .select(`
          id,
          data_ora,
          goal_a,
          goal_b,
          squadra_casa_id(id, nome, logo_url),
          squadra_ospite_id(id, nome, logo_url)
        `)
        .or(
          `and(squadra_casa_id.eq.${d.squadra_casa_id.id},squadra_ospite_id.eq.${d.squadra_ospite_id.id}),and(squadra_casa_id.eq.${d.squadra_ospite_id.id},squadra_ospite_id.eq.${d.squadra_casa_id.id})`
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
    day:   '2-digit',
    month: '2-digit',
    year:  '2-digit',
  });

  return (
    <div className="min-h-screen pt-2 px-2 pb-6">
      <div className="w-full">
        <div className="min-h-screen p-4 sm:p-6 bg-white/90">
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
          <div className="text-center text-gray-800 mb-6">
            <span className="px-3 py-1 bg-montecarlo-accent text-montecarlo-secondary rounded-full text-sm font-medium">
              {formattedDate}
            </span>
          </div>

          {/* Scontri precedenti */}
          {precedenti.length > 0 && (
            <section>
              <h3 className="text-base font-medium text-red-600 mb-3 text-center">
                Scontri precedenti
              </h3>
              <hr className="border-t border-gray-300 mb-3" />
              <ul>
                {precedenti.map((p, idx) => {
                  const d = new Date(p.data_ora).toLocaleDateString('it-IT', {
                    day:   '2-digit',
                    month: '2-digit',
                    year:  '2-digit',
                  });
                  return (
                    <React.Fragment key={p.id}>
                      {idx > 0 && <hr className="border-t border-gray-200 my-4" />}
                      <li
                        onClick={() => navigate(`/partita/${p.id}`)}
                        className="cursor-pointer hover:bg-gray-100 transition-colors rounded p-2"
                      >
                        <div className="text-sm text-gray-800 text-center mb-1">
                          {d}
                        </div>
                        <div className="flex justify-center items-center gap-2 text-base text-gray-800 font-medium">
                          <span>{p.squadra_casa_id.nome}</span>
                          <span>
                            {p.goal_a}-{p.goal_b}
                          </span>
                          <span>{p.squadra_ospite_id.nome}</span>
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
    </div>
  );
}
