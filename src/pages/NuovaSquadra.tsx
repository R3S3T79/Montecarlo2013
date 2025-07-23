// src/pages/DettaglioSquadra.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Trash2, ArrowLeft } from 'lucide-react';

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
  nome_stadio: string | null;
  indirizzo: string | null;
  mappa_url: string | null;  // deve essere l'URL "embed" di Google Maps
}

export default function DettaglioSquadra() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [squadra, setSquadra] = useState<Squadra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from<Squadra>('squadre')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error('Errore caricamento dettaglio:', error);
        return;
      }
      setSquadra(data);
      setLoading(false);
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Sei sicuro di voler eliminare questa squadra?')) return;

    const { error } = await supabase
      .from('squadre')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Errore eliminazione:', error);
      alert('Non sono riuscito a eliminare la squadra.');
    } else {
      navigate('/squadre');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Caricamento…</div>;
  }
  if (!squadra) {
    return <div className="p-4 text-center">Squadra non trovata</div>;
  }

  return (
    <div className="container mx-auto px-4 py-2 max-w-3xl">
      {/* Header con back e delete */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/squadre')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span className="ml-2">Lista Squadre</span>
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center text-red-600 hover:text-red-800"
        >
          <Trash2 size={20} />
          <span className="ml-2">Elimina</span>
        </button>
      </div>

      {/* Logo e nome */}
      <div className="flex items-center space-x-4 mb-6">
        {squadra.logo_url ? (
          <img
            src={squadra.logo_url}
            alt={`Logo ${squadra.nome}`}
            className="w-24 h-24 object-contain border rounded"
          />
        ) : (
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl text-gray-400">
            {squadra.nome.charAt(0)}
          </div>
        )}
        <h1 className="text-3xl font-bold">{squadra.nome}</h1>
      </div>

      {/* Dati */}
      <div className="space-y-4 mb-6">
        <div>
          <h2 className="font-semibold">Stadio</h2>
          <p className="text-gray-700">
            {squadra.nome_stadio || 'Da inserire'}
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Indirizzo</h2>
          <p className="text-gray-700">
            {squadra.indirizzo || 'Da inserire'}
          </p>
        </div>
      </div>

      {/* Mappa */}
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Mappa</h2>
        {squadra.mappa_url ? (
          <div className="w-full h-64 border">
            <iframe
              src={squadra.mappa_url}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="text-gray-500">Nessuna mappa disponibile</p>
        )}
      </div>
    </div>
  );
}
