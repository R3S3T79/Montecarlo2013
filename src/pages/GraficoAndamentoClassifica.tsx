// src/pages/GraficoAndamentoClassifica.tsx
// Data creazione chat: 07/11/2025 — Grafico andamento posizioni classifica con checkbox squadre

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Line
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface RecordClassifica {
  giornata: number;
  squadra: string;
  posizione: number;
}

export default function GraficoAndamentoClassifica() {
  const [records, setRecords] = useState<RecordClassifica[]>([]);
  const [squadre, setSquadre] = useState<string[]>([]);
  const [selezionate, setSelezionate] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("v_andamento_classifica")
        .select("giornata, squadra, posizione")
        .order("giornata", { ascending: true });

      if (error) {
        console.error("❌ Errore caricamento dati:", error);
      } else {
        setRecords(data || []);
        const squadreUniche = Array.from(
          new Set((data || []).map((r) => r.squadra))
        );
        setSquadre(squadreUniche);
        setSelezionate(squadreUniche.filter((s) =>
          s.toLowerCase().includes("montecarlo")
        ));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="text-center text-white mt-8 text-lg font-semibold">
        ⏳ Caricamento grafico...
      </div>
    );

  // ✅ Fissa le giornate del campionato da 0 a 8 (inclusa giornata iniziale)
const giornate = Array.from({ length: 9 }, (_, i) => i);


  // palette colori casuale ma stabile per ogni squadra
  const colorForTeam = (s: string) => {
    if (s.toLowerCase().includes("montecarlo b")) return "#d62828";
    if (s.toLowerCase().includes("montecarlo")) return "#e63946";
    let hash = 0;
    for (let i = 0; i < s.length; i++)
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
    const color = `hsl(${hash % 360}, 70%, 45%)`;
    return color;
  };

  // dataset per il grafico
  const datasets = selezionate.map((s) => {
  // per ogni squadra creo i dati giornata 0 -> 8
  const punti = giornate.map((g) => {
    if (g === 0) return 0; // giornata iniziale: posizione 0
    const rec = records.find(
      (r) => r.squadra === s && r.giornata === g
    );
    return rec ? rec.posizione : null;
  });


    return {
      label: s,
      data: punti,
      borderColor: colorForTeam(s),
      backgroundColor: colorForTeam(s),
      tension: 0.3,
      pointRadius: 4,
      borderWidth: 2,
    };
  });

  const dataChart = {
    labels: giornate,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Andamento in Classifica",
        color: "#fff",
        font: { size: 18, weight: "bold" },
      },
      tooltip: {
        callbacks: {
          label: function (ctx: any) {
            return `${ctx.dataset.label}: ${ctx.parsed.y}ª posizione`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Giornata",
          color: "#fff",
        },
        ticks: { color: "#fff" },
        grid: { color: "rgba(255,255,255,0.1)" },
      },
      y: {
  title: {
    display: true,
    text: "Posizione",
    color: "#fff",
  },
  ticks: {
    color: "#fff",
    stepSize: 1,
    min: 0, // 👈 include lo 0 in classifica
    max: 9,
    reverse: true, // posizione 1 in alto
  },
  grid: { color: "rgba(255,255,255,0.1)" },
},


    },
  };

  const toggleSquadra = (s: string) => {
    setSelezionate((prev) =>
      prev.includes(s)
        ? prev.filter((x) => x !== s)
        : [...prev, s]
    );
  };

  return (
    <div className="container mx-auto px-2 py-4 text-center">
      <h2 className="text-white text-xl font-bold mb-4">
        📈 Andamento Posizioni in Classifica
      </h2>

      {/* Selettori squadre */}
      <div className="flex flex-wrap justify-center gap-3 mb-5">
        {squadre.map((s) => (
          <label
            key={s}
            className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer ${
              s.toLowerCase().includes("montecarlo")
                ? "bg-[#e63946]/30"
                : "bg-white/10"
            }`}
          >
            <input
              type="checkbox"
              checked={selezionate.includes(s)}
              onChange={() => toggleSquadra(s)}
              className="accent-[#e63946] cursor-pointer"
            />
            <span
              className={`text-sm font-medium ${
                s.toLowerCase().includes("montecarlo")
                  ? "text-[#e63946]"
                  : "text-white"
              }`}
            >
              {s}
            </span>
          </label>
        ))}
      </div>

      {/* Contenitore grafico */}
      <div className="bg-white/10 rounded-lg p-4" style={{ height: "400px" }}>
        <Line data={dataChart} options={options} />
      </div>
    </div>
  );
}
