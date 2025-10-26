// src/pages/Convocazioni.tsx
// Data creazione: 11/09/2025 (rev: gestione torneo multi-avversarie + input più visibili)

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
  const [squadreAvversarie, setSquadreAvversarie] = useState<string[]>([""]);
  const [numPartite, setNumPartite] = useState<number>(1);
  const [competizione, setCompetizione] = useState<string>("Campionato");
  const [nomeTorneo, setNomeTorneo] = useState<string>("");
  const [data, setData] = useState("");
  const [oraPartita, setOraPartita] = useState("");
  const [ritrovoLuogo, setRitrovoLuogo] = useState("");
  const [oraRitrovo, setOraRitrovo] = useState("");
  const [convocati, setConvocati] = useState<string[]>([]);
  const [partitaId, setPartitaId] = useState<string | null>(null);
  const [partite, setPartite] = useState<any[]>([]);
  const MONTECARLO_ID = "a16a8645-9f86-41d9-a81f-a92931f1cc67";
  const [partiteSelezionate, setPartiteSelezionate] = useState<any[]>([]);



  const allenatore = "Cesaretti Stefano";
  const collaboratore = "Mazzoni Cristiano";
  const accompagnatori = ["Cervetti Marco", "Marotta Simone", "Miressi Marco"].sort();

  const togglePartita = (p: any) => {
  setPartiteSelezionate((prev) => {
    const exists = prev.find((x) => x.id === p.id);
    if (exists) {
      return prev.filter((x) => x.id !== p.id);
    } else {
      return [...prev, p];
    }
  });
};


  useEffect(() => {
  const fetchPartite = async () => {
    const { data, error } = await supabase
      .from("partite")
      .select(`
        id,
        data_ora,
        campionato_torneo,
        nome_torneo,
        stato,
        squadra_casa:squadra_casa_id ( id, nome ),
        squadra_ospite:squadra_ospite_id ( id, nome )
      `)
      .eq("stato", "DaGiocare")
      .order("data_ora", { ascending: true });

    if (!error && data) {
      setPartite(data);
    } else {
      console.error("Errore fetch partite:", error);
    }
  };

  fetchPartite();
}, []);



  // Carica squadre (escludendo Montecarlo)
  useEffect(() => {
    const fetchSquadre = async () => {
      const { data, error } = await supabase
        .from("squadre")
.select("id, nome")
.eq("visibile", true)   // 👈 mostra solo le squadre attive
.order("nome", { ascending: true });


      if (!error && data) {
        setSquadre(data.filter((s) => s.id !== "a16a8645-9f86-41d9-a81f-a92931f1cc67"));
      }
    };
    fetchSquadre();
  }, []);

  // Carica giocatori stagione attuale + presenze della partita
useEffect(() => {
  const fetchGiocatori = async () => {
    // stagione corrente
    const { data: stagione } = await supabase
      .from("stagioni")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!stagione?.id) return;

    // giocatori stagione
    const { data: giocatoriStagione, error: errGioc } = await supabase
      .from("giocatori_stagioni")
      .select("id, nome, cognome")
      .eq("stagione_id", stagione.id);

    if (errGioc) {
      console.error("Errore caricamento giocatori:", errGioc.message);
      return;
    }

    const ordinati = (giocatoriStagione || []).sort((a, b) =>
      (a.cognome || "").localeCompare(b.cognome || "")
    );
    setGiocatori(ordinati);
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
  if (convocati.length === giocatori.length) {
    setConvocati([]); // deseleziona tutti
  } else {
    setConvocati(giocatori.map((g) => g.id)); // seleziona tutti
  }
};


  const handleShareWhatsapp = async () => {
  if (!partitaId && partiteSelezionate.length === 0) {
    alert("Seleziona almeno una partita prima di condividere.");
    return;
  }

  try {
    // recupera stagione attuale
    const { data: stagione } = await supabase
      .from("stagioni")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!stagione?.id) {
      alert("Nessuna stagione trovata.");
      return;
    }

    // lista partite da salvare
    const partiteTarget = partiteSelezionate.length > 0
      ? partiteSelezionate
      : [{ id: partitaId }];

    // crea record per i convocati selezionati
    const records = [];
    for (const p of partiteTarget) {
  for (const gid of convocati) {
    records.push({
      partita_id: p.id,
      giocatore_stagione_id: gid,
      stagione_id: stagione.id,
      titolare: false, // sempre false in convocazioni
    });
  }
}

    if (records.length > 0) {
      const { error } = await supabase.from("presenze").insert(records);
      if (error) {
        console.error("Errore salvataggio presenze:", error);
        alert("Errore nel salvataggio dei convocati.");
        return;
      }
    }

    // ====== Dopo il salvataggio, procedi con la condivisione ======
    const node = document.getElementById("convocazione");
    if (node) {
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
    }

     // 🔹 Ripulisci tutti i campi dopo l'invio
    setCompetizione("Campionato");
    setNomeTorneo("");
    setData("");
    setOraPartita("");
    setRitrovoLuogo("");
    setOraRitrovo("");
    setSquadraAvversaria("");
    setSquadreAvversarie([""]);
    setConvocati([]);
    setPartiteSelezionate([]);
    setPartitaId(null);

  } catch (err) {
    console.error("Errore screenshot o salvataggio:", err);
  }
};


  const handleNumPartiteChange = (val: number) => {
    setNumPartite(val);
    setSquadreAvversarie(Array(val).fill(""));
  };

  const handleSquadraChange = (index: number, value: string) => {
    setSquadreAvversarie((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

 

  return (
   <div className="w-full px-[2px] pt-6 pb-6 box-border">
      {/* ===== FORM A SCHERMO ===== */}
      <div className="space-y-4 print:hidden">
        <div className="bg-white/90 rounded shadow p-4 m-2 space-y-4">
         {/* Pulsante selezione partita */}
<div className="mb-4">
  <button
    onClick={() => document.getElementById("modal-partite")?.classList.remove("hidden")}
    className="bg-blue-600 text-white px-3 py-2 rounded"
  >
    Seleziona partita
  </button>
</div>
          {/* Competizione */}
          <label className="block font-bold">Competizione:</label>
          <select
            value={competizione}
            onChange={(e) => {
              setCompetizione(e.target.value);
              if (e.target.value !== "Torneo") {
                setNumPartite(1);
                setSquadreAvversarie([""]);
              }
            }}
            className="border-2 border-gray-700 p-3 w-full bg-white text-lg rounded"
          >
            <option value="Campionato">Campionato</option>
            <option value="Torneo">Torneo</option>
            <option value="Amichevole">Amichevole</option>
          </select>

          {/* Se Torneo → numero partite + squadre multiple */}
          {competizione === "Torneo" && (
            <div>
              <label className="block font-bold mt-2">Numero partite:</label>
<input
  type="number"
  min={1}
  value={numPartite}
  onChange={(e) => handleNumPartiteChange(Number(e.target.value))}
  onFocus={(e) => e.target.select()}   // <-- aggiunto
  className="border-2 border-gray-700 p-3 w-full bg-white text-lg rounded"
/>

              {Array.from({ length: numPartite }).map((_, i) => (
                <div key={i} className="mt-2">
                  <label className="block font-bold">Squadra avversaria {i + 1}:</label>
                  <select
                    value={squadreAvversarie[i] || ""}
                    onChange={(e) => handleSquadraChange(i, e.target.value)}
                    className="border-2 border-gray-700 p-3 w-full bg-white text-lg rounded"
                  >
                    <option value="">-- Seleziona --</option>
                    {squadre.map((s) => (
                      <option key={s.id} value={s.nome}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Se NON è torneo → singola squadra */}
          {competizione !== "Torneo" && (
            <>
              <label className="block font-bold">Squadra avversaria:</label>
              <select
                value={squadraAvversaria}
                onChange={(e) => setSquadraAvversaria(e.target.value)}
                className="border-2 border-gray-700 p-3 w-full bg-white text-lg rounded"
              >
                <option value="">-- Seleziona --</option>
                {squadre.map((s) => (
                  <option key={s.id} value={s.nome}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Nome torneo */}
          <label className="block font-bold">Nome torneo / giornata:</label>
          <input
            type="text"
            value={nomeTorneo}
            onChange={(e) => setNomeTorneo(e.target.value)}
            className="border-2 border-gray-700 p-3 w-full bg-white text-lg rounded"
          />

          {/* Data e ora partita */}
          <label className="block font-bold">Data partita:</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="border-2 border-gray-700 p-3 w-full bg-white text-lg rounded"
          />

          <label className="block font-bold">Ora partita:</label>
          <input
            type="time"
            value={oraPartita}
            onChange={(e) => setOraPartita(e.target.value)}
            className="border-2 border-gray-700 p-3 w-full bg-white text-lg rounded"
          />

          {/* Ritrovo */}
          <label className="block font-bold">Ritrovo:</label>
          <input
            type="text"
            value={ritrovoLuogo}
            onChange={(e) => setRitrovoLuogo(e.target.value)}
            className="border-2 border-gray-700 p-3 w-full bg-white text-lg rounded"
          />

          <label className="block font-bold">Ora ritrovo:</label>
          <input
            type="time"
            value={oraRitrovo}
            onChange={(e) => setOraRitrovo(e.target.value)}
            className="border-2 border-gray-700 p-3 w-full bg-white text-lg rounded"
          />
        </div>

        {/* Giocatori */}
        <div className="bg-white/90 rounded shadow p-4 m-2">
          <div className="flex items-center justify-between mb-2">
            
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
                <input
                  type="checkbox"
                  checked={convocati.includes(g.id)}
                  onChange={() => {
                    if (convocati.includes(g.id)) {
                      setConvocati((prev) => prev.filter((x) => x !== g.id));
                    } else {
                      setConvocati((prev) => [...prev, g.id]);
                    }
                  }}
                />
                <label
                  onClick={() => {
                    if (convocati.includes(g.id)) {
                      setConvocati((prev) => prev.filter((x) => x !== g.id));
                    } else {
                      setConvocati((prev) => [...prev, g.id]);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {g.cognome.toUpperCase()} {g.nome}
                </label>
              </li>
            ))}
          </ul>
        </div>


        <button
          onClick={handleShareWhatsapp}
          className="bg-green-600 text-white px-4 py-2 rounded mt-4"
        >
          Condividi su WhatsApp
        </button>
      </div>

      <div id="modal-partite" className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white p-4 rounded shadow max-w-md w-full mx-4">
    <h2 className="text-lg font-bold mb-2">Scegli partita</h2>

    <ul className="divide-y px-2">
      {partite.map((p) => {
        const selected = partiteSelezionate.find((x) => x.id === p.id);
        return (
          <li
            key={p.id}
            className={`py-2 cursor-pointer px-2 rounded ${
              selected ? "bg-blue-100 font-semibold" : "hover:bg-gray-100"
            }`}
            onClick={() => togglePartita(p)}
          >
            <div>
              {new Date(p.data_ora).toLocaleDateString("it-IT", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              })}{" "}
              - {p.campionato_torneo}
            </div>
            <div className="text-sm text-gray-600">
              {p.squadra_casa?.nome} vs {p.squadra_ospite?.nome}
            </div>
          </li>
        );
      })}
    </ul>

    <div className="flex justify-end space-x-2 mt-3">
      <button
        onClick={() => document.getElementById("modal-partite")?.classList.add("hidden")}
        className="bg-gray-300 px-3 py-1 rounded"
      >
        Chiudi
      </button>

      <button
        onClick={() => {
          if (partiteSelezionate.length === 1) {
            const p = partiteSelezionate[0];
            setPartitaId(p.id);
            setCompetizione(p.campionato_torneo || "Campionato");
            setNomeTorneo(p.nome_torneo || "");
            setData(p.data_ora.split("T")[0]);
            const date = new Date(p.data_ora);
const hh = String(date.getHours()).padStart(2, "0");
const mm = String(date.getMinutes()).padStart(2, "0");
setOraPartita(`${hh}:${mm}`);

            // avversaria
            if (p.squadra_casa?.id === MONTECARLO_ID) {
              setSquadraAvversaria(p.squadra_ospite?.nome || "");
            } else {
              setSquadraAvversaria(p.squadra_casa?.nome || "");
            }
          } else if (partiteSelezionate.length > 1) {
            setCompetizione("Torneo");
            setNumPartite(partiteSelezionate.length);
            setSquadreAvversarie(
              partiteSelezionate.map((p) => {
                if (p.squadra_casa?.id === MONTECARLO_ID) {
                  return p.squadra_ospite?.nome || "";
                } else {
                  return p.squadra_casa?.nome || "";
                }
              })
            );
            setNomeTorneo(partiteSelezionate[0].nome_torneo || "");
            setData(partiteSelezionate[0].data_ora.split("T")[0]);
            setOraPartita(new Date(partiteSelezionate[0].data_ora).toISOString().slice(11, 16));
          }

         
          document.getElementById("modal-partite")?.classList.add("hidden");
        }}
        className="bg-blue-600 text-white px-3 py-1 rounded"
      >
        Seleziona
      </button>
    </div>
  </div>
</div>





      {/* ===== LAYOUT EXPORT (screenshot) ===== */}
      <div id="convocazione" className="bg-white font-serif text-[14pt] p-6">
        {/* Header loghi */}
        <div className="convocazioni-header">
          <img src="/montecarlo.png" alt="logo Montecarlo" className="logo-montecarlo" />
          <div className="logo-genoa-wrapper text-center">
            <img src="/genoa.png" alt="logo Genoa" className="logo-genoa" />
            <div>SCUOLA CALCIO AFFILIATA</div>
          </div>
        </div>

        {/* Dati partita */}
        <table className="tabella-dati">
          <tbody>
            <tr>
              <td>
  <span>PARTITA VS.</span>
  <span className="campo-compilato campo-medio">
    {competizione === "Torneo" && squadreAvversarie.length > 1
      ? "—" // mostriamo solo un trattino se più squadre
      : (competizione === "Torneo" ? squadreAvversarie[0] : squadraAvversaria)}
  </span>
</td>
              <td>
  <span>DATA</span>
  <span className="campo-compilato campo-corto">{formattaData(data)}</span>
</td>
              <td>
                <span>ORA</span>
                <span className="campo-compilato campo-corto">{oraPartita}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span>RITROVO</span>
                <span className="campo-compilato campo-lungo">{ritrovoLuogo}</span>
              </td>
              <td>
                <span>ORA RITROVO</span>
                <span className="campo-compilato campo-corto">{oraRitrovo}</span>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* Convocati */}
        <div className="convocati-list">
          <strong>CONVOCATI:</strong>
          <ul className="mt-3">
            {giocatori.map((g) => (
              <li key={g.id} className={convocati.includes(g.id) ? "" : "line-through"}>
  <span>
    {g.cognome.toUpperCase()} {g.nome}
  </span>
</li>
            ))}
          </ul>
        </div>

        <div className="competizione-box mt-2 export-only text-center">
  <div className="font-bold text-xl uppercase">{competizione}</div>
  <div className="mt-4 text-lg uppercase">{nomeTorneo}</div>

  {competizione === "Torneo" && squadreAvversarie.length > 1 && (
    <div className="mt-2 text-sm">
      <ul className="list-none space-y-1">
        {squadreAvversarie.map((sq, i) => (
          <li key={i} className="uppercase">{sq}</li>
        ))}
      </ul>
    </div>
  )}
</div>


        {/* Staff */}
<div className="convocazioni-section">
  <div>
    <span>ALLENATORE:</span> {allenatore}
  </div>
  <div>
    <span>COLLABORATORE:</span> {collaboratore}
  </div>
  <div>
    <span>ACCOMPAGNATORI:</span> {accompagnatori.join(", ")}
  </div>
</div>

        {/* Footer */}
<div className="convocazioni-footer">
  <span style={{ color: '#e60000' }}>
    ASSOCIAZIONE SPORTIVA DILETTANTISTICA MONTECARLO
  </span>
  <br />
  Via Provinciale di Montecarlo, 32 – 55015 Montecarlo (LU) <br />
  P.I. e C.F.: 02091460465 – Mail asdmontecarlo@gmail.com – Matricola LND 947185
</div>
</div>
</div>

  );
}
