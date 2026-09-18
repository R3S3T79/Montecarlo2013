// src/pages/tornei/NuovoTorneo/EditGironeUnicoPartita.tsx 
import { useState, useEffect } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom'; 
import { supabase } from '../../../lib/supabaseClient'; 
 
interface Partita { 
  id: string; 
  squadra_casa: string; 
  squadra_ospite: string; 
  gol_casa: number; 
  gol_ospite: number; 
  data_match: string | null; 
  giocata: boolean; 
  rigori_vincitore: string | null; 
} 
 
interface Squadra { 
  id: string; 
  nome: string; 
  logo_url: string | null; 
} 
 
export default function EditGironeUnicoPartita() { 
  const { matchId } = useParams(); 
  const navigate = useNavigate(); 
 
  const [partita, setPartita] = useState<Partita | null>(null); 
  const [teams, setTeams] = useState<{ [key: string]: Squadra }>({}); // <-- sostituito Record 
  const [scoreCasa, setScoreCasa] = useState(0); 
  const [scoreOspite, setScoreOspite] = useState(0); 
  const [dataOra, setDataOra] = useState(''); 
  const [saving, setSaving] = useState(false); 
  const [loading, setLoading] = useState(true); 
  const [rigoriVincitore, setRigoriVincitore] = useState<string | null>(null); 
 
  useEffect(() => { 
    if (!matchId) return; 
 
    (async () => { 
      const { data: p } = await supabase 
        .from('tornei_gironeunico') 
        .select('*') 
        .eq('id', matchId) 
        .single(); 
 
      if (!p) { 
        navigate(-1); 
        return; 
      } 
 
      setPartita(p); 
      setScoreCasa(p.gol_casa ?? 0); 
      setScoreOspite(p.gol_ospite ?? 0); 
      setDataOra(p.data_match ? p.data_match.slice(0, 16) : ''); 
      setRigoriVincitore(p.rigori_vincitore || null); 
 
      const { data: teamData } = await supabase 
        .from('squadre') 
        .select('id, nome, logo_url') 
        .in('id', [p.squadra_casa, p.squadra_ospite]); 
 
      if (teamData) { 
        const map: { [key: string]: Squadra } = {}; // <-- sostituito Record 
        teamData.forEach(t => (map[t.id] = t)); 
        setTeams(map); 
      } 
 
      setLoading(false); 
    })(); 
  }, [matchId]); 
 
  const handleSaveResults = async () => { 
    if (!partita) return; 
    setSaving(true); 
 
    const { error } = await supabase 
      .from('tornei_gironeunico') 
      .update({ 
        gol_casa: scoreCasa, 
        gol_ospite: scoreOspite, 
        giocata: true, 
        data_match: dataOra ? `${dataOra}:00` : null, 
        rigori_vincitore: rigoriVincitore, 
      }) 
      .eq('id', partita.id); 
 
    setSaving(false); 
    if (error) { 
      alert('Errore salvataggio: ' + error.message); 
    } else { 
      navigate(-1); 
    } 
  }; 
 
  const handleSaveDateOnly = async () => { 
    if (!partita) return; 
    setSaving(true); 
 
    const { error } = await supabase 
      .from('tornei_gironeunico') 
      .update({ 
        data_match: dataOra ? `${dataOra}:00` : null, 
      }) 
      .eq('id', partita.id); 
 
    setSaving(false); 
    if (error) { 
      alert('Errore salvataggio data: ' + error.message); 
    } else { 
      navigate(-1); 
    } 
  }; 
 
  const handleRigoriChange = (squadraId: string) => { 
    if (rigoriVincitore === squadraId) { 
      setRigoriVincitore(null); 
    } else { 
      setRigoriVincitore(squadraId); 
    } 
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
 
  if (!partita || !teams[partita.squadra_casa] || !teams[partita.squadra_ospite]) { 
    return ( 
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-xl border border-gray-200 shadow-montecarlo"> 
        <p className="text-center text-gray-700">Le squadre non sono ancora definite per questa partita.</p> 
      </div> 
    ); 
  } 
 
  const casa = teams[partita.squadra_casa]; 
  const ospite = teams[partita.squadra_ospite]; 
 
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
                  Inserisci il risultato e la data dell'incontro
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
                  onChange={e => setScoreCasa(+e.currentTarget.value)} 
                  onFocus={e => e.currentTarget.select()} 
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
                  onChange={e => setScoreOspite(+e.currentTarget.value)} 
                  onFocus={e => e.currentTarget.select()} 
                  className="h-11 w-16 shrink-0 rounded-lg border border-gray-300 bg-white text-center text-xl font-bold text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200" 
                /> 
              </div>
            </div> 
 
            {/* RIGORI */} 
            {scoreCasa === scoreOspite && ( 
              <div className="rounded-lg border border-red-100 bg-red-50/40 p-3 space-y-2"> 
                <div className="text-sm font-semibold text-gray-800">
                  Vincitore ai rigori
                </div> 

                <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2.5 border border-gray-100"> 
                  <input 
                    type="checkbox" 
                    checked={rigoriVincitore === casa.id} 
                    onChange={() => handleRigoriChange(casa.id)}
                    className="h-4 w-4 accent-red-600" 
                  /> 
                  <span className="text-sm font-medium text-gray-700">
                    {casa.nome}
                  </span> 
                </label> 

                <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2.5 border border-gray-100"> 
                  <input 
                    type="checkbox" 
                    checked={rigoriVincitore === ospite.id} 
                    onChange={() => handleRigoriChange(ospite.id)}
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
                Data & Ora Incontro
              </label> 

              <input 
                type="datetime-local" 
                value={dataOra} 
                onChange={e => setDataOra(e.currentTarget.value)} 
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-200" 
              /> 
            </div> 
 
            {/* PULSANTI */} 
            <div className="space-y-2 pt-1"> 
              <button 
                onClick={handleSaveResults} 
                disabled={saving} 
                className="w-full rounded-lg bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50" 
              > 
                {saving ? 'Salvataggio…' : 'Salva Risultato e Data'} 
              </button> 

              <button 
                onClick={handleSaveDateOnly} 
                disabled={saving} 
                className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 font-semibold text-montecarlo-secondary transition hover:bg-red-100 disabled:opacity-50" 
              > 
                {saving ? 'Salvataggio…' : 'Salva Solo Data'} 
              </button> 
            </div>

          </div>
        </div>

      </div>
    </div> 
  ); 
} 