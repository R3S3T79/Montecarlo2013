// Data creazione chat: 2025-07-30
// src/pages/ListaSquadre.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
  indirizzo: string | null;
  nome_stadio: string | null;
  mappa_url: string | null;
}

export default function ListaSquadre() {
  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
 const { loading: authLoading } = useAuth();

  
  useEffect(() => {
    const fetchSquadre = async () => {
     const { data, error } = await supabase
  .from("squadre")
  .select('*')
  .eq('visibile', true)       // 👈 mostra solo squadre visibili
  .order('nome');

      if (error) console.error(error);
      else if (data) setSquadre(data);
      setLoading(false);
    };
    fetchSquadre();
  }, []);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b]">
        <div className="text-red-500 text-lg">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b]">
      <div className="w-full px-[2px] pt-2 pb-6 box-border">

        {/* ➡️ Rimosso l'header interno "Lista Squadre" e il + */}

        {/* Griglia di squadre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {squadre
  .filter(s => s.nome.toLowerCase() !== "da definire")
  .map(squadra => (
            <div
              key={squadra.id}
              onClick={() => navigate(`/squadre/${squadra.id}`)}
              className="relative overflow-hidden rounded-2xl border-l-4 border-red-600 bg-gradient-to-br from-white via-[#fafafa] to-[#eeeeee] shadow-[0_8px_24px_rgba(0,0,0,0.35)] cursor-pointer transition-all duration-200 hover:-translate-y-[1px]"
            >
              <div className="flex min-h-[92px] items-center px-4 py-3">

                {/* 1. Logo squadra */}
                <div className="w-16 h-16 flex-shrink-0">
                  {squadra.logo_url ? (
                    <img
                      src={squadra.logo_url}
                      alt={`Logo ${squadra.nome}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#2b2b2b] text-white rounded-full flex items-center justify-center text-xl font-bold border-2 border-red-600">
                      {squadra.nome.charAt(0)}
                    </div>
                  )}
                </div>

                {/* 2. Separatore verticale */}
                <div className="mx-4 h-12 w-px bg-gray-300" />

                {/* 3. Nome squadra e stadio */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] font-extrabold uppercase leading-tight text-red-600">
                    {squadra.nome}
                  </h3>
                  {squadra.nome_stadio && (
                    <p className="mt-1 text-sm text-gray-600">
  {squadra.nome_stadio}
</p>
                  )}
                </div>

                {/* 4. Freccia */}
                <div className="ml-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2b2b2b] text-lg font-bold text-white shadow-sm">
                  ›
                </div>

              </div>
            </div>
          ))}
        </div>

        {squadre.length === 0 && (
          <div className="mt-10 text-center text-gray-300 text-sm">
            Nessuna squadra trovata.
          </div>
        )}
      </div>
    </div>
  );
}