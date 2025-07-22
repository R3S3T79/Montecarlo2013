// src/components/GestioneRisultatoPartita.tsx

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function GestioneRisultatoPartita() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Stato per la partita e loading
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

  // Stati per il countdown personalizzabile (default 20 minuti)
  const [inputMinutes, setInputMinutes] = useState<number>(20);
  const [countdownSec, setCountdownSec] = useState<number>(20 * 60);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch della partita usando l'ID dalla route
  useEffect(() => {
    const fetchPartita = async () => {
      if (!id) {
        setError("ID partita non trovato nella route");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("partite")
          .select(`
            id,
            data_ora,
            goal_a1, goal_a2, goal_a3, goal_a4,
            goal_b1, goal_b2, goal_b3, goal_b4,
            squadra_casa:squadra_casa_id(id, nome, logo_url),
            squadra_ospite:squadra_ospite_id(id, nome, logo_url)
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!data) {
          setError("Partita non trovata");
          setLoading(false);
          return;
        }

        const partitaFormattata: PartitaPropria = {
          id: data.id,
          data_ora: data.data_ora,
          casa: {
            id: data.squadra_casa.id,
            nome: data.squadra_casa.nome,
            logo_url: data.squadra_casa.logo_url
          },
          ospite: {
            id: data.squadra_ospite.id,
            nome: data.squadra_ospite.nome,
            logo_url: data.squadra_ospite.logo_url
          }
        };

        setPartita(partitaFormattata);
        setGoalCasa([data.goal_a1 || 0, data.goal_a2 || 0, data.goal_a3 || 0, data.goal_a4 || 0]);
        setGoalOspite([data.goal_b1 || 0, data.goal_b2 || 0, data.goal_b3 || 0, data.goal_b4 || 0]);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Errore nel caricamento della partita");
      } finally {
        setLoading(false);
      }
    };

    fetchPartita();
  }, [id]);

  // Carica tutti i giocatori
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("giocatori")
        .select("id, nome, cognome")
        .order("cognome", { ascending: true });
      if (!error && data) {
        setGiocatori(data);
        const init: { [tempo: number]: (string | null)[] } = {};
        [1,2,3,4].forEach(q => { init[q] = []; });
        setMarcatori(init);
      }
    })();
  }, []);

  // Countdown
  useEffect(() => {
    if (timerActive && countdownSec > 0) {
      timerRef.current = setTimeout(() => setCountdownSec(prev => prev - 1), 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timerActive, countdownSec]);

  const toggleTimer = () => {
    if (timerActive) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setTimerActive(false);
    } else {
      setCountdownSec(prev => prev > 0 ? prev : inputMinutes * 60);
      setTimerActive(true);
    }
  };

  const resetCountdown = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimerActive(false);
    setCountdownSec(inputMinutes * 60);
  };

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec/60).toString().padStart(2,"0");
    const s = (sec%60).toString().padStart(2,"0");
    return `${m}:${s}`;
  };

  const totalSeconds = inputMinutes * 60;
  const radius = 40, stroke = 4;
  const normalizedRadius = radius - stroke/2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const fraction = countdownSec / totalSeconds;
  const strokeDashoffset = circumference - fraction * circumference;

  const formatData = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", {
      weekday:"short", day:"2-digit", month:"2-digit", year:"numeric"
    });

  const totaleCasa = goalCasa.reduce((a,b)=>a+b,0);
  const totaleOspite = goalOspite.reduce((a,b)=>a+b,0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partita) return;
    setSubmitting(true);
    try {
      const totA = goalCasa.reduce((a,b)=>a+b,0);
      const totB = goalOspite.reduce((a,b)=>a+b,0);

      // aggiorna partita
      let { error: e1 } = await supabase
        .from("partite")
        .update({
          stato: "Giocata",
          goal_a: totA,
          goal_b: totB,
          goal_a1: goalCasa[0], goal_a2: goalCasa[1], goal_a3: goalCasa[2], goal_a4: goalCasa[3],
          goal_b1: goalOspite[0], goal_b2: goalOspite[1], goal_b3: goalOspite[2], goal_b4: goalOspite[3],
        })
        .eq("id", partita.id);
      if (e1) throw e1;

      // presenze
      const pres = formazioneCasa.map(pid=>({ partita_id: partita.id, giocatore_id: pid }));
      if (pres.length) {
        let { error: e2 } = await supabase
          .from("presenze")
          .upsert(pres, { onConflict: ["partita_id","giocatore_id"] });
        if (e2) throw e2;
      }

      // marcatori
      const marc = Object.entries(marcatori).flatMap(
        ([ts, lista]) => lista.filter(pid=>pid).map(pid=>({
          periodo: +ts, giocatore_id: pid!, partita_id: partita.id
        }))
      );
      if (marc.length) {
        let { error: e3 } = await supabase
          .from("marcatori")
          .insert(marc);
        if (e3) throw e3;
      }

      alert("Salvato con successo!");
      navigate("/prossima-partita");
    } catch(err:any) {
      console.error(err);
      alert("Si è verificato un errore.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-64"><div>Caricamento partita...</div></div>;
  if (error || !partita) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <div className="text-red-600">{error || "Partita non trovata"}</div>
        <button onClick={()=>navigate("/prossima-partita")} className="bg-blue-600 text-white px-4 py-2 rounded">
          Torna alle partite
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Data */}
      <div className="text-center"><span className="font-bold">{formatData(partita.data_ora)}</span></div>

      {/* Timer */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg height={radius*2} width={radius*2} className="-rotate-90">
            <circle stroke="#e5e7eb" fill="transparent" strokeWidth={stroke}
                    r={normalizedRadius} cx={radius} cy={radius} />
            <circle stroke={timerActive?"#f87171":"#34d399"} fill="transparent" strokeWidth={stroke}
                    strokeDasharray={`${circumference} ${circumference}`}
                    style={{ strokeDashoffset }}
                    r={normalizedRadius} cx={radius} cy={radius}
                    className="transition-stroke-dashoffset duration-500 ease-linear" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono">{formatCountdown(countdownSec)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-3">
          <button type="button" onClick={toggleTimer}
                  className={`w-6 h-6 rounded-full text-white flex items-center justify-center ${
                    timerActive?"bg-yellow-500":"bg-green-600"
                  }`}>
            {timerActive ?
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
              :
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
              </svg>
            }
          </button>
          <button type="button" onClick={resetCountdown}
                  disabled={!timerActive && countdownSec===inputMinutes*60}
                  className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" />
            </svg>
          </button>
          {!timerActive && (
            <input type="number" min={0} max={999} value={inputMinutes}
                   onChange={e=>{
                     const v = Number(e.target.value);
                     setInputMinutes(v>=0?v:0);
                     setCountdownSec(v*60);
                   }}
                   className="w-8 text-center border rounded" />
          )}
        </div>
      </div>

      <hr className="border-gray-300" />

      {/* Formazione */}
      <div className="text-center">
        <button type="button" onClick={()=>setShowFormazione(f=>!f)}
                className="bg-gray-200 px-4 py-2 rounded">
          {showFormazione?"Nascondi Formazione":"Formazione"}
        </button>
      </div>
      {showFormazione && (
        <div className="border p-4 rounded bg-gray-50">
          <div className="flex justify-between mb-2">
            <h3 className="font-semibold">Formazione Casa</h3>
            <button onClick={()=>setShowFormazione(false)} className="text-gray-600">Chiudi</button>
          </div>
          <div className="max-h-48 overflow-auto">
            {giocatori.map(g=>(
              <label key={g.id} className="flex items-center mb-1">
                <input type="checkbox" checked={formazioneCasa.includes(g.id)}
                       onChange={e=>setFormazioneCasa(fc=>e.target.checked?[...fc,g.id]:fc.filter(x=>x!==g.id))}
                       className="mr-2" />
                {g.cognome} {g.nome}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Tempi */}
      <div className="flex space-x-2">
        {[0,1,2,3].map(t=>(
          <button key={t} type="button"
                  onClick={()=>{
                    const v=[false,false,false,false];
                    v[t]=!tempiVisible[t];
                    setTempiVisible(v);
                  }}
                  className={`flex-1 py-2 rounded ${
                    tempiVisible[t]?"bg-blue-600 text-white":"bg-gray-200"
                  }`}>
            {t+1}° T
          </button>
        ))}
      </div>

      {/* Controlli per ciascun tempo */}
      {([0,1,2,3] as const).map(t=> tempiVisible[t] && (
        <div key={t} className="border-t pt-4 space-y-4">
          <h3 className="font-semibold">{t+1}° Tempo</h3>

          {/* Casa */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {partita.casa.logo_url && (
                <img src={partita.casa.logo_url}
                     alt={partita.casa.nome}
                     className="w-6 h-6" />
              )}
              <span>{partita.casa.nome}</span>
              <span>({totaleCasa})</span>
            </div>
            <div className="flex items-center space-x-2">
              <button type="button"
                      onClick={()=>{
                        setGoalCasa(gc=>gc.map((v,i)=>i===t?Math.max(0,v-1):v));
                        if(partita.casa.nome==="Montecarlo") {
                          setMarcatori(m=>{ const lst=[...m[t+1]]; lst.pop(); return {...m,[t+1]:lst}; });
                        }
                      }}
                      className="px-2 py-1 bg-gray-200 rounded">−</button>
              <span className="w-6 text-center">{goalCasa[t]}</span>
              <button type="button"
                      onClick={()=>{
                        setGoalCasa(gc=>gc.map((v,i)=>i===t?v+1:v));
                        if(partita.casa.nome==="Montecarlo") {
                          setMarcatori(m=>{ const lst=[...m[t+1]]; lst.push(null); return {...m,[t+1]:lst}; });
                        }
                      }}
                      className="px-2 py-1 bg-gray-200 rounded">＋</button>
            </div>
          </div>

          {/* Dropdown marcatori sotto Casa, se Montecarlo in casa */}
          {partita.casa.nome==="Montecarlo" && (
            <div className="space-y-2">
              {marcatori[t+1].map((pid,idx)=>(
                <select key={idx} value={pid||""}
                        onChange={e=>{
                          const val=e.target.value;
                          setMarcatori(m=>{
                            const lst=[...m[t+1]]; lst[idx]=val; 
                            return {...m,[t+1]:lst};
                          });
                        }}
                        className="w-full border rounded px-2 py-1">
                  <option value="">-- Seleziona marcatore --</option>
                  {giocatori.filter(g=>formazioneCasa.includes(g.id)).map(g=>(
                    <option key={g.id} value={g.id}>
                      {g.cognome} {g.nome}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}

          {/* Ospite */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {partita.ospite.logo_url && (
                <img src={partita.ospite.logo_url}
                     alt={partita.ospite.nome}
                     className="w-6 h-6" />
              )}
              <span>{partita.ospite.nome}</span>
              <span>({totaleOspite})</span>
            </div>
            <div className="flex items-center space-x-2">
              <button type="button"
                      onClick={()=>{
                        setGoalOspite(go=>go.map((v,i)=>i===t?Math.max(0,v-1):v));
                        if(partita.ospite.nome==="Montecarlo") {
                          setMarcatori(m=>{ const lst=[...m[t+1]]; lst.pop(); return {...m,[t+1]:lst}; });
                        }
                      }}
                      className="px-2 py-1 bg-gray-200 rounded">−</button>
              <span className="w-6 text-center">{goalOspite[t]}</span>
              <button type="button"
                      onClick={()=>{
                        setGoalOspite(go=>go.map((v,i)=>i===t?v+1:v));
                        if(partita.ospite.nome==="Montecarlo") {
                          setMarcatori(m=>{ const lst=[...m[t+1]]; lst.push(null); return {...m,[t+1]:lst}; });
                        }
                      }}
                      className="px-2 py-1 bg-gray-200 rounded">＋</button>
            </div>
          </div>

          {/* Dropdown marcatori sotto Ospite, se Montecarlo in trasferta */}
          {partita.ospite.nome==="Montecarlo" && (
            <div className="space-y-2">
              {marcatori[t+1].map((pid,idx)=>(
                <select key={idx} value={pid||""}
                        onChange={e=>{
                          const val=e.target.value;
                          setMarcatori(m=>{
                            const lst=[...m[t+1]]; lst[idx]=val; 
                            return {...m,[t+1]:lst};
                          });
                        }}
                        className="w-full border rounded px-2 py-1">
                  <option value="">-- Seleziona marcatore --</option>
                  {giocatori.filter(g=>formazioneCasa.includes(g.id)).map(g=>(
                    <option key={g.id} value={g.id}>
                      {g.cognome} {g.nome}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
        </div>
      ))}

      <div>
        <button type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {submitting ? "Salvataggio…" : "Salva risultato"}
        </button>
      </div>
    </form>
  );
}
