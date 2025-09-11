// src/pages/AllenamentiGiocatore.tsx
// Data creazione chat: 2025-08-01 (rev: fix view giocatori_stagioni_view)

import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { UserRole } from '../lib/roles';

// Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface StatisticheAllenamento {
  totale: number;
  presenze: number;
  assenze: number;
  ultimaSettimana: { presenze: number; assenze: number };
  ultimoMese: { presenze: number; assenze: number };
}

export default function AllenamentiGiocatore(): JSX.Element {
  const { user, loading: authLoading } = useAuth();
  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;

  if (!authLoading && role !== UserRole.Admin && role !== UserRole.Creator) {
    return <Navigate to="/" replace />;
  }

  // ATTENZIONE: qui l'ID che arriva dall'URL è l'id REALE del giocatore (giocatori.id)
  const { id: playerId } = useParams<{ id: string }>();
  if (!playerId) {
    return <Navigate to="/allenamenti" replace />;
  }

  const [playerName, setPlayerName] = useState<string>('');
  const [recordId, setRecordId] = useState<string>(''); // id riga stagione-giocatore (view)
  const [stats, setStats] = useState<StatisticheAllenamento | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1) Individua la stagione attiva OGGI
      const oggi = new Date().toISOString().slice(0, 10);
      const { data: stag, error: stagErr } = await supabase
        .from('stagioni')
        .select('id')
        .lte('data_inizio', oggi)
        .gte('data_fine', oggi)
        .single();

      if (stagErr || !stag) {
        console.error('Nessuna stagione attiva:', stagErr);
        setLoading(false);
        return;
      }

      // 2) Recupera nome/cognome e record stagione-giocatore dalla VIEW corretta
      const { data: gs, error: gsErr } = await supabase
        .from('giocatori_stagioni_view')
        .select('id, giocatore_uid, nome, cognome')
        .eq('giocatore_uid', playerId)   // id reale giocatore
        .eq('stagione_id', stag.id)
        .single();

      if (gsErr || !gs) {
        console.error('Record giocatori_stagioni_view non trovato:', gsErr);
        setLoading(false);
        return;
      }

      setRecordId(gs.id);
      setPlayerName(`${gs.cognome} ${gs.nome}`);

      // 3) Recupera tutti gli allenamenti del giocatore per la stagione corrente
      const { data: allen, error: allenErr } = await supabase
        .from('allenamenti')
        .select('data_allenamento, presente')
        .eq('giocatore_uid', playerId)
        .eq('stagione_id', stag.id);

      if (allenErr || !allen) {
        console.error('Errore fetch allenamenti:', allenErr);
        setLoading(false);
        return;
      }

      // 4) Calcolo statistiche
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);

      let totale = 0,
        presenze = 0,
        assenze = 0;
      let presSett = 0,
        assSett = 0,
        presMese = 0,
        assMese = 0;

      allen.forEach((a) => {
        // data_allenamento è di tipo DATE: parsiamolo in modo sicuro (YYYY-MM-DD)
        const d = new Date(`${a.data_allenamento}T00:00:00`);

        totale++;
        if (a.presente) presenze++; else assenze++;

        if (d >= weekAgo) {
          a.presente ? presSett++ : assSett++;
        }
        if (d >= monthAgo) {
          a.presente ? presMese++ : assMese++;
        }
      });

      setStats({
        totale,
        presenze,
        assenze,
        ultimaSettimana: { presenze: presSett, assenze: assSett },
        ultimoMese: { presenze: presMese, assenze: assMese },
      });
      setLoading(false);
    }

    fetchData();
  }, [playerId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Caricamento…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Errore nel caricamento delle statistiche.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Nome Giocatore */}
      <h1 className="text-3xl font-bold text-center text-white mb-6">
        {playerName}
      </h1>

      {/* Riquadro unico con Totale / Presenze / Assenze affiancati */}
      <div className="bg-white/90 p-6 rounded-lg shadow">
        <div className="flex flex-row justify-around text-center">
          <div>
            <div className="text-sm text-gray-500">Totale</div>
            <div className="text-2xl font-semibold">{stats.totale}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Presenze</div>
            <div className="text-2xl font-semibold text-green-600">{stats.presenze}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Assenze</div>
            <div className="text-2xl font-semibold text-red-600">{stats.assenze}</div>
          </div>
        </div>
      </div>

      {/* Statistiche Settimana e Mese */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/90 p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Ultima Settimana</div>
          <div className="flex justify-between mt-2">
            <span>Presenze: {stats.ultimaSettimana.presenze}</span>
            <span>Assenze: {stats.ultimaSettimana.assenze}</span>
          </div>
        </div>
        <div className="bg-white/90 p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Ultimo Mese</div>
          <div className="flex justify-between mt-2">
            <span>Presenze: {stats.ultimoMese.presenze}</span>
            <span>Assenze: {stats.ultimoMese.assenze}</span>
          </div>
        </div>
      </div>

      {/* Grafico presenze/assenze */}
      <div className="bg-white/90 p-6 rounded-lg shadow">
        <h2 className="text-center font-semibold mb-4">Presenze vs Assenze</h2>
        <Bar
          data={{
            labels: ["Allenamenti"],
            datasets: [
              {
                label: "Presenze",
                data: [stats.presenze],
                backgroundColor: "rgba(34,197,94,0.8)", // verde
              },
              {
                label: "Assenze",
                data: [stats.assenze],
                backgroundColor: "rgba(239,68,68,0.8)", // rosso
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: { position: "top" as const },
              title: { display: false },
            },
            scales: {
              x: { stacked: true },
              y: { stacked: true, beginAtZero: true },
            },
          }}
        />
      </div>
    </div>
  );
}
