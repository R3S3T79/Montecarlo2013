// Data creazione chat: 2025-07-30
// src/pages/ListaSquadre.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';

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
  const { user, loading: authLoading } = useAuth();

  // Ruolo non più necessario per il + interno
  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;

  useEffect(() => {
    const fetchSquadre = async () => {
      const { data, error } = await supabase
        .from<Squadra>('squadre')
        .select('*')
        .order('nome');
      if (error) console.error(error);
      else if (data) setSquadre(data);
      setLoading(false);
    };
    fetchSquadre();
  }, []);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen">
        <div className="text-montecarlo-secondary text-lg">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        {/* ➡️ Rimosso l'header interno "Lista Squadre" e il + */}

        {/* Griglia di squadre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {squadre.map(squadra => (
            <div
              key={squadra.id}
              onClick={() => navigate(`/squadre/${squadra.id}`)}
              className="bg-white rounded-xl shadow-montecarlo p-4 cursor-pointer hover:shadow-montecarlo-lg transition-all duration-200 transform hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 flex-shrink-0">
                  {squadra.logo_url ? (
                    <img
                      src={squadra.logo_url}
                      alt={`Logo ${squadra.nome}`}
                      className="w-full h-full object-contain rounded-full border-2 border-montecarlo-accent"
                    />
                  ) : (
                    <div className="w-full h-full bg-montecarlo-secondary text-white rounded-full flex items-center justify-center text-xl font-bold">
                      {squadra.nome.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-md font-semibold text-montecarlo-secondary">
                    {squadra.nome}
                  </h3>
                  {squadra.nome_stadio && (
                    <p className="text-sm text-gray-800">
  {squadra.nome_stadio}
</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {squadre.length === 0 && (
          <div className="mt-10 text-center text-montecarlo-neutral text-sm">
            Nessuna squadra trovata.
          </div>
        )}
      </div>
    </div>
  );
}
