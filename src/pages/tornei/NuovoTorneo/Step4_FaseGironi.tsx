// src/pages/tornei/NuovoTorneo/Step4_FaseGironi.tsx 
import { useEffect, useState } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom'; 
import { supabase } from '../../../lib/supabaseClient'; 
 
interface Squadra { 
  id: string; 
  nome: string; 
} 
 
interface StateType { 
  torneoNome: string; 
  torneoLuogo: string; 
  stagioneSelezionata: string; 
  formatoTorneo: 'Fase_Gironi'; 
  numSquadre: number; 
} 
 
export default function Step4_FaseGironi() { 
  const navigate = useNavigate(); 
  const location = useLocation(); 
  const state = location.state as StateType | null; 
 
  const [squadre, setSquadre] = useState<Squadra[]>([]); 
  const [scelte, setScelte] = useState<(string | null)[]>([]); 
  const [numGironi, setNumGironi] = useState<number | null>(null); 
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false); 
 
  useEffect(() => { 
    if (!state) { 
      navigate('/tornei/nuovo/step1'); 
      return; 
    } 
 
    (async () => { 
      const { data, error } = await supabase.from('squadre').select('id, nome'); 
      if (error || !data) { 
        console.error('[Step4_FaseGironi] Errore Supabase:', error); 
        return; 
      } 
 
      // Montecarlo come prima voce, resto alfabetico 
      const MONTECARLO_ID = 'a16a8645-9f86-41d9-a81f-a92931f1cc67'; 
      let elenco: Squadra[] = data ?? []; 
 
      if (!elenco.some(s => s.id === MONTECARLO_ID)) { 
        const { data: mc } = await supabase 
          .from('squadre') 
          .select('id, nome') 
          .eq('id', MONTECARLO_ID) 
          .maybeSingle(); 
        if (mc) elenco = [...elenco, mc]; 
      } 
 
      const montecarlo = 
        elenco.find(s => s.id === MONTECARLO_ID) || 
        elenco.find(s => s.nome.trim().toLowerCase() === 'montecarlo'); 
 
      const altre = elenco 
        .filter(s => s.id !== montecarlo?.id) 
        .sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' })); 
 
      const ordered = montecarlo ? [montecarlo, ...altre] : altre; 
 
      setSquadre(ordered); 
      setScelte(Array(state.numSquadre).fill(null)); 
    })(); 
  }, [state, navigate]); 
 
  if (!state) return null; 
 
  const handleSelect = (idx: number, val: string) => { 
    const nuove = [...scelte]; 
    nuove[idx] = val; 
    setScelte(nuove); 
  }; 
 
  const tutteValide = () => 
    scelte.every((v) => v !== null) && new Set(scelte).size === scelte.length; 
 
  const getOpzioniGironi = () => { 
    const n = state.numSquadre; 
    const opzioni: number[] = []; 
    for (let i = 2; i <= n; i++) { 
      if (n % i === 0 && n / i >= 2) opzioni.push(i); // almeno 2 squadre per girone 
    } 
    return opzioni; 
  }; 
 
  const handleContinue = async () => { 
    if (!tutteValide() || !numGironi || salvataggioInCorso) return; 
    setSalvataggioInCorso(true); 
 
    const { data: torneo, error } = await supabase 
      .from('tornei') 
      .insert({ 
        nome_torneo: state.torneoNome, 
        luogo: state.torneoLuogo, 
        stagioni: state.stagioneSelezionata, 
        formato_torneo: 'Fase_Gironi', 
        numero_squadre: state.numSquadre, 
      }) 
      .select('id') 
      .single(); 
 
    if (error || !torneo) { 
      console.error('Errore creazione torneo:', error); 
      alert('Errore nella creazione del torneo.'); 
      setSalvataggioInCorso(false); 
      return; 
    } 
 
    navigate(`/tornei/nuovo/step5-5-fasegironi/${torneo.id}`, { 
      state: { 
        ...state, 
        torneoId: torneo.id, 
        squadreSelezionate: scelte, 
        numGironi, 
      }, 
    }); 
  }; 
 
  const perGirone = numGironi ? state.numSquadre / numGironi : 0; 
 
  return ( 
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-3xl mx-auto space-y-4">

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo">
          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl ring-1 ring-inset ring-red-200">
                🏆
              </div>

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Composizione gironi
                </h1>

                <p className="mt-0.5 text-sm text-gray-500">
                  Seleziona i gironi e assegna le {state.numSquadre} squadre
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm p-4 sm:p-5">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Numero di gironi
          </label>

          <select 
            value={numGironi ?? ''} 
            onChange={(e) => setNumGironi(Number(e.target.value))} 
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-200" 
          > 
            <option value="">– Seleziona numero di gironi –</option> 
            {getOpzioniGironi().map((n) => ( 
              <option key={n} value={n}> 
                {n} gironi da {state.numSquadre / n} 
              </option> 
            ))} 
          </select> 

          {numGironi && (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {numGironi} gironi · {perGirone} squadre per girone
            </div>
          )}
        </div>
 
        {/* Raggruppa per girone in container con titolo unico */} 
        {numGironi !== null && 
          Array.from({ length: numGironi }).map((_, g) => { 
            const lettera = String.fromCharCode(65 + g); 
            const startIdx = g * perGirone; 
            const idxList = Array.from({ length: perGirone }, (_, i) => startIdx + i); 
 
            return ( 
              <div
                key={g}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm"
              >
                <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

                <div className="flex items-center justify-between border-b border-gray-100 bg-red-50/60 px-4 py-3">
                  <div className="font-bold text-gray-900">
                    Girone {lettera}
                  </div>

                  <div className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700">
                    {perGirone} squadre
                  </div>
                </div>

                <div className="p-4 space-y-3"> 
                  {idxList.map((idx, posizione) => ( 
                    <div key={idx}>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Squadra {posizione + 1}
                      </label>

                      <select 
                        value={scelte[idx] ?? ''} 
                        onChange={(e) => handleSelect(idx, e.target.value)} 
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-200" 
                      > 
                        <option value="">– Seleziona squadra –</option> 
                        {squadre 
                          .filter((s) => !scelte.includes(s.id) || scelte[idx] === s.id) 
                          .map((s) => ( 
                            <option key={s.id} value={s.id}> 
                              {s.nome} 
                            </option> 
                          ))} 
                      </select>
                    </div> 
                  ))} 
                </div> 
              </div> 
            ); 
          })} 
 
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1"> 
          <button 
            onClick={() => navigate(-1)} 
            className="w-full bg-gray-100 border border-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-200 transition" 
          > 
            Indietro 
          </button>

          <button 
            onClick={handleContinue} 
            disabled={!tutteValide() || !numGironi || salvataggioInCorso} 
            className={`w-full py-2.5 px-4 rounded-lg text-white font-semibold transition ${ 
              (tutteValide() && numGironi && !salvataggioInCorso) 
                ? 'bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] shadow-sm hover:opacity-90' 
                : 'bg-gray-300 cursor-not-allowed' 
            }`} 
          > 
            {salvataggioInCorso ? 'Creazione torneo…' : 'Procedi'} 
          </button> 
        </div>

      </div>
    </div> 
  ); 
} 