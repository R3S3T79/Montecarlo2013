// Data creazione chat: 2025-07-30
// src/pages/Calendario.tsx
// Basato sul file originale con aggiunta di campionato_torneo e modifica header cellule 

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';

interface Partita {
  id: string;
  data_ora: string;
  campionato_torneo: string;
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
      const { data, error } = await supabase
        .from('partite')
        .select(`
          id,
          data_ora,
          campionato_torneo,
          casa:squadra_casa_id(nome, logo_url),
          ospite:squadra_ospite_id(nome, logo_url)
        `)
        .eq('stato', 'DaGiocare')
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
      <div className="min-h-screen">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">

        {/* Contenuto Partite */}
        {loading ? (
          <div className="min-h-screen">
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
                {/* Header cella: tipo competizione a sinistra, data al centro */}
                <div className="bg-gradient-montecarlo text-white px-4 py-2 rounded-t-lg flex items-center">
                  <div className="text-xs font-medium">
                    {partita.campionato_torneo}
                  </div>
                  <div className="flex-1 text-sm font-medium text-center">
                    {new Date(partita.data_ora).toLocaleString(undefined, {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* Corpo cella con squadre */}
                <div className="bg-white rounded-b-lg shadow-montecarlo hover:shadow-montecarlo-lg border-l-4 border-montecarlo-secondary p-4 space-y-2">
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
