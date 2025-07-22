// src/pages/DettaglioPrePartita.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface Partita {
  id: string;
  data_ora: string;
  goal_a: number;
  goal_b: number;
  casa: Squadra;
  ospite: Squadra;
}

export default function DettaglioPrePartita(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [partita, setPartita] = useState<Partita | null>(null);
  const [precedenti, setPrecedenti] = useState<Partita[]>([]);
  const [loading, setLoading] = useState(true);

  // Ruolo e permessi
  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  const canEdit = role === UserRole.Admin || role === UserRole.Creator;

  // Redirect se non autenticato
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Carica i dati della partita
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from<Partita>('partite')
        .select(`
          id,
          data_ora,
          goal_a,
          goal_b,
          casa:squadra_casa_id(id, nome, logo_url),
          ospite:squadra_ospite_id(id, nome, logo_url)
        `)
        .eq('id', id)
        .single();
      if (error) {
        console.error('Errore fetch partita:', error);
      } else {
        setPartita(data);
      }
      setLoading(false);
    })();
  }, [id]);

  // Carica gli scontri precedenti
  useEffect(() => {
    if (!partita) return;
    (async () => {
      const { data, error } = await supabase
        .from<Partita>('partite')
        .select(`
          id,
          data_ora,
          goal_a,
          goal_b,
          casa:squadra_casa_id(id, nome, logo_url),
          ospite:squadra_ospite_id(id, nome, logo_url)
        `)
        .or(
          `and(squadra_casa_id.eq.${partita.casa.id},squadra_ospite_id.eq.${partita.ospite.id}),and(squadra_casa_id.eq.${partita.ospite.id},squadra_ospite_id.eq.${partita.casa.id})`
        )
        .order('data_ora', { ascending: false })
        .limit(5);
      if (error) {
        console.error('Errore fetch precedenti:', error);
      } else {
        setPrecedenti(data.filter(p => p.id !== partita.id));
      }
    })();
  }, [partita]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Eliminare questa partita?')) return;
    const { error } = await supabase.from('partite').delete().eq('id', id);
    if (error) {
      console.error('Errore eliminazione:', error);
      alert('Eliminazione fallita');
    } else {
      navigate('/calendario', { replace: true });
    }
  };

  if (authLoading || loading) {
    return <div className="text-center p-4">Caricamento…</div>;
  }
  if (!partita) {
    return <div className="text-center p-4">Partita non trovata</div>;
  }

  const formattedDate = new Date(partita.data_ora).toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  return (
    <>
      {/* header: freccia spostata con left-16 per non sovrapporsi all'hamburger */}
      <div className="relative mt-6 mb-6">
        <Link
          to="/calendario"
          className="absolute left-16 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
        </Link>

        {canEdit && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex space-x-2">
            <button
              navigate(`/partita/${id}/edit`)
              className="flex items-center px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        <div className="text-center text-gray-700 text-sm font-medium">
          {formattedDate}
        </div>
      </div>

      {/* loghi e nomi */}
      <div className="flex flex-col items-center mb-10 space-y-4">
        {partita.casa.logo_url ? (
          <img
            src={partita.casa.logo_url}
            alt={partita.casa.nome}
            className="w-16 h-16 object-contain"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xl">
            {partita.casa.nome.charAt(0)}
          </div>
        )}
        <div className="text-lg font-semibold">{partita.casa.nome}</div>

        <div className="text-base font-medium text-gray-600">vs</div>

        <div className="text-lg font-semibold">{partita.ospite.nome}</div>
        {partita.ospite.logo_url ? (
          <img
            src={partita.ospite.logo_url}
            alt={partita.ospite.nome}
            className="w-16 h-16 object-contain"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xl">
            {partita.ospite.nome.charAt(0)}
          </div>
        )}
      </div>

      {/* scontri precedenti: lista centrata */}
      {precedenti.length > 0 && (
        <div className="mb-6 px-4">
          <h3 className="text-base font-semibold mb-3 text-center">
            Scontri precedenti
          </h3>
          <ul className="space-y-2 mx-auto text-center">
            {precedenti.map((p) => {
              const d = new Date(p.data_ora).toLocaleDateString(undefined, {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
              });
              return (
                <li
                  key={p.id}
                  onClick={() => navigate(`/partita/${p.id}`)}
                  className="py-2 cursor-pointer"
                >
                  <span className="text-sm">
                    {d}&nbsp;&nbsp;{p.casa.nome} {p.goal_a}-{p.goal_b}{' '}
                    {p.ospite.nome}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
