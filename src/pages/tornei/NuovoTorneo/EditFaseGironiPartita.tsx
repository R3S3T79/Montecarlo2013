// src/pages/tornei/NuovoTorneo/EditFaseGironiPartita.tsx 
// Data creazione chat: 29/07/2025 
 
import { useState, useEffect } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom'; 
import { supabase } from '../../../lib/supabaseClient'; 
 
interface Squadra { 
  id: string; 
  nome: string; 
  logo_url: string | null; 
} 
 
interface Partita { 
  id: string; 
  gol_casa: number | null; 
  gol_ospite: number | null; 
  rigori_vincitore: string | null; 
  data_match: string | null; 
  squadra_casa: Squadra | null; 
  squadra_ospite: Squadra | null; 
} 
 
export default function EditFaseGironiPartita() { 
  const { matchId } = useParams<{ matchId: string }>(); 
  const navigate = useNavigate(); 
 
  const [partita, setPartita] = useState<Partita | null>(null); 
  const [scoreCasa, setScoreCasa] = useState(0); 
  const [scoreOspite, setScoreOspite] = useState(0); 
  const [rigoriVincitore, setRigoriVincitore] = useState<string | null>(null); 
  const [dataOra, setDataOra] = useState(''); 
  const [loading, setLoading] = useState(true); 
  const [saving, setSaving] = useState(false); 
 
  useEffect(() => { 
    if (!matchId) return; 
    (async () => { 
      setLoading(true); 
      const { data, error } = await supabase 
        .from('tornei_fasegironi') 
        .select(` 
          id, 
          gol_casa, 
          gol_ospite, 
          rigori_vincitore, 
          data_match, 
          squadra_casa:squadra_casa(id,nome,logo_url), 
          squadra_ospite:squadra_ospite(id,nome,logo_url) 
        `) 
        .eq('id', matchId) 
        .single(); 
      if (error || !data) { 
        console.error('Errore fetch partita:', error); 
        setLoading(false); 
        return; 
      } 

      const squadraCasa = Array.isArray(data.squadra_casa)
        ? data.squadra_casa[0] ?? null
        : data.squadra_casa;

      const squadraOspite = Array.isArray(data.squadra_ospite)
        ? data.squadra_ospite[0] ?? null
        : data.squadra_ospite;

      setPartita({ 
        ...data, 
        squadra_casa: squadraCasa, 
        squadra_ospite: squadraOspite, 
      }); 

      setScoreCasa(data.gol_casa ?? 0); 
      setScoreOspite(data.gol_ospite ?? 0); 
      setRigoriVincitore(data.rigori_vincitore); 
      setDataOra(data.data_match ? data.data_match.slice(0, 16) : ''); 
      setLoading(false); 
    })(); 
  }, [matchId]); 
 
  const isDraw = scoreCasa === scoreOspite; 
 
  const handleSaveAll = async () => { 
    if (!partita || !matchId) return; 
    setSaving(true); 
    const updates = { 
      gol_casa: scoreCasa, 
      gol_ospite: scoreOspite, 
      rigori_vincitore: isDraw ? rigoriVincitore : null, 
      data_match: dataOra || null,   // 🔑 salva diretto, senza new Date 
      giocata: true, 
      updated_at: new Date().toISOString(), 
    }; 
    const { error } = await supabase 
      .from('tornei_fasegironi') 
      .update(updates) 
      .eq('id', matchId); 
    setSaving(false); 
    if (error) alert('Errore salvataggio: ' + error.message); 
    else navigate(-1); 
  }; 
 
  const handleSaveDateOnly = async () => { 
    if (!partita || !matchId) return; 
    setSaving(true); 
    const { error } = await supabase 
      .from('tornei_fasegironi') 
      .update({ 
        data_match: dataOra || null,  // 🔑 idem qui 
        giocata: true, 
        updated_at: new Date().toISOString(), 
      }) 
      .eq('id', matchId); 
    setSaving(false); 
    if (error) alert('Errore salvataggio data: ' + error.message); 
    else navigate(-1); 
  }; 
 
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-2">
        <div className="rounded-xl border border-gray-200 bg-white/90 px-6 py-4 shadow-montecarlo">
          <div className="text-sm font-semibold text-montecarlo-secondary">
            Caricamento…
          </div>
        </div>
      </div>
    );
  }
 
  if (!partita) { 
    return ( 
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-xl border border-gray-200 shadow-montecarlo"> 
        <p className="text-center text-gray-700">Partita non trovata.</p> 
      </div> 
    ); 
  } 
 
  const casa = partita.squadra_casa; 
  const ospite = partita.squadra_ospite; 

  if (!casa || !ospite) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-xl border border-gray-200 shadow-montecarlo">
        <p className="text-center text-gray-700">
          Le squadre non sono ancora definite per questa partita.
        </p>
      </div>
    );
  }
 
  return ( 
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-xl mx-auto space-y-4">

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo">
          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl ring-1 ring-inset ring-red-200">
                ⚽
              </div>

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Modifica risultato
                </h1>

                <p className="mt-0.5 text-sm text-gray-500">
                  Fase a gironi
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="p-4 sm:p-5 space-y-4">
      
            {/* CASA */} 
            <div className="overflow-hidden rounded-lg border border-red-200 bg-red-50/60">
              <div className="px-3 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-red-500">
                Casa
              </div>

              <div className="flex items-center justify-between gap-3 p-3 pt-2"> 
                <div className="flex min-w-0 items-center gap-3"> 
                  {casa.logo_url && ( 
                    <img 
                      src={casa.logo_url} 
                      alt={casa.nome} 
                      className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-0.5 shadow-sm" 
                    /> 
                  )} 

                  <span className="truncate font-semibold text-gray-800">
                    {casa.nome}
                  </span> 
                </div> 

                <input 
                  type="number" 
                  min={0} 
                  value={scoreCasa} 
                  onChange={(e) => setScoreCasa(+e.currentTarget.value)} 
                  onFocus={(e) => e.currentTarget.select()} 
                  className="h-11 w-16 shrink-0 rounded-lg border border-red-200 bg-white text-center text-xl font-bold text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200" 
                /> 
              </div>
            </div> 
 
            {/* OSPITE */} 
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <div className="px-3 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Ospite
              </div>

              <div className="flex items-center justify-between gap-3 p-3 pt-2"> 
                <div className="flex min-w-0 items-center gap-3"> 
                  {ospite.logo_url && ( 
                    <img 
                      src={ospite.logo_url} 
                      alt={ospite.nome} 
                      className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-0.5 shadow-sm" 
                    /> 
                  )} 

                  <span className="truncate font-semibold text-gray-800">
                    {ospite.nome}
                  </span> 
                </div> 

                <input 
                  type="number" 
                  min={0} 
                  value={scoreOspite} 
                  onChange={(e) => setScoreOspite(+e.currentTarget.value)} 
                  onFocus={(e) => e.currentTarget.select()} 
                  className="h-11 w-16 shrink-0 rounded-lg border border-gray-300 bg-white text-center text-xl font-bold text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200" 
                /> 
              </div>
            </div> 
 
            {/* RIGORI (solo se pareggio) */} 
            {isDraw && ( 
              <div className="rounded-lg border border-red-100 bg-red-50/40 p-3 space-y-2"> 
                <div className="text-sm font-semibold text-gray-800"> 
                  Vincitore ai rigori 
                </div> 

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2.5"> 
                  <input 
                    type="radio" 
                    checked={rigoriVincitore === casa.id} 
                    onChange={() => setRigoriVincitore(casa.id)}
                    className="h-4 w-4 accent-red-600" 
                  /> 
                  <span className="text-sm font-medium text-gray-700">
                    {casa.nome}
                  </span> 
                </label> 

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2.5"> 
                  <input 
                    type="radio" 
                    checked={rigoriVincitore === ospite.id} 
                    onChange={() => setRigoriVincitore(ospite.id)}
                    className="h-4 w-4 accent-red-600" 
                  /> 
                  <span className="text-sm font-medium text-gray-700">
                    {ospite.nome}
                  </span> 
                </label> 
              </div> 
            )} 
 
            {/* DATA & ORA */} 
            <div> 
              <label className="mb-1.5 block text-xs font-semibold text-gray-600"> 
                Data &amp; Ora Incontro 
              </label> 

              <input 
                type="datetime-local" 
                value={dataOra} 
                onChange={(e) => setDataOra(e.currentTarget.value)} 
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-200" 
              /> 
            </div> 
 
            {/* PULSANTI */} 
            <div className="space-y-2 pt-1"> 
              <button 
                onClick={handleSaveAll} 
                disabled={saving} 
                className="w-full rounded-lg bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50" 
              > 
                {saving ? "Salvataggio…" : "Salva Risultato e Data"} 
              </button> 

              <button 
                onClick={handleSaveDateOnly} 
                disabled={saving} 
                className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 font-semibold text-montecarlo-secondary transition hover:bg-red-100 disabled:opacity-50" 
              > 
                {saving ? "Salvataggio…" : "Salva Solo Data"} 
              </button> 
            </div>

          </div>
        </div>

      </div>
    </div> 
  ); 
}