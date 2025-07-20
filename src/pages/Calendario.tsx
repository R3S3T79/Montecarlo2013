// src/pages/Calendario.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';

interface Partita {
  id: string;
  data_ora: string;
  casa: { nome: string; logo_url: string | null };
  ospite: { nome: string; logo_url: string | null };
}

export default function Calendario(): JSX.Element {
  const [partite, setPartite] = useState<Partita[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  const canAdd = role === UserRole.Admin || role === UserRole.Creator;

  useEffect(() => {
    async function fetchPartite() {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('partite')
        .select(`
          id,
          data_ora,
          casa:squadra_casa_id(nome, logo_url),
          ospite:squadra_ospite_id(nome, logo_url)
        `)
        .eq('stato', 'DaGiocare')
        .gt('data_ora', now)
        .order('data_ora', { ascending: true });

      if (error) console.error('Errore fetch partite:', error);
      else setPartite(data ?? []);
      setLoading(false);
    }
    fetchPartite();
  }, []);

  const handleClick = (id: string) => navigate(`/pre-partita/${id}`);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-6">
        {/* Header ridotto */}
        <div className="relative mt-4 mb-4">
          <div className="bg-white rounded-xl shadow-montecarlo p-2">
            <div className="flex items-center justify-center">
              <h2 className="text-lg font-bold text-montecarlo-secondary">
                Calendario Partite
              </h2>
            </div>
            {canAdd && (
              <button
                onClick={() => navigate('/nuova-partita')}
                className="absolute right-2 top-2 w-8 h-8 bg-gradient-montecarlo text-white rounded-full flex items-center justify-center hover:shadow-montecarlo-lg transition-all duration-300 transform hover:scale-105"
                aria-label="Nuova Partita"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
            <div className="text-montecarlo-secondary">Caricamento...</div>
          </div>
        ) : partite.length === 0 ? (
          <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
            <div className="text-montecarlo-neutral">
              Nessuna partita da giocare trovata.
            </div>
          </div>
        ) : (
          <ul className="space-y-4 max-w-md mx-auto">
            {partite.map((partita) => (
              <li
                key={partita.id}
                onClick={() => handleClick(partita.id)}
                className="cursor-pointer transform transition-all duration-300 hover:scale-[1.02]"
              >
                {/* Data */}
                <div className="bg-gradient-montecarlo text-white px-4 py-2 rounded-t-lg">
                  <div className="text-sm font-medium text-center">
                    {new Date(partita.data_ora).toLocaleString(undefined, {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* Contenuto partita su due righe */}
                <div className="bg-white rounded-b-lg shadow-montecarlo hover:shadow-montecarlo-lg border-l-4 border-montecarlo-secondary p-4 space-y-2">
                  {/* Squadra di casa */}
                  <div className="flex items-center justify-start space-x-3">
                    {partita.casa.logo_url ? (
                      <img
                        src={partita.casa.logo_url}
                        alt={`${partita.casa.nome} logo`}
                        className="w-10 h-10 object-contain rounded-full border-2 border-montecarlo-accent"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-montecarlo-secondary rounded-full flex items-center justify-center text-white font-bold">
                        {partita.casa.nome.charAt(0)}
                      </div>
                    )}
                    <span className="font-semibold text-montecarlo-secondary">
                      {partita.casa.nome}
                    </span>
                  </div>

                  {/* Squadra ospite */}
                  <div className="flex items-center justify-end space-x-3">
                    <span className="font-semibold text-montecarlo-secondary">
                      {partita.ospite.nome}
                    </span>
                    {partita.ospite.logo_url ? (
                      <img
                        src={partita.ospite.logo_url}
                        alt={`${partita.ospite.nome} logo`}
                        className="w-10 h-10 object-contain rounded-full border-2 border-montecarlo-accent"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-montecarlo-secondary rounded-full flex items-center justify-center text-white font-bold">
                        {partita.ospite.nome.charAt(0)}
                      </div>
                    )}
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
