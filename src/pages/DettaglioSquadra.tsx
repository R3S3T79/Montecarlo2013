// src/pages/DettaglioSquadra.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Squadra {
  id: string;
  nome: string;
  nome_completo: string | null;
  logo_url: string | null;
  nome_stadio: string | null;
  indirizzo: string | null;
  mappa_url: string | null;
}

export default function DettaglioSquadra(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [squadra, setSquadra] = useState<Squadra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from<Squadra>('squadre')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        setError('Squadra non trovata');
      } else {
        setSquadra(data);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Sei sicuro di voler eliminare questa squadra?')) return;
    const { error } = await supabase.from('squadre').delete().eq('id', id);
    if (error) {
      alert('Errore durante l\'eliminazione');
    } else {
      navigate('/squadre');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Caricamento…</div>;
  }
  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }
  if (!squadra) {
    return <div className="p-4 text-center">Nessuna squadra da mostrare</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-2 pt-2 pb-2">
      {/* Back & Delete */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/squadre')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          
        </button>
        {(user?.ruolo === 'admin' || user?.ruolo === 'creator') && (
          <button
            onClick={handleDelete}
            className="flex items-center text-red-600 hover:text-red-800"
          >
            <Trash2 size={20} />
            <span className="ml-2">Elimina</span>
          </button>
        )}
      </div>

      {/* Logo + Nome */}
      <div className="flex items-center space-x-4 mb-6">
        {squadra.logo_url ? (
          <img
            src={squadra.logo_url}
            alt={`Logo ${squadra.nome}`}
            className="w-24 h-24 object-contain border rounded-lg"
          />
        ) : (
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl text-gray-400">
            {squadra.nome.charAt(0)}
          </div>
        )}
        <h1 className="text-3xl font-bold text-white drop-shadow-lg">{squadra.nome}</h1>
      </div>

      {/* Dati Squadra */}
      <div className="bg-white/90 shadow rounded-lg p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Nome Completo</h2>
          <p className="text-gray-700">{squadra.nome_completo || '—'}</p>
        </div>
        <div>
          <h2 className="font-semibold">Nome Stadio</h2>
          <p className="text-gray-700">{squadra.nome_stadio || '—'}</p>
        </div>
        <div>
          <h2 className="font-semibold">Indirizzo</h2>
          <p className="text-gray-700">{squadra.indirizzo || '—'}</p>
        </div>
        <div>
          <h2 className="font-semibold">Mappa</h2>
          {squadra.mappa_url ? (
            <div className="w-full h-64 border rounded-lg overflow-hidden">
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
    </div>
  );
}
