// src/components/GestioneRisultatoPartita.tsx

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

interface SquadraInfo {
  id: string;
  nome: string;
  logo_url?: string;
}

interface PartitaPropria {
  id: string;
  data_ora: string;
  casa: SquadraInfo;
  ospite: SquadraInfo;
}

interface Giocatore {
  id: string;
  nome: string;
  cognome: string;
}

interface MarcatoreRecord {
  giocatore_id: string;
  periodo: number;
  partita_id: string;
}

interface PresenzaRecord {
  partita_id: string;
  giocatore_id: string;
}

export default function GestioneRisultatoPartita({
  partita,
}: {
  partita: PartitaPropria;
}) {
  const navigate = useNavigate();
  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [showFormazione, setShowFormazione] = useState(false);
  const [formazioneCasa, setFormazioneCasa] = useState<string[]>([]);
  const [goalCasa, setGoalCasa] = useState([0, 0, 0, 0]);
  const [goalOspite, setGoalOspite] = useState([0, 0, 0, 0]);
  const [marcatori, setMarcatori] = useState<{ [tempo: number]: (string | null)[] }>({});
  const [tempiVisible, setTempiVisible] = useState([false, false, false, false]);
  const [submitting, setSubmitting] = useState(false);

  // Stati per il countdown personalizzabile (default 20 minuti)
  const [inputMinutes, setInputMinutes] = useState<number>(20);
  const [countdownSec, setCountdownSec] = useState<number>(20 * 60);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Carica tutti i giocatori
  useEffect(() => {
    const fetchGiocatori = async () => {
      const { data, error } = await supabase
        .from("giocatori")
        .select("id, nome, cognome")
        .order("cognome", { ascending: true });
      if (!error && data) {
        setGiocatori(data);
        // inizializza marcatori per ogni periodo
        const init: { [tempo: number]: (string | null)[] } = {};
        [1, 2, 3, 4].forEach((q) => {
          init[q] = [];
        });
        setMarcatori(init);
      }
    };
    fetchGiocatori();
  }, []);

  // Gestione countdown: decrementa ogni secondo se attivo
  useEffect(() => {
    if (timerActive && countdownSec > 0) {
      timerRef.current = setTimeout(() => {
        setCountdownSec((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerActive, countdownSec]);

  // Toggle Start/Pausa
  const toggleTimer = () => {
    if (timerActive) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setTimerActive(false);
    } else {
      const total = countdownSec > 0 ? countdownSec : inputMinutes * 60;
      setCountdownSec(total);
      setTimerActive(true);
    }
  };

  const resetCountdown = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimerActive(false);
    setCountdownSec(inputMinutes * 60);
  };

  // Formatta i secondi in mm:ss
  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const mm = m.toString().padStart(2, "0");
    const ss = s.toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Dati per il cerchio SVG
  const totalSeconds = inputMinutes * 60;
  const radius = 40;
  const stroke = 4;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const fraction = countdownSec / totalSeconds;
  const strokeDashoffset = circumference - fraction * circumference;

  // Format data italiana
  const formatData = (data: string) =>
    new Date(data).toLocaleDateString("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  // Totali parziali
  const totaleCasa = goalCasa.reduce((sum, v) => sum + v, 0);
  const totaleOspite = goalOspite.reduce((sum, v) => sum + v, 0);

  // Submit del form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const totCasa = goalCasa.reduce((sum, v) => sum + v, 0);
      const totOsp = goalOspite.reduce((sum, v) => sum + v, 0);

      // aggiorna partita
      const { error: errPartita } = await supabase
        .from("partite")
        .update({
          stato: "Giocata",
          goal_a: totCasa,
          goal_b: totOsp,
          goal_a1: goalCasa[0],
          goal_a2: goalCasa[1],
          goal_a3: goalCasa[2],
          goal_a4: goalCasa[3],
          goal_b1: goalOspite[0],
          goal_b2: goalOspite[1],
          goal_b3: goalOspite[2],
          goal_b4: goalOspite[3],
        })
        .eq("id", partita.id);
      if (errPartita) throw errPartita;

      // presenze
      const presArr: PresenzaRecord[] = formazioneCasa.map((pid) => ({
        partita_id: partita.id,
        giocatore_id: pid,
      }));
      if (presArr.length > 0) {
        const { error: errPres } = await supabase
          .from("presenze")
          .upsert(presArr, { onConflict: ["partita_id", "giocatore_id"] });
        if (errPres) throw errPres;
      }

      // marcatori
      const marcArr: MarcatoreRecord[] = Object.entries(marcatori).flatMap(
        ([tempoStr, lista]) => {
          const tempo = parseInt(tempoStr);
          return lista
            .filter((pid) => pid)
            .map((pid) => ({
              periodo: tempo,
              giocatore_id: pid!,
              partita_id: partita.id,
            }));
        }
      );
      if (marcArr.length > 0) {
        const { error: errMarc } = await supabase
          .from("marcatori")
          .insert(marcArr);
        if (errMarc) throw errMarc;
      }

      alert("Risultato, presenze e marcatori salvati con successo!");
      // redireziona a ProssimaPartita
      navigate("/prossima-partita");
    } catch (err: any) {
      console.error("Errore:", err.message);
      alert("Si è verificato un errore.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1) Data */}
      <div className="text-center">
        <span className="text-lg font-bold">
          {formatData(partita.data_ora)}
        </span>
      </div>

      {/* TIMER CIRCOLARE */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90"
          >
            <circle
              stroke="#e5e7eb"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke={timerActive ? "#f87171" : "#34d399"}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset }}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="transition-stroke-dashoffset duration-500 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-lg text-gray-800">
              {formatCountdown(countdownSec)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-3">
          <button
            type="button"
            onClick={toggleTimer}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${
              timerActive ? "bg-yellow-500" : "bg-green-600"
            }`}
          >
            {timerActive ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3l14 9-14 9V3z"
                />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={resetCountdown}
            disabled={!timerActive && countdownSec === inputMinutes * 60}
            className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 20v-6h-6" />
            </svg>
          </button>

          {!timerActive && (
            <input
              type="number"
              min={0}
              max={999}
              value={inputMinutes}
              onChange={(e) => {
                const val = Number(e.target.value);
                setInputMinutes(val >= 0 ? val : 0);
                setCountdownSec(val * 60);
              }}
              className="w-8 h-6 text-center text-sm border border-gray-300 rounded focus:outline-none"
            />
          )}
        </div>
      </div>

      <hr className="border-t border-gray-300 my-4" />

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setShowFormazione((prev) => !prev)}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded"
        >
          {showFormazione ? "Nascondi Formazione" : "Formazione"}
        </button>
      </div>

      <div className="flex justify-between w-full space-x-2">
        {[0, 1, 2, 3].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              if (tempiVisible[t]) {
                setTempiVisible([false, false, false, false]);
              } else {
                const v = [false, false, false, false];
                v[t] = true;
                setTempiVisible(v);
              }
            }}
            className={`flex-1 py-2 rounded ${
              tempiVisible[t] ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {t + 1}° T
          </button>
        ))}
      </div>

      {showFormazione && (
        <div className="mt-4 border p-4 rounded bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Formazione Casa</h3>
            <button
              type="button"
              onClick={() => setShowFormazione(false)}
              className="text-gray-600"
            >
              Chiudi
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {giocatori.map((g) => (
              <label key={g.id} className="flex items-center mb-1">
                <input
                  type="checkbox"
                  checked={formazioneCasa.includes(g.id)}
                  onChange={(e) =>
                    setFormazioneCasa((prev) =>
                      e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                    )
                  }
                  className="mr-2"
                />
                <span>
                  {g.cognome} {g.nome}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {([0, 1, 2, 3] as const).map((t) =>
        tempiVisible[t] ? (
          <div key={t} className="border-t pt-4">
            <h3 className="font-semibold mb-3">{t + 1}° T</h3>

            {/* CASA */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                {partita.casa.logo_url && (
                  <img
                    src={partita.casa.logo_url}
                    alt={`${partita.casa.nome} logo`}
                    className="w-6 h-6 object-contain"
                  />
                )}
                <span className="font-medium">{partita.casa.nome}</span>
                <span className="text-sm text-gray-500">({totaleCasa})</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setGoalCasa((prev) =>
                      prev.map((v, i) => (i === t ? Math.max(0, v - 1) : v))
                    );
                    setMarcatori((prev) => {
                      const lista = [...(prev[t + 1] || [])];
                      lista.pop();
                      return { ...prev, [t + 1]: lista };
                    });
                  }}
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  −
                </button>
                <span className="w-6 text-center">{goalCasa[t]}</span>
                <button
                  type="button"
                  onClick={() => {
                    setGoalCasa((prev) =>
                      prev.map((v, i) => (i === t ? v + 1 : v))
                    );
                    setMarcatori((prev) => {
                      const lista = [...(prev[t + 1] || [])];
                      lista.push(null);
                      return { ...prev, [t + 1]: lista };
                    });
                  }}
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  ＋
                </button>
              </div>
            </div>

            {/* SELEZIONE MARCATORI */}
            <div className="mb-4">
              {(marcatori[t + 1] || []).map((pid, idx) => (
                <select
                  key={idx}
                  value={pid || ""}
                  onChange={(e) =>
                    setMarcatori((prev) => {
                      const lista = [...(prev[t + 1] || [])];
                      lista[idx] = e.target.value;
                      return { ...prev, [t + 1]: lista };
                    })
                  }
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">-- Seleziona marcatore --</option>
                  {giocatori
                    .filter((g) => formazioneCasa.includes(g.id))
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.cognome} {g.nome}
                      </option>
                    ))}
                </select>
              ))}
            </div>

            {/* OSPITE */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                {partita.ospite.logo_url && (
                  <img
                    src={partita.ospite.logo_url}
                    alt={`${partita.ospite.nome} logo`}
                    className="w-6 h-6 object-contain"
                  />
                )}
                <span className="font-medium">{partita.ospite.nome}</span>
                <span className="text-sm text-gray-500">({totaleOspite})</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() =>
                    setGoalOspite((prev) =>
                      prev.map((v, i) => (i === t ? Math.max(0, v - 1) : v))
                    )
                  }
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  −
                </button>
                <span className="w-6 text-center">{goalOspite[t]}</span>
                <button
                  type="button"
                  onClick={() =>
                    setGoalOspite((prev) =>
                      prev.map((v, i) => (i === t ? v + 1 : v))
                    )
                  }
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  ＋
                </button>
              </div>
            </div>
          </div>
        ) : null
      )}

      {/* Salva */}
      <div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Salvataggio…" : "Salva risultato"}
        </button>
      </div>
    </form>
  );
}
