// src/pages/Calendario.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar } from 'lucide-react';

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

  useEffect(() => {
    const fetchPartite = async () => {
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
      else setPartite(data);
      setLoading(false);
    };
    fetchPartite();
  }, []);

  const handleClick = (id: string) => navigate(`/prepartita/${id}`);

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="relative mb-6">
          <div className="bg-white rounded-xl shadow-montecarlo p-6">
            <div className="flex items-center justify-center mb-4">
              <Calendar className="text-montecarlo-secondary mr-3" size={28} />
              <h2 className="text-2xl font-bold text-montecarlo-secondary">
                Calendario Partite
              </h2>
            </div>
            <button
              onClick={() => navigate('/nuova-partita')}
              className="absolute right-2 top-2 w-10 h-10 bg-gradient-montecarlo text-white rounded-full flex items-center justify-center hover:shadow-montecarlo-lg transition-all duration-300 transform hover:scale-105"
              aria-label="Nuova Partita"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
            <div className="text-montecarlo-secondary">Caricamento...</div>
          </div>
        ) : partite.length === 0 ? (
          <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
            <div className="text-montecarlo-neutral">Nessuna partita da giocare trovata.</div>
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

                {/* Contenuto partita */}
                <div className="bg-white rounded-b-lg shadow-montecarlo hover:shadow-montecarlo-lg border-l-4 border-montecarlo-secondary p-4">
                  <div className="flex items-center justify-between">
                    {/* Logo e nome casa */}
                    <div className="flex items-center space-x-3 flex-1">
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

                    {/* VS */}
                    <div className="bg-montecarlo-accent text-montecarlo-secondary px-3 py-1 rounded-lg font-bold shadow-gold">
                      VS
                    </div>

                    {/* Logo e nome ospite */}
                    <div className="flex items-center space-x-3 flex-1 justify-end">
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}