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

  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  const canEdit = role === UserRole.Admin || role === UserRole.Creator;

  useEffect(() => {
    console.log("🟡 useEffect triggered con id:", id, "utente:", user);

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

        console.log("📦 Partita Dettaglio:", pd);
        if (pe) console.error("❌ Errore fetch partite:", pe);
        if (!pd) {
          setLoading(false);
          return;
        }

        const { data: md, error: me } = await supabase
          .from('marcatori')
          .select('periodo, giocatore_id')
          .eq('partita_id', id);

        console.log("📦 Marcatori:", md);
        if (me) console.error("❌ Errore fetch marcatori:", me);

        let marcWithNames: MarcatoriEntry[] = [];
        if (md?.length) {
          const ids = Array.from(new Set(md.map(m => m.giocatore_id)));
          const { data: gd, error: ge } = await supabase
            .from('giocatori')
            .select('id, nome, cognome')
            .in('id', ids);

          console.log("📦 Giocatori:", gd);
          if (ge) console.error("❌ Errore fetch giocatori:", ge);

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
        console.error("❌ Errore generico:", err);
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
      {/* contenuto UI invariato */}
    </div>
  );
}
