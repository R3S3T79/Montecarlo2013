// src/pages/ListaSquadre.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { PlusCircle } from 'lucide-react';

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

  if (loading) {
    return <div className="p-4 text-center">Caricamento...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header: titolo centrato + pulsante “+” a destra */}
      <div className="flex justify-center items-center mb-6 space-x-4">
        <h1 className="text-xl font-bold">Lista Squadre</h1>
        <button
          onClick={() => navigate('/squadre/nuova')}
          title="Nuova Squadra"
          className="
            flex items-center justify-center
            w-10 h-10
            bg-blue-600 text-white
            rounded-full
            hover:bg-blue-700
            transition-colors
          "
        >
          <PlusCircle size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {squadre.map((squadra) => (
          <div
            key={squadra.id}
            onClick={() => navigate(`/squadre/${squadra.id}`)}
            className="
              bg-white rounded-lg
              shadow-lg border border-gray-200
              p-4 cursor-pointer
              hover:shadow-2xl transition-shadow duration-200
            "
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex-shrink-0">
                {squadra.logo_url ? (
                  <img
                    src={squadra.logo_url}
                    alt={`Logo ${squadra.nome}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl text-gray-400">
                      {squadra.nome.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {squadra.nome}
                </h2>
                {squadra.nome_stadio && (
                  <p className="text-sm text-gray-600">
                    {squadra.nome_stadio}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
