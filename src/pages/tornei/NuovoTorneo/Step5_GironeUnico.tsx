// src/pages/tornei/NuovoTorneo/Step5_GironeUnico.tsx 
import { useEffect, useState } from 'react'; 
import { useLocation, useNavigate } from 'react-router-dom'; 
import { supabase } from '../../../lib/supabaseClient'; 
 
interface Squadra { 
  id: string; 
  nome: string; 
  logo_url: string | null; 
} 
 
interface StateType { 
  torneoId: string; 
  torneoNome: string; 
  torneoLuogo: string; 
  stagioneSelezionata: string; 
  formatoTorneo: 'Girone_Unico'; 
  numSquadre: number; 
  squadreSelezionate: string[]; 
} 
 
export default function Step5_GironeUnico() { 
  const location = useLocation(); 
  const navigate = useNavigate(); 
  const state = (location.state as StateType) || null; 
 
  const [squadre, setSquadre] = useState<Squadra[]>([]); 
  const [accoppiamenti, setAccoppiamenti] = useState<[string, string][]>([]); 
  const [dateIncontri, setDateIncontri] = useState< 
    Record<string, { andata: string; ritorno?: string }> 
  >({}); 
  const [andataRitorno, setAndataRitorno] = useState(false); 
  const [loading, setLoading] = useState(false); 
 
  useEffect(() => { 
    if (!state) { 
      navigate('/tornei/nuovo/step4-gironeunico'); 
    } 
  }, [state, navigate]); 
 
  useEffect(() => { 
    if (!state) return; 
    supabase 
      .from('squadre') 
      .select('id, nome, logo_url') 
      .in('id', state.squadreSelezionate) 
      .then(({ data, error }) => { 
        if (error || !data) return; 
        setSquadre(data); 
        const pairs: [string, string][] = []; 
        data.forEach((a, i) => 
          data.slice(i + 1).forEach((b) => pairs.push([a.id, b.id])) 
        ); 
        setAccoppiamenti(pairs); 
      }); 
  }, [state]); 
 
  if (!state) return null; 
 
  const aggiornaData = ( 
    key: string, 
    tipo: 'andata' | 'ritorno', 
    val: string, 
    e: React.ChangeEvent<HTMLInputElement> 
  ) => { 
    setDateIncontri((prev) => ({ 
      ...prev, 
      [key]: { ...prev[key], [tipo]: val }, 
    })); 
    e.target.blur(); 
  }; 
 
  const allDatesSet = () => 
    accoppiamenti.every(([a, b]) => { 
      const k = `${a}-${b}`; 
      if (!dateIncontri[k]?.andata) return false; 
      if (andataRitorno && !dateIncontri[k]?.ritorno) return false; 
      return true; 
    }); 
 
  const scambia = (idx: number) => { 
    setAccoppiamenti((prev) => { 
      const copy = [...prev]; 
      const [h, o] = copy[idx]; 
      copy[idx] = [o, h]; 
      return copy; 
    }); 
  }; 
 
  const handleNext = async () => { 
    if (!allDatesSet() || loading) return; 
    setLoading(true); 
    try { 
      // salva torneo nella tabella principale (se non esiste già) 
      const { data: t, error: eT } = await supabase 
        .from('tornei') 
        .insert({ 
          id: state.torneoId, 
          nome_torneo: state.torneoNome, 
          luogo: state.torneoLuogo, 
          stagioni: state.stagioneSelezionata, 
          formato_torneo: 'Girone_Unico', 
          numero_squadre: state.numSquadre, 
        }) 
        .select('id') 
        .single(); 
 
      if (eT || !t) throw eT || new Error('Errore creazione torneo'); 
      const torneoId = t.id; 
 
      // crea partite del girone unico 
      let matchNumber = 1; 
      const partite: any[] = []; 
 
      for (const [a, b] of accoppiamenti) { 
        const key = `${a}-${b}`; 
        partite.push({ 
          torneo_id: torneoId, 
          match_number: matchNumber++, 
          squadra_casa: a, 
          squadra_ospite: b, 
          gol_casa: 0, 
          gol_ospite: 0, 
          data_match: dateIncontri[key].andata, 
          giocata: false, 
        }); 
 
        if (andataRitorno && dateIncontri[key].ritorno) { 
          partite.push({ 
            torneo_id: torneoId, 
            match_number: matchNumber++, 
            squadra_casa: b, 
            squadra_ospite: a, 
            gol_casa: 0, 
            gol_ospite: 0, 
            data_match: dateIncontri[key].ritorno, 
            giocata: false, 
          }); 
        } 
      } 
 
      const { error: errInsert } = await supabase 
        .from('tornei_gironeunico') 
        .insert(partite); 
 
      if (errInsert) throw errInsert; 
 
      navigate(`/tornei/nuovo/step6-gironeunico/${torneoId}`, { 
        state: { torneoId }, 
      }); 
    } catch (err) { 
      console.error('Errore salvataggio Girone Unico:', err); 
      alert('Errore durante il salvataggio. Vedi console.'); 
    } finally { 
      setLoading(false); 
    } 
  }; 
 
  return ( 
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-3xl mx-auto space-y-4">

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo">
          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl ring-1 ring-inset ring-red-200">
                📅
              </div>

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Calendario girone
                </h1>

                <p className="mt-0.5 text-sm text-gray-500">
                  Imposta date e campi delle partite
                </p>
              </div>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/90 px-4 py-3 shadow-sm">
          <div>
            <div className="text-sm font-semibold text-gray-800">
              Andata e ritorno
            </div>

            <div className="text-xs text-gray-500">
              Crea anche la partita a campi invertiti
            </div>
          </div>

          <input 
            type="checkbox" 
            checked={andataRitorno} 
            onChange={(e) => setAndataRitorno(e.target.checked)} 
            className="h-5 w-5 accent-red-600" 
          /> 
        </label> 
 
        {accoppiamenti.map(([a, b], idx) => { 
          const key = `${a}-${b}`; 
          const casa = squadre.find((s) => s.id === a); 
          const ospite = squadre.find((s) => s.id === b); 
          return ( 
            <div 
              key={key} 
              className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white/90 shadow-sm ${ 
                idx < accoppiamenti.length - 1 ? 'mb-4' : '' 
              }`} 
            >
              <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

              <div className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Partita {idx + 1}
                  </div>

                  <button 
                    type="button" 
                    onClick={() => scambia(idx)} 
                    className="flex h-8 items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100" 
                    title="Scambia casa/trasferta" 
                  > 
                    ↔️ Scambia
                  </button> 
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
  <div className="flex items-center gap-3 bg-red-50/70 px-3 py-3"> 
    {casa?.logo_url && ( 
      <img 
        src={casa.logo_url} 
        alt={casa.nome} 
        className="h-9 w-9 rounded-full object-contain bg-white p-0.5 shadow-sm" 
      /> 
    )}

    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-red-500">
        Casa
      </div>

      <span className="block truncate text-sm font-semibold text-gray-800">
        {casa?.nome}
      </span> 
    </div>
  </div> 

  <div className="h-px w-full bg-red-200" />

  <div className="flex items-center gap-3 bg-gray-50 px-3 py-3"> 
    {ospite?.logo_url && ( 
      <img 
        src={ospite.logo_url} 
        alt={ospite.nome} 
        className="h-9 w-9 rounded-full object-contain bg-white p-0.5 shadow-sm" 
      /> 
    )}

    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Trasferta
      </div>

      <span className="block truncate text-sm font-semibold text-gray-800">
        {ospite?.nome}
      </span> 
    </div>
  </div>
</div>
 
                <div className="mt-4"> 
                  <label className="mb-1.5 block text-xs font-medium text-gray-600"> 
                    Data andata 
                  </label> 

                  <input 
                    type="datetime-local" 
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200" 
                    value={dateIncontri[key]?.andata || ''} 
                    onChange={(e) => aggiornaData(key, 'andata', e.target.value, e)} 
                  /> 
                </div> 
 
                {andataRitorno && ( 
                  <div className="mt-3"> 
                    <label className="mb-1.5 block text-xs font-medium text-gray-600"> 
                      Data ritorno 
                    </label> 

                    <input 
                      type="datetime-local" 
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200" 
                      value={dateIncontri[key]?.ritorno || ''} 
                      onChange={(e) => 
                        aggiornaData(key, 'ritorno', e.target.value, e) 
                      } 
                    /> 
                  </div> 
                )}
              </div> 
            </div> 
          ); 
        })} 
 
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"> 
          <button 
            onClick={() => navigate(-1)} 
            className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-200" 
          > 
            Indietro 
          </button> 

          <button 
            onClick={handleNext} 
            disabled={!allDatesSet() || loading} 
            className={`w-full rounded-lg px-4 py-2.5 font-semibold text-white transition ${ 
              allDatesSet() && !loading 
                ? 'bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] shadow-sm hover:opacity-90' 
                : 'bg-gray-300 cursor-not-allowed' 
            }`} 
          > 
            {loading ? 'Salvando...' : 'Avanti'} 
          </button> 
        </div>

      </div>
    </div> 
  ); 
} 