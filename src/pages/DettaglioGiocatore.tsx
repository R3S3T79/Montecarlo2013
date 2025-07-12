import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface Giocatore {
  id: string;
  nome: string;
  cognome: string;
  ruolo: string | null;
  foto_url: string | null;
  data_nascita: string | null;
  numero_cartellino: number | null;
}

interface StatisticheGiocatore {
  goalTotali: number;
  presenzeTotali: number;
}

export default function DettaglioGiocatore() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [giocatore, setGiocatore] = useState<Giocatore | null>(null);
  const [statistiche, setStatistiche] = useState<StatisticheGiocatore>({
    goalTotali: 0,
    presenzeTotali: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGiocatore = async () => {
      if (!id) return;

      try {
        // 1. Fetch dati giocatore
        const { data: giocatoreData, error: giocatoreError } = await supabase
          .from('giocatori')
          .select('*')
          .eq('id', id)
          .single();

        if (giocatoreError || !giocatoreData) {
          console.error('Errore fetch giocatore:', giocatoreError);
          setLoading(false);
          return;
        }

        setGiocatore(giocatoreData);

        // 2. Fetch goal totali (dalla tabella marcatori)
        const { data: goalData, error: goalError } = await supabase
          .from('marcatori')
          .select('*', { count: 'exact', head: true })
          .eq('giocatore_id', id);

        const goalTotali = goalError ? 0 : (goalData?.length || 0);

        // 3. Fetch presenze totali (dalla tabella presenze)
        const { data: presenzeData, error: presenzeError } = await supabase
          .from('presenze')
          .select('*', { count: 'exact', head: true })
          .eq('giocatore_id', id);

        const presenzeTotali = presenzeError ? 0 : (presenzeData?.length || 0);

        setStatistiche({
          goalTotali,
          presenzeTotali
        });

      } catch (error) {
        console.error('Errore generale:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGiocatore();
  }, [id]);

  if (loading) return <div className="p-4 text-center">Caricamento...</div>;
  if (!giocatore) return <div className="p-4 text-center">Giocatore non trovato</div>;

  const formatDataNascita = (data: string | null) => {
    if (!data) return '';
    return new Date(data).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const calcolaEta = (dataNascita: string | null) => {
    if (!dataNascita) return null;
    const oggi = new Date();
    const nascita = new Date(dataNascita);
    let eta = oggi.getFullYear() - nascita.getFullYear();
    const mese = oggi.getMonth() - nascita.getMonth();
    if (mese < 0 || (mese === 0 && oggi.getDate() < nascita.getDate())) {
      eta--;
    }
    return eta;
  };

  const eta = calcolaEta(giocatore.data_nascita);

  return (
    <div className="min-h-screen bg-white">
      {/* Barra superiore con freccia indietro */}
      <div className="flex items-center p-4 border-b">
        <button onClick={() => navigate(-1)} className="text-gray-700 text-2xl">
          ←
        </button>
        <div className="flex-1" />
      </div>

      {/* Contenuto principale */}
      <div className="flex flex-col items-center px-6 py-8">
        {/* Foto profilo */}
        <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden mb-6">
          {giocatore.foto_url ? (
            <img
              src={giocatore.foto_url}
              alt={`${giocatore.cognome} ${giocatore.nome}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center text-4xl">
              {giocatore.cognome[0]}
            </div>
          )}
        </div>

        {/* Nome giocatore */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {giocatore.cognome} {giocatore.nome}
        </h1>

        {/* Statistiche principali */}
        <div className="flex space-x-8 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{statistiche.goalTotali}</div>
            <div className="text-sm text-gray-600">Goal</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{statistiche.presenzeTotali}</div>
            <div className="text-sm text-gray-600">Presenze</div>
          </div>
          {statistiche.presenzeTotali > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(statistiche.goalTotali / statistiche.presenzeTotali).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Media Goal</div>
            </div>
          )}
        </div>

        {/* Informazioni dettagliate */}
        <div className="w-full max-w-md space-y-4">
          {giocatore.data_nascita && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Data di nascita</span>
              <div className="text-right">
                <span className="font-medium">{formatDataNascita(giocatore.data_nascita)}</span>
                {eta && <span className="text-sm text-gray-500 ml-2">({eta} anni)</span>}
              </div>
            </div>
          )}

          {giocatore.ruolo && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Ruolo</span>
              <span className="font-medium">{giocatore.ruolo}</span>
            </div>
          )}

          {giocatore.numero_cartellino && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Numero Cartellino</span>
              <span className="font-medium">{giocatore.numero_cartellino}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}