// src/pages/DettaglioSquadra.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Trash2, ExternalLink, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
  nome_stadio: string | null;
  indirizzo: string | null;
  mappa_url: string | null;
}

export default function DettaglioSquadra(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [squadra, setSquadra] = useState<Squadra | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  const canEdit = role === UserRole.Admin || role === UserRole.Creator;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from<Squadra>('squadre')
        .select('*')
        .eq('id', id)
        .single();
      if (error) console.error('Errore caricamento squadra:', error);
      else setSquadra(data);
      setLoading(false);
    })();
  }, [id]);

  const handleDelete = async (): Promise<void> => {
    if (!id) return;
    if (!window.confirm('Sei sicuro di voler eliminare questa squadra?')) return;
    const { error } = await supabase.from('squadre').delete().eq('id', id);
    if (error) {
      console.error('Errore eliminazione:', error);
      alert('Eliminazione fallita');
    } else {
      navigate('/squadre', { replace: true });
    }
  };

  const handleNavigate = (): void => {
    if (!squadra?.indirizzo) return;
    const dest = encodeURIComponent(squadra.indirizzo);
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
      '_blank'
    );
  };

  const handleEdit = (): void => {
    navigate(`/squadre/${id}/edit`);
  };

  if (authLoading || loading) {
    return <div className="p-4 text-center">Caricamento…</div>;
  }
  if (!squadra) {
    return <div className="p-4 text-center">Squadra non trovata</div>;
  }

  const validMap =
    typeof squadra.mappa_url === 'string' &&
    squadra.mappa_url.includes('/maps/embed?pb=');

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar: back arrow aligned like other pages, no title */}
      <div className="relative mt-6 mb-4">
        <Link
          to="/squadre"
          className="absolute left-16 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </Link>
        {canEdit && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex space-x-2">
            <button
              onClick={handleEdit}
              className="flex items-center text-blue-600 hover:text-blue-800"
              aria-label="Modifica"
            >
              <Edit size={20} />
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center text-red-600 hover:text-red-800"
              aria-label="Elimina"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Contenuto */}
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Logo e nome */}
        <div className="flex flex-col items-center space-y-4">
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
          <h1 className="text-3xl font-bold text-center">{squadra.nome}</h1>
        </div>

        {/* Dettagli stadio e indirizzo */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Stadio</h2>
            <p className="text-gray-700">
              {squadra.nome_stadio ?? 'Da inserire'}
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Indirizzo</h2>
            <p className="text-gray-700">
              {squadra.indirizzo ?? 'Da inserire'}
            </p>
          </div>
        </div>

        {/* Mappa e navigazione */}
        {validMap && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Mappa</h2>
            <div className="w-full h-64 border rounded overflow-hidden mb-4">
              <iframe
                src={squadra.mappa_url!}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
              />
            </div>
            <button
              onClick={handleNavigate}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              <ExternalLink size={18} className="mr-2" />
              Naviga
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
