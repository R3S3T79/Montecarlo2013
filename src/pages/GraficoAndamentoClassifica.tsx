// src/pages/GraficoAndamentoClassifica.tsx
// Data: 15/11/2025 — Rev4: nomi reali, stemmi, lista squadre a colonne, sfondo grafico più chiaro

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
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
  squadra: string; // NOME ORIGINALE
  posizione: number;
  logo_url?: string | null;
}

export default function GraficoAndamentoClassifica() {
  const [records, setRecords] = useState<RecordClassifica[]>([]);
  const [squadre, setSquadre] = useState<RecordClassifica[]>([]);
  const [selezionate, setSelezionate] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // 🔥 CARICA RECORD E LOGHI DELLE SQUADRE
  // =====================================================
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1️⃣ Carica andamento classifica
      const { data, error } = await supabase
        .from("v_andamento_classifica")
        .select("giornata, squadra, posizione")
        .order("giornata", { ascending: true });

      if (error) {
        console.error("❌ Errore caricamento dati:", error);
        setLoading(false);
        return;
      }

      // Rimuove RIPOSO dalle squadre
const andamento = (data || []).filter(
  (r) => r.squadra.toLowerCase() !== "riposo"
);


      // 2️⃣ Carica loghi squadre (ORA include anche alias!)
const { data: squadreDb } = await supabase
  .from("squadre")
  .select("nome, alias, logo_url");

// usa nomi normalizzati per trovare i loghi
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const conLogo = andamento.map((r) => {
  const nomeNorm = normalize(r.squadra);

  const match = squadreDb?.find(
    (sq) =>
      normalize(sq.nome) === nomeNorm ||
      normalize(sq.alias || "") === nomeNorm
  );

  return {
    ...r,
    logo_url: match?.logo_url || null,
  };
});


      setRecords(conLogo);

      const squadreUniche = Array.from(
  new Map(
    conLogo
      .filter((r) => r.squadra.toLowerCase() !== "riposo") // 👈 FILTRO QUI
      .map((r) => [
        r.squadra,
        { squadra: r.squadra, logo_url: r.logo_url }
      ])
  ).values()
).sort((a, b) => a.squadra.localeCompare(b.squadra));



      setSquadre(squadreUniche);

      // preseleziona Montecarlo
      setSelezionate(
        squadreUniche
          .filter((s) => s.squadra.toLowerCase().includes("montecarlo"))
          .map((s) => s.squadra)
      );

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

  // =====================================================
  // 🔢 DINAMICO: giornate & posizioni
  // =====================================================
  const numeroSquadre = squadre.length;
  const numeroGiornate = numeroSquadre - 1;
  const maxPosizione = numeroSquadre - 1;

  const giornate = Array.from({ length: numeroGiornate + 1 }, (_, i) => i);

  // =====================================================
  // 🎨 COLORI SQUADRE
  // =====================================================
  const colorForTeam = (s: string) => {
    if (s.toLowerCase().includes("montecarlo b")) return "#d62828";
    if (s.toLowerCase().includes("montecarlo")) return "#e63946";

    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${hash % 360}, 70%, 35%)`;
  };

  // =====================================================
  // 🔥 GENERAZIONE LINEE (gestione riposi)
  // =====================================================
  const datasets = selezionate.map((nomeSquadra) => {
    let ultimaPosizione = 0;

    const punti = giornate.map((g) => {
      if (g === 0) return 0;

      const rec = records.find(
        (r) => r.squadra === nomeSquadra && r.giornata === g
      );

      if (rec) {
        ultimaPosizione = rec.posizione;
        return rec.posizione;
      }

      return ultimaPosizione;
    });

    return {
      label: nomeSquadra,
      data: punti,
      borderColor: colorForTeam(nomeSquadra),
      backgroundColor: colorForTeam(nomeSquadra),
      tension: 0.35,
      pointRadius: 4,
      borderWidth: 2,
    };
  });

  const dataChart = {
    labels: giornate,
    datasets,
  };

  // =====================================================
  // 📊 OPZIONI GRAFICO — SFONDO PIÙ LEGGERO
  // =====================================================
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Andamento in Classifica",
        color: "#fff",
        font: { size: 20, weight: "bold" },
      },
    },
    scales: {
      x: {
        ticks: { color: "#fff" },
        title: { display: true, text: "Giornata", color: "#fff" },
        grid: { color: "rgba(255,255,255,0.25)" },
      },
      y: {
        ticks: { color: "#fff", stepSize: 1, min: 0, max: maxPosizione, reverse: true },
        title: { display: true, text: "Posizione", color: "#fff" },
        grid: { color: "rgba(255,255,255,0.25)" },
      },
    },
  };

  // =====================================================
  // ✔️ TOGGLE SQUADRE
  // =====================================================
  const toggleSquadra = (nome: string) => {
    setSelezionate((prev) =>
      prev.includes(nome)
        ? prev.filter((x) => x !== nome)
        : [...prev, nome]
    );
  };

  // =====================================================
  // 🖼️ UI — LOGHI + Due Colonne + Sfondo Lista
  // =====================================================
  return (
    <div className="container mx-auto px-2 py-4 text-center">
      <h2 className="text-white text-xl font-bold mb-4">
        📈 Andamento Posizioni in Classifica
      </h2>

      {/* Lista squadre a colonne */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 mx-auto max-w-lg">
        {squadre.map((sq) => (
          <label
            key={sq.squadra}
            className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/10 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selezionate.includes(sq.squadra)}
              onChange={() => toggleSquadra(sq.squadra)}
              className="accent-[#e63946] cursor-pointer"
            />

            {/* Logo squadra */}
            {sq.logo_url ? (
              <img
                src={sq.logo_url}
                alt={sq.squadra}
                className="w-6 h-6 rounded-full object-contain bg-white border border-gray-300"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 border border-gray-500" />
            )}

            <span className="text-sm text-white font-medium">{sq.squadra}</span>
          </label>
        ))}
      </div>

      {/* Contenitore grafico con sfondo più chiaro */}
      <div
        className="rounded-lg p-4"
        style={{
          height: "420px",
          background: "rgba(255,255,255,0.40)",
backdropFilter: "blur(6px)",
        }}
      >
        <Line data={dataChart} options={options} />
      </div>
    </div>
  );
}
