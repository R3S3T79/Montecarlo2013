// src/components/GestioneRisultatoPartita.tsx

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  Clock,
  ListChecks,
  Play,
  Pause,
  RotateCw,
  Save,
} from "lucide-react";

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

export default function GestioneRisultatoPartita() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [partita, setPartita] = useState<PartitaPropria | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [showFormazione, setShowFormazione] = useState(false);
  const [formazioneCasa, setFormazioneCasa] = useState<string[]>([]);
  const [goalCasa, setGoalCasa] = useState([0, 0, 0, 0]);
  const [goalOspite, setGoalOspite] = useState([0, 0, 0, 0]);
  const [marcatori, setMarcatori] = useState<{ [tempo: number]: (string | null)[] }>({});
  const [tempiVisible, setTempiVisible] = useState([false, false, false, false]);
  const [submitting, setSubmitting] = useState(false);

  const [inputMinutes, setInputMinutes] = useState(20);
  const [countdownSec, setCountdownSec] = useState(20 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Carica dati partita
  useEffect(() => {
    const fetchPartita = async () => {
      if (!id) {
        setError("ID non trovato");
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("partite")
          .select(`
            id, data_ora,
            goal_a1, goal_a2, goal_a3, goal_a4,
            goal_b1, goal_b2, goal_b3, goal_b4,
            squadra_casa:squadra_casa_id(id,nome,logo_url),
            squadra_ospite:squadra_ospite_id(id,nome,logo_url)
          `)
          .eq("id", id)
          .single();
        if (error) throw error;
        if (!data) {
          setError("Partita non trovata");
          setLoading(false);
          return;
        }
        setPartita({
          id: data.id,
          data_ora: data.data_ora,
          casa: {
            id: data.squadra_casa.id,
            nome: data.squadra_casa.nome,
            logo_url: data.squadra_casa.logo_url,
          },
          ospite: {
            id: data.squadra_ospite.id,
            nome: data.squadra_ospite.nome,
            logo_url: data.squadra_ospite.logo_url,
          },
        });
        setGoalCasa([
          data.goal_a1 || 0,
          data.goal_a2 || 0,
          data.goal_a3 || 0,
          data.goal_a4 || 0,
        ]);
        setGoalOspite([
          data.goal_b1 || 0,
          data.goal_b2 || 0,
          data.goal_b3 || 0,
          data.goal_b4 || 0,
        ]);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Errore caricamento");
      } finally {
        setLoading(false);
      }
    };
    fetchPartita();
  }, [id]);

  // Carica giocatori
  useEffect(() => {
    const fetchGiocatori = async () => {
      const { data, error } = await supabase
        .from("giocatori")
        .select("id,nome,cognome")
        .order("cognome", { ascending: true });
      if (!error && data) {
        setGiocatori(data);
        const init: { [tempo: number]: (string | null)[] } = {};
        [1, 2, 3, 4].forEach((q) => (init[q] = []));
        setMarcatori(init);
      }
    };
    fetchGiocatori();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timerActive && countdownSec > 0) {
      timerRef.current = setTimeout(() => {
        setCountdownSec((c) => c - 1);
      }, 1000);
    }
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [timerActive, countdownSec]);

  const toggleTimer = () => {
    if (timerActive) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setTimerActive(false);
    } else {
      setCountdownSec((prev) => (prev > 0 ? prev : inputMinutes * 60));
      setTimerActive(true);
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimerActive(false);
    setCountdownSec(inputMinutes * 60);
  };

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const formatData = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const totaleCasa = goalCasa.reduce((a, b) => a + b, 0);
  const totaleOspite = goalOspite.reduce((a, b) => a + b, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partita) return;
    setSubmitting(true);
    try {
      const totA = goalCasa.reduce((a, b) => a + b, 0);
      const totB = goalOspite.reduce((a, b) => a + b, 0);
      let { error: err1 } = await supabase
        .from("partite")
        .update({
          stato: "Giocata",
          goal_a: totA,
          goal_b: totB,
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
      if (err1) throw err1;

      // presenze
      const presArr = formazioneCasa.map((pid) => ({
        partita_id: partita.id,
        giocatore_id: pid,
      }));
      if (presArr.length) {
        let { error: err2 } = await supabase
          .from("presenze")
          .upsert(presArr, { onConflict: ["partita_id", "giocatore_id"] });
        if (err2) throw err2;
      }

      // marcatori
      const marcArr: MarcatoreRecord[] = Object.entries(marcatori).flatMap(
        ([tempoStr, lista]) =>
          lista
            .filter((pid) => pid)
            .map((pid) => ({
              periodo: parseInt(tempoStr),
              giocatore_id: pid!,
              partita_id: partita.id,
            }))
      );
      if (marcArr.length) {
        let { error: err3 } = await supabase.from("marcatori").insert(marcArr);
        if (err3) throw err3;
      }

      alert("Salvato!");
      navigate("/prossima-partita");
    } catch (err: any) {
      console.error(err);
      alert("Errore durante il salvataggio");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Caricamento…
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-red-600">{error}</div>
        <button
          onClick={() => navigate("/prossima-partita")}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Torna indietro
        </button>
      </div>
    );
  if (!partita)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div>Partita non trovata</div>
        <button
          onClick={() => navigate("/prossima-partita")}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Torna indietro
        </button>
      </div>
    );

  // calcoli cerchio
  const radius = 40;
  const stroke = 4;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const fraction = countdownSec / (inputMinutes * 60);
  const dashOffset = circumference - fraction * circumference;

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-screen bg-gradient-montecarlo-light p-6"
    >
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 space-y-6">
        {/* Data */}
        <div className="text-center">
          <span className="text-2xl font-semibold">
            {formatData(partita.data_ora)}
          </span>
        </div>

        {/* Timer circolare */}
        <div className="flex flex-col items-center space-y-4">
          <Clock className="text-gray-400" size={24} />
          <div className="relative">
            <svg
              height={radius * 2}
              width={radius * 2}
              className="-rotate-90"
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
                strokeDashoffset={dashOffset}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-stroke-dashoffset duration-300 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-xl text-gray-800">
                {formatCountdown(countdownSec)}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={toggleTimer}
              className={`p-2 rounded-full text-white ${
                timerActive ? "bg-yellow-500" : "bg-green-600"
              }`}
            >
              {timerActive ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              onClick={resetTimer}
              className="p-2 rounded-full bg-red-600 text-white"
            >
              <RotateCw size={16} />
            </button>
            {!timerActive && (
              <input
                type="number"
                min={1}
                max={999}
                value={inputMinutes}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 1);
                  setInputMinutes(v);
                  setCountdownSec(v * 60);
                }}
                className="w-12 text-center border rounded focus:outline-none"
              />
            )}
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Formazione */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowFormazione((f) => !f)}
            className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg"
          >
            <ListChecks size={18} />
            <span className="font-medium">Formazione</span>
          </button>
        </div>

        {showFormazione && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Formazione Casa</h3>
              <button
                type="button"
                onClick={() => setShowFormazione(false)}
                className="text-gray-500"
              >
                Chiudi
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {giocatori.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    checked={formazioneCasa.includes(g.id)}
                    onChange={(e) =>
                      setFormazioneCasa((prev) =>
                        e.target.checked
                          ? [...prev, g.id]
                          : prev.filter((pid) => pid !== g.id)
                      )
                    }
                  />
                  <span>
                    {g.cognome} {g.nome}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Pulsanti tempi */}
        <div className="grid grid-cols-4 gap-2">
          {([0, 1, 2, 3] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() =>
                setTempiVisible((prev) =>
                  prev.map((v, i) => (i === t ? !v : false))
                )
              }
              className={`py-2 rounded-lg text-sm font-medium ${
                tempiVisible[t]
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {t + 1}° T
            </button>
          ))}
        </div>

        {/* Dettagli per ciascun tempo */}
        {([0, 1, 2, 3] as const).map(
          (t) =>
            tempiVisible[t] && (
              <div key={t} className="space-y-4">
                <h4 className="text-lg font-semibold">{t + 1}° Tempo</h4>

                {/* Squadra Casa */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {partita.casa.logo_url && (
                      <img
                        src={partita.casa.logo_url}
                        alt={partita.casa.nome}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    <span className="font-medium">{partita.casa.nome}</span>
                    <span className="text-gray-500">({totaleCasa})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGoalCasa((prev) =>
                          prev.map((v, i) => (i === t ? Math.max(0, v - 1) : v))
                        );
                        setMarcatori((prev) => {
                          const arr = [...prev[t + 1]];
                          arr.pop();
                          return { ...prev, [t + 1]: arr };
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
                          const arr = [...prev[t + 1]];
                          arr.push(null);
                          return { ...prev, [t + 1]: arr };
                        });
                      }}
                      className="px-2 py-1 bg-gray-200 rounded"
                    >
                      ＋
                    </button>
                  </div>
                </div>

                {/* Dropdown marcatori SOLO Montecarlo */}
                <div className="space-y-2">
                  {marcatori[t + 1].map((pid, idx) => (
                    <select
                      key={idx}
                      value={pid || ""}
                      onChange={(e) =>
                        setMarcatori((prev) => {
                          const arr = [...prev[t + 1]];
                          arr[idx] = e.target.value || null;
                          return { ...prev, [t + 1]: arr };
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

                {/* Squadra Ospite */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {partita.ospite.logo_url && (
                      <img
                        src={partita.ospite.logo_url}
                        alt={partita.ospite.nome}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    <span className="font-medium">{partita.ospite.nome}</span>
                    <span className="text-gray-500">({totaleOspite})</span>
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
            )
        )}

        {/* Bottone Salva */}
        <div className="text-center mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center space-x-2 bg-gradient-montecarlo px-6 py-3 rounded-lg text-white disabled:opacity-50"
          >
            <Save size={18} />
            <span>{submitting ? "Salvataggio…" : "Salva risultato"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
