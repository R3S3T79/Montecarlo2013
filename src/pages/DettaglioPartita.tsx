// src/pages/DettaglioPartita.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Edit, Trash2 } from 'lucide-react';
import { UserRole } from '../lib/roles';

interface MarcatoriEntry {
  id: string;
  giocatore: { nome: string; cognome: string };
  periodo: number;
}

interface SquadraInfo {
  id: string;
  nome: string;
  logo_url: string;
}

interface PartitaDettaglio {
  id: string;
  data_ora: string;
  casa: SquadraInfo;
  ospite: SquadraInfo;
  goal_a: number;
  goal_b: number;
  goal_a1: number;
  goal_a2: number;
  goal_a3: number;
  goal_a4: number;
  goal_b1: number;
  goal_b2: number;
  goal_b3: number;
  goal_b4: number;
  marcatori: MarcatoriEntry[];
}

const MONTECARLO_ID = '5bca3e07-974a-4d12-9208-d85975906fe4';

export default function DettaglioPartita() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [partita, setPartita] = useState<PartitaDettaglio | null>(null);
  const [loading, setLoading] = useState(true);

  // Ruolo da JWT
  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  const canEdit = role === UserRole.Admin || role === UserRole.Creator;

  // Redirect se non loggato
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Fetch dati
  useEffect(() => {
    async function fetchDetail() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const { data: pd, error: pe } = await supabase
          .from('partite')
          .select(`
            id,
            data_ora,
            goal_a,
            goal_b,
            goal_a1,
            goal_a2,
            goal_a3,
            goal_a4,
            goal_b1,
            goal_b2,
            goal_b3,
            goal_b4,
            casa: squadra_casa_id ( id, nome, logo_url ),
            ospite: squadra_ospite_id ( id, nome, logo_url )
          `)
          .eq('id', id)
          .single();
        if (pe || !pd) {
          console.error(pe);
          setLoading(false);
          return;
        }

        const { data: md, error: me } = await supabase
          .from('marcatori')
          .select('periodo, giocatore_id')
          .eq('partita_id', id);
        if (me) console.error(me);

        let marcWithNames: MarcatoriEntry[] = [];
        if (md?.length) {
          const ids = Array.from(new Set(md.map(m => m.giocatore_id)));
          const { data: gd, error: ge } = await supabase
            .from('giocatori')
            .select('id, nome, cognome')
            .in('id', ids);
          if (ge) console.error(ge);
          if (gd) {
            marcWithNames = md.map(m => {
              const g = gd.find(x => x.id === m.giocatore_id)!;
              return {
                id: m.giocatore_id,
                periodo: m.periodo,
                giocatore: { nome: g.nome, cognome: g.cognome },
              };
            });
          }
        }

        setPartita({ ...pd, marcatori: marcWithNames });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchDetail();
    }
  }, [id, user, navigate]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Sei sicuro di eliminare questa partita?')) return;
    const { error } = await supabase.from('partite').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert('Eliminazione fallita');
    } else {
      navigate(-1);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Caricamento…</span>
      </div>
    );
  }

  if (!partita) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Partita non trovata
      </div>
    );
  }

  const formatData = (d: string) =>
    new Date(d).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const tempi = [
    { label: '1° Tempo', casa: partita.goal_a1, ospite: partita.goal_b1 },
    { label: '2° Tempo', casa: partita.goal_a2, ospite: partita.goal_b2 },
    { label: '3° Tempo', casa: partita.goal_a3, ospite: partita.goal_b3 },
    { label: '4° Tempo', casa: partita.goal_a4, ospite: partita.goal_b4 },
  ];

  const isCasa = partita.casa.id === MONTECARLO_ID;

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="flex items-center p-4 border-b">
        {/* Freccia torna indietro di un passo */}
        <button
          onClick={() => navigate(-1)}
          className="text-gray-700 text-2xl ml-12"
          aria-label="Indietro"
        >
          ←
        </button>
        <div className="flex-1 text-center text-gray-800 text-lg font-semibold">
          {formatData(partita.data_ora)}
        </div>
        {canEdit && (
          <button
            onClick={() => navigate(`/partita/${id}/edit`)}
            className="text-gray-700 hover:text-gray-900"
            title="Modifica risultato"
          >
            <Edit size={24} />
          </button>
        )}
      </div>

      <div className="px-6 py-8 flex flex-col items-center">
        {/* Casa */}
        <div className="relative w-full max-w-md mb-6">
          <div className="relative z-10 flex items-baseline justify-center space-x-2">
            <span className="text-xl font-bold text-gray-800">
              {partita.casa.nome}
            </span>
            <span className="text-xl font-medium text-gray-900">
              {partita.goal_a}
            </span>
          </div>
          <img
            src={partita.casa.logo_url}
            alt=""
            className="absolute left-1/2 top-16 transform -translate-x-1/2 h-32 w-32 object-contain opacity-10"
          />
        </div>

        {/* Tempi e marcatori */}
        <div className="w-full max-w-md mb-4">
          {tempi.map((t, i) => (
            <div key={i} className="pb-1">
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-gray-600">{t.label}</span>
                <span className="text-lg font-medium text-gray-900">
                  {t.casa}
                </span>
              </div>
              {isCasa &&
                partita.marcatori
                  .filter(m => m.periodo === i + 1)
                  .map(m => (
                    <div key={m.id} className="mt-1 ml-4 italic text-gray-700">
                      <Link
                        to={`/giocatore/${m.id}`}
                        className="hover:text-blue-600"
                      >
                        {m.giocatore.cognome} {m.giocatore.nome}
                      </Link>
                    </div>
                  ))}
            </div>
          ))}
        </div>

        {/* Ospite */}
        <div className="relative w-full max-w-md mb-6">
          <div className="relative z-10 flex items-baseline justify-center space-x-2">
            <span className="text-xl font-bold text-gray-800">
              {partita.ospite.nome}
            </span>
            <span className="text-xl font-medium text-gray-900">
              {partita.goal_b}
            </span>
          </div>
          <img
            src={partita.ospite.logo_url}
            alt=""
            className="absolute left-1/2 top-16 transform -translate-x-1/2 h-32 w-32 object-contain opacity-10"
          />
        </div>

        <div className="w-full max-w-md">
          {tempi.map((t, i) => (
            <div key={i} className="pb-1">
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-gray-600">{t.label}</span>
                <span className="text-lg font-medium text-gray-900">
                  {t.ospite}
                </span>
              </div>
              {!isCasa &&
                partita.marcatori
                  .filter(m => m.periodo === i + 1)
                  .map(m => (
                    <div key={m.id} className="mt-1 ml-4 italic text-gray-700">
                      <Link
                        to={`/giocatore/${m.id}`}
                        className="hover:text-blue-600"
                      >
                        {m.giocatore.cognome} {m.giocatore.nome}
                      </Link>
                    </div>
                  ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
