// src/pages/DettaglioGiocatore.tsx
// Data creazione chat: 14/08/2025

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../lib/roles';

interface Giocatore {
  giocatore_stagione_id: string;
  giocatore_uid: string;
  stagione_id: string;
  giocatore_nome: string;
  giocatore_cognome: string;
  ruolo: string | null;
  foto_url: string | null;
  data_nascita: string | null;
  numero_cartellino: number | null;
}

interface StatisticheGiocatore {
  goalTotali: number;
  presenzeTotali: number;
}

interface Stagione {
  id: string;
  stagione_nome: string;
}

export default function DettaglioGiocatore() {
  const { user, loading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [giocatore, setGiocatore] = useState<Giocatore | null>(null);
  const [statistiche, setStatistiche] = useState<StatisticheGiocatore>({
    goalTotali: 0,
    presenzeTotali: 0,
  });
  const [stagioniDisponibili, setStagioniDisponibili] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Eliminazione giocatore: collegata al cestino navbar
  const handleElimina = async () => {
    if (!id) return;
    if (!window.confirm('Sei sicuro di voler eliminare questo giocatore e tutti i suoi dati?')) return;

    const { error } = await supabase
      .from('giocatori')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Errore eliminazione:', error);
      alert("Errore durante l'eliminazione.");
      return;
    }

    navigate('/rosa');
  };

  // Rendo disponibile la funzione al layout/nav per il cestino
  useEffect(() => {
    (window as any).__deleteCurrent = handleElimina;
    return () => {
      if ((window as any).__deleteCurrent === handleElimina) {
        (window as any).__deleteCurrent = undefined;
      }
    };
  }, [id]);

  const fetchStatistiche = async (giocatoreUid: string, stagioneId: string) => {
    const { data } = await supabase
      .from('v_stat_giocatore_stagione')
      .select('goal_totali, presenze_totali')
      .eq('giocatore_uid', giocatoreUid)
      .eq('stagione_id', stagioneId)
      .maybeSingle();

    if (data) {
      setStatistiche({
        goalTotali: data.goal_totali || 0,
        presenzeTotali: data.presenze_totali || 0,
      });
    } else {
      setStatistiche({ goalTotali: 0, presenzeTotali: 0 });
    }
  };

  const fetchGiocatore = async (stagioneId: string) => {
    if (!id) return;

    const { data: recordStagione } = await supabase
      .from('v_giocatori_completo')
      .select('*')
      .eq('giocatore_uid', id)
      .eq('stagione_id', stagioneId)
      .maybeSingle();

    if (recordStagione) {
      setGiocatore(recordStagione as Giocatore);
      await fetchStatistiche(recordStagione.giocatore_uid, stagioneId);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const { data: tutteStagioni } = await supabase
          .from('v_giocatori_completo')
          .select('stagione_id,stagione_nome')
          .eq('giocatore_uid', id)
          .order('stagione_nome', { ascending: true });

        if (tutteStagioni) {
          const stagioniUniche = tutteStagioni.reduce((acc: Stagione[], cur) => {
            if (!acc.find((s) => s.id === cur.stagione_id)) {
              acc.push({ id: cur.stagione_id, stagione_nome: cur.stagione_nome });
            }
            return acc;
          }, []);
          setStagioniDisponibili(stagioniUniche);
          if (stagioniUniche.length > 0) {
            setStagioneSelezionata(stagioniUniche[stagioniUniche.length - 1].id);
          }
        }
      } catch (error) {
        console.error('Errore inizializzazione:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  useEffect(() => {
    if (stagioneSelezionata) {
      fetchGiocatore(stagioneSelezionata);
    }
  }, [stagioneSelezionata]);

  const formatData = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '';

  const calcolaEta = (d: string | null) => {
    if (!d) return null;
    const oggi = new Date();
    const nascita = new Date(d);
    let eta = oggi.getFullYear() - nascita.getFullYear();
    const diffMesi = oggi.getMonth() - nascita.getMonth();
    if (diffMesi < 0 || (diffMesi === 0 && oggi.getDate() < nascita.getDate())) eta--;
    return eta;
  };

  const eta = calcolaEta(giocatore?.data_nascita || null);

  if (authLoading || loading || !giocatore) {
    return <div className="p-4 text-center">Caricamento...</div>;
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        {stagioniDisponibili.length > 0 && (
          <div className="mb-4">
            
            <select
              value={stagioneSelezionata}
              onChange={(e) => setStagioneSelezionata(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            >
              {stagioniDisponibili.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.stagione_nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-montecarlo p-6 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden mb-4 border-2 border-montecarlo-accent">
            {giocatore.foto_url ? (
              <img
                src={giocatore.foto_url}
                alt={`${giocatore.giocatore_cognome} ${giocatore.giocatore_nome}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-montecarlo-secondary text-white flex items-center justify-center text-4xl font-bold">
                {giocatore.giocatore_cognome[0]}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-montecarlo-secondary mb-4">
            {giocatore.giocatore_cognome} {giocatore.giocatore_nome}
          </h1>

          <div className="flex space-x-8 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-montecarlo-accent">{statistiche.goalTotali}</div>
              <div className="text-sm text-black">Goal</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-montecarlo-gold-600">{statistiche.presenzeTotali}</div>
              <div className="text-sm text-black">Presenze</div>
            </div>
            {statistiche.presenzeTotali > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-montecarlo-green-600">
                  {(statistiche.goalTotali / statistiche.presenzeTotali).toFixed(2)}
                </div>
                <div className="text-sm text-black">Media Goal</div>
              </div>
            )}
          </div>

          <div className="w-full max-w-md space-y-4">
            {giocatore.data_nascita && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-black">Data di nascita</span>
                <span className="font-medium">{formatData(giocatore.data_nascita)}</span>
                {eta && <span className="text-sm text-black ml-2">({eta} anni)</span>}
              </div>
            )}
            {giocatore.ruolo && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-black">Ruolo</span>
                <span className="font-medium">{giocatore.ruolo}</span>
              </div>
            )}
            {giocatore.numero_cartellino != null && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-black">Numero Cartellino</span>
                <span className="font-medium">{giocatore.numero_cartellino}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
