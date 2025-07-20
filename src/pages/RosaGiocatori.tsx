// src/pages/RosaGiocatori.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';

interface Giocatore {
  id: string;
  nome: string;
  cognome: string;
  ruolo: string | null;
  foto_url: string | null;
}

export default function RosaGiocatori(): JSX.Element {
  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  const canEdit =
    user?.app_metadata?.role === UserRole.Admin ||
    user?.app_metadata?.role === UserRole.Creator ||
    user?.user_metadata?.role === UserRole.Admin ||
    user?.user_metadata?.role === UserRole.Creator;

  useEffect(() => {
    const fetchGiocatori = async () => {
      const { data, error } = await supabase
        .from<Giocatore>('giocatori')
        .select('*')
        .order('cognome', { ascending: true });
      if (error) {
        console.error('Errore fetch giocatori:', error);
      } else if (data) {
        setGiocatori(data);
      }
      setLoading(false);
    };
    fetchGiocatori();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-6">
        {/* Header ridotto */}
        <div className="relative mb-4">
          <div className="bg-white rounded-xl shadow-montecarlo p-2">
            <div className="flex items-center justify-center">
              <h2 className="text-lg font-bold text-montecarlo-secondary">
                Rosa Giocatori
              </h2>
            </div>
            {canEdit && (
              <button
                onClick={() => navigate('/aggiungi-giocatore')}
                className="absolute right-2 top-2 w-8 h-8 bg-gradient-montecarlo text-white rounded-full flex items-center justify-center hover:shadow-montecarlo-lg transition-all duration-300 transform hover:scale-105"
                aria-label="Aggiungi Giocatore"
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
        ) : (
          <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
            {giocatori.map((g) => (
              <div
                key={g.id}
                onClick={() => navigate(`/giocatore/${g.id}`)}
                className="bg-white rounded-lg shadow-montecarlo hover:shadow-montecarlo-lg border-l-4 border-montecarlo-secondary cursor-pointer transition-all duration-300 transform hover:scale-[1.02] p-2"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-montecarlo-accent">
                    {g.foto_url ? (
                      <img
                        src={g.foto_url}
                        alt={`${g.cognome} ${g.nome}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-montecarlo-secondary flex items-center justify-center text-white text-base font-bold">
                        {g.cognome.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-montecarlo-secondary text-base">
                      {g.cognome} {g.nome}
                    </h3>
                    {g.ruolo && (
                      <p className="text-montecarlo-neutral text-sm font-medium">
                        {g.ruolo}
                      </p>
                    )}
                  </div>
                  {/* puntino giallo rimosso */}
                </div>
              </div>
            ))}
            {giocatori.length === 0 && (
              <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
                <div className="text-montecarlo-neutral">
                  Nessun giocatore trovato.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
