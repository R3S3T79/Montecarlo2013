// src/pages/Convocazioni.tsx
// Data creazione: 04/09/2025 (rev: export con html2canvas + fix centratura "ORA")

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import html2canvas from "html2canvas";

interface Squadra {
  id: string;
  nome: string;
}

interface Giocatore {
  id: string;
  nome: string;
  cognome: string;
}

export default function Convocazioni() {
  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [squadraAvversaria, setSquadraAvversaria] = useState<string>("");
  const [competizione, setCompetizione] = useState<string>("Campionato");
  const [nomeTorneo, setNomeTorneo] = useState<string>("");
  const [data, setData] = useState("");
  const [oraPartita, setOraPartita] = useState("");
  const [ritrovoLuogo, setRitrovoLuogo] = useState("Campo di Montecarlo");
  const [oraRitrovo, setOraRitrovo] = useState("");
  const [convocati, setConvocati] = useState<Record<string, boolean>>({});

  const allenatore = "Cesaretti Stefano";
  const collaboratore = "Mazzoni Cristiano";
  const accompagnatori = ["Cervetti Marco", "Marotta Simone", "Miressi Marco"].sort();

  // Carica squadre (escludendo Montecarlo)
  useEffect(() => {
    const fetchSquadre = async () => {
      const { data, error } = await supabase
        .from("squadre")
        .select("id, nome")
        .order("nome", { ascending: true });

      if (!error && data) {
        setSquadre(data.filter((s) => s.id !== "a16a8645-9f86-41d9-a81f-a92931f1cc67"));
      }
    };
    fetchSquadre();
  }, []);

  // Carica giocatori stagione attuale
  useEffect(() => {
    const fetchGiocatori = async () => {
      const { data: stagione } = await supabase
        .from("stagioni")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (stagione?.id) {
        const { data, error } = await supabase
          .from("giocatori_stagioni")
          .select("id, nome, cognome")
          .eq("stagione_id", stagione.id);

        if (!error && data) {
          const ordinati = [...data].sort((a, b) => a.cognome.localeCompare(b.cognome));
          setGiocatori(ordinati);
          setConvocati(Object.fromEntries(ordinati.map((g) => [g.id, false]))); // tutti deselezionati
        }
      }
    };
    fetchGiocatori();
  }, []);

  // Calcola ora ritrovo un'ora prima
  useEffect(() => {
    if (oraPartita && !oraRitrovo) {
      const [h, m] = oraPartita.split(":").map(Number);
      const date = new Date();
      date.setHours(h, m);
      date.setHours(date.getHours() - 1);
      const hh = String(date.getHours()).padStart(2, "0");
      const mm = String(date.getMinutes()).padStart(2, "0");
      setOraRitrovo(`${hh}:${mm}`);
    }
  }, [oraPartita, oraRitrovo]);

  const formattaData = (input: string) => {
    if (!input) return "";
    const d = new Date(input);
    const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
    const g = giorni[d.getDay()];
    const gg = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const aa = String(d.getFullYear()).slice(-2);
    return `${g} ${gg}/${mm}/${aa}`;
  };

  const handleCheckbox = (id: string) => {
    setConvocati((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    const allSelected = Object.values(convocati).every((v) => v);
    const updated = Object.fromEntries(giocatori.map((g) => [g.id, !allSelected]));
    setConvocati(updated);
  };

  const handleShareWhatsapp = async () => {
  const node = document.getElementById("convocazione");
  if (node) {
    try {
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
      const dataUrl = canvas.toDataURL("image/png");

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "convocazione.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Convocazione Montecarlo 2013",
          text: "Ecco la convocazione della prossima partita ⚽",
          files: [file],
        });
      } else {
        alert("Condivisione diretta non supportata. Salva e invia manualmente su WhatsApp.");
      }
    } catch (err) {
      console.error("Errore screenshot:", err);
    }
  }
};


  return (
    <div className="p-6">
      {/* ===== FORM A SCHERMO ===== */}
      <div className="space-y-4 print:hidden">
        {/* Selezioni */}
        <div className="bg-white/90 rounded shadow p-4 m-2 space-y-4">
          <label className="block font-bold">Squadra avversaria:</label>
          <select value={squadraAvversaria} onChange={(e) => setSquadraAvversaria(e.target.value)} className="border p-2 w-full">
            <option value="">-- Seleziona --</option>
            {squadre.map((s) => (
              <option key={s.id} value={s.nome}>{s.nome}</option>
            ))}
          </select>

          <label className="block font-bold">Competizione:</label>
          <select value={competizione} onChange={(e) => setCompetizione(e.target.value)} className="border p-2 w-full">
            <option value="Campionato">Campionato</option>
            <option value="Torneo">Torneo</option>
            <option value="Amichevole">Amichevole</option>
          </select>

          <label className="block font-bold">Nome torneo / giornata:</label>
          <input type="text" value={nomeTorneo} onChange={(e) => setNomeTorneo(e.target.value)} className="border p-2 w-full" />

          <label className="block font-bold">Data partita:</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="border p-2 w-full" />

          <label className="block font-bold">Ora partita:</label>
          <input type="time" value={oraPartita} onChange={(e) => setOraPartita(e.target.value)} className="border p-2 w-full" />

          <label className="block font-bold">Ritrovo:</label>
          <input type="text" value={ritrovoLuogo} onChange={(e) => setRitrovoLuogo(e.target.value)} className="border p-2 w-full" />

          <label className="block font-bold">Ora ritrovo:</label>
          <input type="time" value={oraRitrovo} onChange={(e) => setOraRitrovo(e.target.value)} className="border p-2 w-full" />
        </div>

        {/* Giocatori */}
        <div className="bg-white/90 rounded shadow p-4 m-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block font-bold text-lg">Giocatori:</label>
            <button
              onClick={toggleAll}
              className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
            >
              Seleziona/Deseleziona tutti
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {giocatori.map((g) => (
              <li key={g.id} className="flex items-center space-x-2">
                <input type="checkbox" checked={convocati[g.id]} onChange={() => handleCheckbox(g.id)} />
                <label onClick={() => handleCheckbox(g.id)} className="cursor-pointer">
                  {g.cognome.toUpperCase()} {g.nome}
                </label>
              </li>
            ))}
          </ul>
        </div>

        <button onClick={handleShareWhatsapp} className="bg-green-600 text-white px-4 py-2 rounded mt-4">
          Condividi su WhatsApp
        </button>
      </div>

      {/* ===== LAYOUT EXPORT (screenshot) ===== */}
      <div id="convocazione" className="bg-white font-serif text-[14pt] p-6">
        {/* Header loghi */}
        <div className="convocazioni-header">
          <img src="/Montecarlos.png" alt="logo Montecarlo" className="logo-montecarlo" />
          <div className="logo-genoa-wrapper text-center">
            <img src="/genoa.png" alt="logo Genoa" className="logo-genoa" />
            <div>SCUOLA CALCIO AFFILIATA</div>
          </div>
        </div>

        {/* Dati partita (tabella) */}
        <table className="tabella-dati">
          <tbody>
            <tr>
  <td>
  <span className="font-bold">PARTITA VS.</span>
  <span className="campo-compilato campo-medio">{squadraAvversaria}</span>
</td>

<td>
  <span className="font-bold">DATA</span>
  <span className="campo-compilato campo-corto">{formattaData(data)}</span>
</td>

<td>
  <span className="font-bold">ORA</span>
  <span className="campo-compilato campo-corto">{oraPartita}</span>
</td>

</tr>
          <tr>
  {/* Prima cella a sx */}
<td colSpan={1}>
  <span className="font-bold">RITROVO</span>
  <span className="campo-compilato campo-lungo">{ritrovoLuogo}</span>
</td>
<tr>
  <td>
    <span className="font-bold">ORA</span>
    <span className="campo-compilato campo-corto">{oraRitrovo}</span>
  </td>
</tr>
</tbody>
</table>

{/* Convocati */}
<div className="convocati-list">
  <strong>CONVOCATI:</strong>
  <ul className="mt-3">
    {giocatori.map((g) => (
      <li key={g.id} className={convocati[g.id] ? "" : "line-through"}>
        <span>{g.cognome.toUpperCase()} {g.nome}</span>
      </li>
    ))}
  </ul>
</div>

<div className="competizione-box mt-2 export-only text-center">
  <div className="font-bold">{competizione}</div>
  <div className="mt-4">{nomeTorneo}</div>
</div>

{/* Staff */}
<div className="convocazioni-section">
  <div><strong>ALLENATORE:</strong> {allenatore}</div>
  <div><strong>COLLABORATORE:</strong> {collaboratore}</div>
  <div><strong>ACCOMPAGNATORI:</strong> {accompagnatori.join(", ")}</div>
</div>

{/* Footer */}
<div className="convocazioni-footer">
  ASSOCIAZIONE SPORTIVA DILETTANTISTICA MONTECARLO <br />
  Via Provinciale di Montecarlo, 32 – 55015 Montecarlo (LU) <br />
  P.I. e C.F.: 02091460465 – Mail asdmontecarlo@gmail.com – Matricola LND 947185
</div>

