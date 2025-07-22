// src/pages/ListaSquadre.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { PlusCircle } from 'lucide-react';
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
  const { id } = useParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();

  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  const canAdd = role === UserRole.Admin || role === UserRole.Creator;

  useEffect(() => {
    if (id) {
      console.warn(`Param 'id' ricevuto in ListaSquadre: "${id}". Skip fetch.`);
      setLoading(false);
      return;
    }
    const fetchSquadre = async () => {
      const { data, error } = await supabase
        .from<Squadra>('squadre')
        .select('*')
        .order('nome');
      if (error) {
        console.error('Errore durante il fetch di "squadre":', error);
      } else if (data) {
        setSquadre(data);
      }
      setLoading(false);
    };
    fetchSquadre();
  }, [id]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-montecarlo-light flex items-center justify-center">
        <div className="text-montecarlo-secondary text-lg">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="relative mt-6 mb-6">
          <div className="bg-white rounded-xl shadow-montecarlo p-2">
            <div className="flex items-center justify-center">
              <h2 className="text-lg font-bold text-montecarlo-secondary">Lista Squadre</h2>
            </div>
            {canAdd && (
              <button
                onClick={() => navigate('/squadre/nuova')}
                title="Nuova Squadra"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 w-9 h-9 bg-gradient-montecarlo text-white rounded-full flex items-center justify-center hover:shadow-montecarlo-lg transition-all"
              >
                <PlusCircle size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Lista squadre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {squadre.map((squadra) => (
            <div
              key={squadra.id}
              onClick={() => navigate(`/squadre/${squadra.id}`)}
              className="bg-white rounded-xl shadow-montecarlo p-4 cursor-pointer hover:shadow-montecarlo-lg transition-all duration-200 transform hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 flex-shrink-0">
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
                  <h3 className="text-md font-semibold text-montecarlo-secondary">{squadra.nome}</h3>
                  {squadra.nome_stadio && (
                    <p className="text-sm text-montecarlo-neutral">{squadra.nome_stadio}</p>
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
