// src/pages/DettaglioPartita.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
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

  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  const canEdit = role === UserRole.Admin || role === UserRole.Creator;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

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

        if (!pd || pe) {
          console.error("Errore fetch partita:", pe);
          setLoading(false);
          return;
        }

        const { data: md, error: me } = await supabase
          .from('marcatori')
          .select('periodo, giocatore_id')
          .eq('partita_id', id);

        let marcWithNames: MarcatoriEntry[] = [];
        if (md?.length) {
          const ids = Array.from(new Set(md.map(m => m.giocatore_id)));
          const { data: gd, error: ge } = await supabase
            .from('giocatori')
            .select('id, nome, cognome')
            .in('id', ids);

          if (gd && !ge) {
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
        console.error("Errore generale:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user) fetchDetail();
  }, [id, user]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Sei sicuro di eliminare questa partita?')) return;
    const { error } = await supabase.from('partite').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert('Eliminazione fallita');
    } else {
      navigate('/risultati');
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

  const isCasa = partita.casa.id === MONTECARLO_ID;
  const formattedDate = new Date(partita.data_ora).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });

  const tempi = [
    { label: '1° Tempo', casa: partita.goal_a1, ospite: partita.goal_b1 },
    { label: '2° Tempo', casa: partita.goal_a2, ospite: partita.goal_b2 },
    { label: '3° Tempo', casa: partita.goal_a3, ospite: partita.goal_b3 },
    { label: '4° Tempo', casa: partita.goal_a4, ospite: partita.goal_b4 },
  ];

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="relative mb-6">
          <Link
            to="/risultati"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-montecarlo-secondary hover:text-montecarlo-primary"
          >
            <ArrowLeft size={20} />
          </Link>

          {canEdit && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex space-x-2">
              <button
                onClick={() => navigate(`/partita/${id}/edit`)}
                className="px-2 py-1 bg-montecarlo-accent text-white rounded-lg hover:bg-montecarlo-gold-600"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={handleDelete}
                className="px-2 py-1 bg-montecarlo-red-600 text-white rounded-lg hover:bg-montecarlo-red-700"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          <div className="text-center text-montecarlo-secondary text-sm font-medium bg-white rounded shadow py-2">
            {formattedDate}
          </div>
        </div>

        {/* Squadre + Risultato */}
        <div className="bg-white rounded-xl shadow p-6 text-center mb-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="text-lg font-semibold text-montecarlo-secondary">{partita.casa.nome}</div>
            <div className="text-4xl font-bold text-montecarlo-primary">
              {partita.goal_a} - {partita.goal_b}
            </div>
            <div className="text-lg font-semibold text-montecarlo-secondary">{partita.ospite.nome}</div>
          </div>
        </div>

        {/* Goal per tempo */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-center text-montecarlo-secondary font-semibold mb-4">Risultato per tempo</h3>
          <ul className="space-y-2">
            {tempi.map((t, i) => (
              <li key={i} className="flex justify-between text-sm text-montecarlo-neutral px-2">
                <span>{t.label}</span>
                <span>{t.casa} - {t.ospite}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Marcatori */}
        {partita.marcatori.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-center text-montecarlo-secondary font-semibold mb-4">Marcatori Montecarlo</h3>
            <ul className="space-y-1 text-sm text-montecarlo-neutral">
              {partita.marcatori.map((m, i) => (
                <li key={`${m.id}-${i}`}>
                  <span className="font-semibold">{m.giocatore.cognome} {m.giocatore.nome}</span>
                  {` - ${m.periodo}° Tempo`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
