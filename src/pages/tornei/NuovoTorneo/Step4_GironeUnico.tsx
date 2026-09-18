// src/pages/tornei/NuovoTorneo/Step4_GironeUnico.tsx 
import { useEffect, useState } from 'react'; 
import { useNavigate, useLocation, useParams } from 'react-router-dom'; 
import { supabase } from '../../../lib/supabaseClient'; 
 
interface Squadra { 
  id: string; 
  nome: string; 
} 
 
interface StateType { 
  torneoNome: string; 
  torneoLuogo: string; 
  stagioneSelezionata: string; 
  formatoTorneo: 'Girone_Unico'; 
  numSquadre: number; 
} 
 
export default function Step4_GironeUnico() { 
  const navigate = useNavigate(); 
  const location = useLocation(); 
  const { torneoId } = useParams(); 
  const state = location.state as StateType | null; 
 
  console.log('[Step4_GironeUnico] render, location.state =', state, 'torneoId =', torneoId); 
 
  const [squadre, setSquadre] = useState<Squadra[]>([]); 
  const [scelte, setScelte] = useState<(string | null)[]>([]); 
 
  useEffect(() => { 
    if (!state || !torneoId) { 
      console.warn('[Step4_GironeUnico] stato o torneoId mancante, torno a step1'); 
      navigate('/tornei/nuovo/step1'); 
      return; 
    } 
 
    (async () => { 
      console.log('[Step4_GironeUnico] fetch squadre...'); 
      const { data, error } = await supabase.from('squadre').select('id, nome'); 
      if (error) { 
        console.error('[Step4_GironeUnico] errore fetch:', error); 
        return; 
      } 
 
     // --- ORDINAMENTO RICHIESTO --- 
// Montecarlo deve essere la prima voce, 
// Montecarlo Sq. B la seconda, 
// il resto in ordine alfabetico. 
 
const MONTECARLO_A_ID = 'a16a8645-9f86-41d9-a81f-a92931f1cc67'; 
const MONTECARLO_B_ID = 'f145b7f0-6f7e-42f2-9c88-7e37b203c4b3'; // ✅ ID Montecarlo Sq.B 
 
let elenco: Squadra[] = data ?? []; 
 
// Recupero eventuali voci mancanti (per sicurezza) 
const idsDaControllare = [MONTECARLO_A_ID, MONTECARLO_B_ID]; 
for (const id of idsDaControllare) { 
  if (!elenco.some((s) => s.id === id)) { 
    const { data: extra } = await supabase 
      .from('squadre') 
      .select('id, nome') 
      .eq('id', id) 
      .maybeSingle(); 
    if (extra) elenco.push(extra); 
  } 
} 
 
// Individua le due squadre principali 
const montecarloA = 
  elenco.find((s) => s.id === MONTECARLO_A_ID) || 
  elenco.find((s) => s.nome.trim().toLowerCase() === 'montecarlo'); 
 
const montecarloB = 
  elenco.find((s) => s.id === MONTECARLO_B_ID) || 
  elenco.find((s) => s.nome.trim().toLowerCase().includes('sq.b')); 
 
// Filtra tutte le altre 
const altre = elenco 
  .filter((s) => s.id !== montecarloA?.id && s.id !== montecarloB?.id) 
  .sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' })); 
 
// Ordine finale: Montecarlo, Montecarlo Sq.B, poi il resto 
const ordered = [ 
  ...(montecarloA ? [montecarloA] : []), 
  ...(montecarloB ? [montecarloB] : []), 
  ...altre, 
]; 
// --- FINE ORDINAMENTO --- 
 
 
      setSquadre(ordered); 
      setScelte(Array(state.numSquadre).fill(null)); 
      console.log('[Step4_GironeUnico] squadre caricate:', ordered); 
    })(); 
  }, [state, torneoId, navigate]); 
 
  if (!state || !torneoId) return null; 
 
  const handleSelect = (idx: number, val: string) => { 
    const nuove = [...scelte]; 
    nuove[idx] = val; 
    setScelte(nuove); 
    console.log('[Step4_GironeUnico] scelte ora =', nuove); 
  }; 
 
  const tutteValide = () => 
    scelte.every((v) => v !== null) && new Set(scelte).size === scelte.length; 
 
  const handleContinue = () => { 
    console.log('[Step4_GironeUnico] click Avanti, tutte valide?', tutteValide()); 
    if (!tutteValide()) return; 
    navigate(`/tornei/nuovo/step5-gironeunico/${torneoId}`, { 
      state: { ...state, squadreSelezionate: scelte }, 
    }); 
  }; 
 
  return ( 
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-3xl mx-auto space-y-4">

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo">
          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl ring-1 ring-inset ring-red-200">
                ⚽
              </div>

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Seleziona le squadre
                </h1>

                <p className="mt-0.5 text-sm text-gray-500">
                  Girone unico · {state.numSquadre} squadre
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm p-4 sm:p-5 space-y-3"> 
          {scelte.map((val, idx) => ( 
            <div
              key={idx}
              className="rounded-lg bg-gray-50 px-3 py-3"
            >
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Squadra {idx + 1}
              </div>

              <select 
                value={val ?? ''} 
                onChange={(e) => handleSelect(idx, e.target.value)} 
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300" 
              > 
                <option value="">– Seleziona squadra –</option> 
                {squadre 
                  // Manteniamo l'ordine già calcolato: Montecarlo prima, poi alfabetico. 
                  .filter(s => !scelte.includes(s.id) || scelte[idx] === s.id) 
                  .map((s) => ( 
                    <option key={s.id} value={s.id}> 
                      {s.nome} 
                    </option> 
                  ))} 
              </select> 
            </div>
          ))} 
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"> 
          <button 
            onClick={() => { 
              console.log('[Step4_GironeUnico] click Indietro'); 
              navigate(-1); 
            }} 
            className="w-full bg-gray-100 border border-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-200 transition" 
          > 
            Indietro 
          </button>

          <button 
            onClick={handleContinue} 
            disabled={!tutteValide()} 
            className={`w-full py-2.5 px-4 rounded-lg text-white font-semibold transition ${ 
              tutteValide() ? 'bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] shadow-sm hover:opacity-90' : 'bg-gray-300 cursor-not-allowed' 
            }`} 
          > 
            Procedi 
          </button> 
        </div> 

      </div>
    </div> 
  ); 
} 