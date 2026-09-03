// Data creazione chat: 2025-07-30
// src/pages/Calendario.tsx
// Basato sul file originale con aggiunta di campionato_torneo, nome_torneo e modifica header cellule 

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


interface Partita {
  id: string;
  data_ora: string;
  campionato_torneo: string;
  nome_torneo?: string | null;
  casa: { nome: string; logo_url: string | null };
  ospite: { nome: string; logo_url: string | null };
}

export default function Calendario(): JSX.Element {
  const [partite, setPartite] = useState<Partita[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();

  
 

  useEffect(() => {
    async function fetchPartite() {
      const { data, error } = await supabase
        .from('partite')
        .select(`
          id,
          data_ora,
          campionato_torneo,
          nome_torneo,
          casa:squadra_casa_id(nome, logo_url),
          ospite:squadra_ospite_id(nome, logo_url)
        `)
        .eq('stato', 'DaGiocare')
        .order('data_ora', { ascending: true });

      if (error) console.error('Errore fetch partite:', error);
      else setPartite(
  (data ?? []).map((p) => ({
    ...p,
    casa: Array.isArray(p.casa) ? p.casa[0] : p.casa,
    ospite: Array.isArray(p.ospite) ? p.ospite[0] : p.ospite,
  }))
);
      setLoading(false);
    }
    fetchPartite();
  }, []);

  const handleClick = (id: string) => navigate(`/pre-partita/${id}`);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b]">
        <div className="px-3 py-8 font-semibold text-red-500">
          Caricamento…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] pt-2 pb-4">
      <div className="w-full px-2">

        {/* 1. Contenuto Partite */}
        {loading ? (
          <div className="min-h-screen">
            <div className="px-2 py-8 font-semibold text-red-500">
              Caricamento...
            </div>
          </div>
        ) : partite.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/80 bg-gradient-to-r from-white via-[#f8f8f8] to-[#ededed] p-8 text-center shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
            <div className="font-semibold text-gray-700">
              Nessuna partita da giocare trovata.
            </div>
          </div>
        ) : (
          <ul className="w-full space-y-4">

            {partite.map((partita) => (
  <li
    key={partita.id}
    onClick={() => handleClick(partita.id)}
    className="cursor-pointer transition duration-200 hover:-translate-y-[1px]"
  >
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.40)]">

      {/* 2. Header cella: tipo competizione + data */}
      <div className="flex min-h-[58px] items-center justify-between bg-gradient-to-r from-red-600 via-red-700 to-[#454545] px-4 text-white">

        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xl">▣</span>

          <div className="flex min-w-0 flex-col">
            <span className="text-[16px] font-semibold">
              {partita.campionato_torneo}
            </span>

            {partita.nome_torneo && partita.nome_torneo.trim() !== '' && (
              <span className="truncate text-[11px] font-medium italic text-white/80">
                {partita.nome_torneo}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xl">◷</span>

          <span className="text-[15px] font-semibold">
            {new Date(partita.data_ora).toLocaleDateString('it-IT', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
            ,{' '}
            {new Date(partita.data_ora).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* 3. Corpo cella con squadre */}
      <div className="relative min-h-[170px] bg-gradient-to-br from-white via-[#fafafa] to-[#eeeeee] px-5 py-5">

        {/* Squadra casa */}
        <div className="absolute left-6 top-4 flex items-center gap-4">
          {partita.casa.logo_url ? (
            <img
              src={partita.casa.logo_url}
              alt={`${partita.casa.nome} logo`}
              className="h-[58px] w-[58px] object-contain"
            />
          ) : (
            <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-red-600 bg-[#2b2b2b] text-xl font-bold text-white">
              {partita.casa.nome.charAt(0)}
            </div>
          )}

          <div>
            <span className="text-[15px] font-extrabold uppercase leading-tight text-[#191919]">
              {partita.casa.nome}
            </span>
            <div className="mt-2 h-[2px] w-12 bg-red-600" />
          </div>
        </div>

        {/* VS centrale */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center">
          <div className="h-8 w-px bg-gray-300" />
          <span className="mx-3 text-[13px] font-extrabold text-gray-300">
            VS
          </span>
          <div className="h-8 w-px bg-gray-300" />
        </div>

        {/* Squadra ospite */}
        <div className="absolute bottom-4 right-6 flex items-center gap-4">
          <div className="text-right">
            <span className="text-[15px] font-extrabold uppercase leading-tight text-red-600">
              {partita.ospite.nome}
            </span>
            <div className="ml-auto mt-2 h-[2px] w-12 bg-red-600" />
          </div>

          {partita.ospite.logo_url ? (
            <img
              src={partita.ospite.logo_url}
              alt={`${partita.ospite.nome} logo`}
              className="h-[58px] w-[58px] object-contain"
            />
          ) : (
            <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-red-600 bg-[#2b2b2b] text-xl font-bold text-white">
              {partita.ospite.nome.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </div>
  </li>
))}
          </ul>
        )}
      </div>
    </div>
  );
}