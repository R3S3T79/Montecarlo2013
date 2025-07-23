import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Edit2, Trash2, ArrowLeft } from 'lucide-react';
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
          const { data: gd } = await supabase
            .from('giocatori')
            .select('id, nome, cognome')
            .in('id', ids);

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
        console.error("Errore:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user) fetchDetail();
  }, [id, user]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Eliminare questa partita?')) return;
    const { error } = await supabase.from('partite').delete().eq('id', id);
    if (error) alert('Errore eliminazione');
    else navigate('/risultati');
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
  const montecarlo = isCasa ? partita.casa : partita.ospite;
  const avversario = isCasa ? partita.ospite : partita.casa;
  const goalMC = isCasa ? partita.goal_a : partita.goal_b;
  const goalAVV = isCasa ? partita.goal_b : partita.goal_a;

  const goalMCxTempo = [
    isCasa ? partita.goal_a1 : partita.goal_b1,
    isCasa ? partita.goal_a2 : partita.goal_b2,
    isCasa ? partita.goal_a3 : partita.goal_b3,
    isCasa ? partita.goal_a4 : partita.goal_b4,
  ];
  const goalAVVxTempo = [
    isCasa ? partita.goal_b1 : partita.goal_a1,
    isCasa ? partita.goal_b2 : partita.goal_a2,
    isCasa ? partita.goal_b3 : partita.goal_a3,
    isCasa ? partita.goal_b4 : partita.goal_a4,
  ];

  const dataFormatted = new Date(partita.data_ora).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-6">
        <div className="relative mb-6">
          <Link
            to="/risultati"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-montecarlo-secondary hover:text-montecarlo-primary"
          >
            <ArrowLeft size={20} />
          </Link>

          <div className="text-center text-sm font-medium text-montecarlo-secondary">
            {dataFormatted}
          </div>

          {canEdit && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex space-x-2">
              <button
                onClick={() => navigate(`/gestione-risultato/${id}`)}
                className="px-2 py-1 text-xs bg-yellow-400 text-white rounded hover:bg-yellow-500"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={handleDelete}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-6 text-center">
          <div className="text-montecarlo-secondary font-bold text-lg">{montecarlo.nome}</div>
          <div className="text-4xl font-extrabold text-montecarlo-purple">{goalMC} - {goalAVV}</div>
          <div className="text-montecarlo-secondary font-bold text-lg">{avversario.nome}</div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <h3 className="text-center text-montecarlo-secondary font-semibold mb-3">Risultato per tempo</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-center text-montecarlo-neutral">
            {[0, 1, 2, 3].map(i => (
              <React.Fragment key={i}>
                <div>{i + 1}° Tempo</div>
                <div>{goalMCxTempo[i]} - {goalAVVxTempo[i]}</div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {partita.marcatori.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-center text-montecarlo-secondary font-semibold mb-3">
              Marcatori Montecarlo
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {partita.marcatori
                .sort((a, b) => a.periodo - b.periodo)
                .map((m, i) => (
                  <li key={i} className="text-montecarlo-neutral">
                    <span className="font-medium">
                      {m.giocatore.cognome} {m.giocatore.nome}
                    </span>{' '}
                    - {m.periodo}° Tempo
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
