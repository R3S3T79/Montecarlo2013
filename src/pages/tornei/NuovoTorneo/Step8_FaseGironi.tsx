// src/pages/tornei/NuovoTorneo/Step8_FaseGironi.tsx 
// Data revisione: 24/08/2025 — Box trasparenti, titoli bianchi fuori dai box 
 
import { useEffect, useState } from "react"; 
import { useParams, useNavigate } from "react-router-dom"; 
import { supabase } from "../../../lib/supabaseClient"; 
import { useAuth } from "../../../context/AuthContext"; 
import { UserRole } from "../../../lib/roles"; 
 
interface Squadra { 
  id: string; 
  nome: string; 
  logo_url: string | null; 
} 
 
interface PartitaRaw { 
  id: string; 
  match_number: number; 
  giocata: boolean; 
  gol_casa: number | null; 
  gol_ospite: number | null; 
  rigori_vincitore: string | null; 
  squadra_casa: Squadra | null; 
  squadra_ospite: Squadra | null; 
} 
 
interface ClassificaEntry { 
  squadra: Squadra; 
  posizione: number; 
} 
 
export default function Step8_FaseGironi() { 
  const { torneoId } = useParams<{ torneoId: string }>(); 
  const navigate = useNavigate(); 
  const { user: authUser, loading: authLoading } = useAuth(); 
 
  const [role, setRole] = useState<UserRole>(UserRole.Authenticated); 
 
  useEffect(() => { 
    const caricaRuolo = async () => { 
      if (!authUser?.id) return; 
 
      const { data, error } = await supabase 
        .from("user_profiles") 
        .select("role") 
        .eq("user_id", authUser.id) 
        .maybeSingle(); 
 
      if (!error && data?.role) { 
        setRole(data.role as UserRole); 
      } 
    }; 
 
    caricaRuolo(); 
  }, [authUser?.id]); 
 
  const canEdit = role === UserRole.Admin || role === UserRole.Creator; 
 
  const [elimPhaseId, setElimPhaseId] = useState<string | null>(null); 
  const [elimMatches, setElimMatches] = useState<PartitaRaw[]>([]); 
  const [classifica, setClassifica] = useState<ClassificaEntry[]>([]); 
  const [loading, setLoading] = useState(true); 
 
  // 1) fase eliminazione 
  useEffect(() => { 
    if (!torneoId) return; 
    supabase 
      .from("fasi_torneo") 
      .select("id") 
      .eq("torneo_id", torneoId) 
      .eq("tipo_fase", "eliminazione") 
      .single() 
      .then(({ data }) => { 
        if (data) setElimPhaseId(data.id); 
      }); 
  }, [torneoId]); 
 
  // 2) partite eliminazione 
  useEffect(() => { 
    if (!torneoId || !elimPhaseId) return; 
    setLoading(true); 
    supabase 
      .from("tornei_fasegironi") 
      .select(` 
        id,match_number,giocata, 
        gol_casa,gol_ospite,rigori_vincitore, 
        squadra_casa(id,nome,logo_url), 
        squadra_ospite(id,nome,logo_url) 
      `) 
      .eq("torneo_id", torneoId) 
      .eq("fase_id", elimPhaseId) 
      .order("match_number", { ascending: true }) 
      .then(({ data }) => { 
        const matches = data || []; 
        setElimMatches( 
          matches.map((m) => ({ 
            ...m, 
            squadra_casa: Array.isArray(m.squadra_casa) ? m.squadra_casa[0] : m.squadra_casa, 
            squadra_ospite: Array.isArray(m.squadra_ospite) ? m.squadra_ospite[0] : m.squadra_ospite, 
          })) 
        ); 
 
        // classifica finale in base al numero match 
        const entries: ClassificaEntry[] = []; 
        matches.forEach((m) => { 
          if (!m.giocata || !m.squadra_casa || !m.squadra_ospite) return; 
          const casa = Array.isArray(m.squadra_casa) ? m.squadra_casa[0] : m.squadra_casa, 
            ospite = Array.isArray(m.squadra_ospite) ? m.squadra_ospite[0] : m.squadra_ospite, 
            cGol = m.gol_casa!, 
            oGol = m.gol_ospite!; 
          let vincitore = casa, 
            perdente = ospite; 
          if (cGol > oGol) { 
            vincitore = casa; 
            perdente = ospite; 
          } else if (oGol > cGol) { 
            vincitore = ospite; 
            perdente = casa; 
          } else if (m.rigori_vincitore) { 
            if (m.rigori_vincitore === ospite.id) { 
              vincitore = ospite; 
              perdente = casa; 
            } 
          } 
          const basePos = (m.match_number - 1) * 2 + 1; 
          entries.push({ squadra: vincitore, posizione: basePos }); 
          entries.push({ squadra: perdente, posizione: basePos + 1 }); 
        }); 
        entries.sort((a, b) => a.posizione - b.posizione); 
        setClassifica(entries); 
 
        setLoading(false); 
      }); 
  }, [torneoId, elimPhaseId]); 
 
  if (authLoading || loading) { 
    return ( 
      <div className="min-h-screen flex items-center justify-center px-2"> 
        <div className="rounded-xl border border-gray-200 bg-white/90 px-6 py-4 shadow-montecarlo"> 
          <div className="text-sm font-semibold text-montecarlo-secondary"> 
            Caricamento in corso… 
          </div> 
        </div> 
      </div> 
    ); 
  } 
 
  // genera etichette dinamiche in base al numero di match 
  const labelMap: Record<number, string> = {}; 
  elimMatches.forEach((m, idx) => { 
    const start = idx * 2 + 1; 
    const end = start + 1; 
    if (start === 1) { 
      labelMap[m.match_number] = `Finale ${start}°/${end}° Posto`; 
    } else { 
      labelMap[m.match_number] = `Finale ${start}°/${end}° Posto`; 
    } 
  }); 
 
  const formatScore = (m: PartitaRaw) => { 
    if (!m.giocata) return "VS"; 
    const score = `${m.gol_casa} – ${m.gol_ospite}`; 
    if (m.gol_casa === m.gol_ospite && m.rigori_vincitore) { 
      if (m.rigori_vincitore === m.squadra_casa?.id) return `(Rig) ${score}`; 
      if (m.rigori_vincitore === m.squadra_ospite?.id) return `${score} (Rig)`; 
    } 
    return score; 
  }; 
 
  return ( 
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border print:p-0 print:pt-6">
      <div className="w-full max-w-3xl mx-auto space-y-4"> 
 
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo print:hidden"> 
          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" /> 
 
          <div className="px-4 py-4 sm:px-6"> 
            <div className="flex items-center gap-3"> 
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl ring-1 ring-inset ring-red-200"> 
                🏆 
              </div> 
 
              <div className="min-w-0"> 
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900"> 
                  Fase finale 
                </h1> 
 
                <p className="mt-0.5 text-sm text-gray-500"> 
                  Finali e classifica conclusiva 
                </p> 
              </div> 
            </div> 
          </div> 
        </div> 
 
        {/* Scontri diretti */} 
        {elimMatches.map((m) => ( 
          <div 
            key={m.id} 
            className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm" 
          > 
            <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" /> 
 
            <div className="px-3 py-3 sm:px-4"> 
              <h3 className="mb-3 text-center text-sm font-bold text-gray-700"> 
                {labelMap[m.match_number] || `Match ${m.match_number}`} 
              </h3> 
 
              <div 
                onClick={() => 
                  canEdit && 
                  navigate(`/modifica-partita-fasegironi/${m.id}`, { 
                    state: { torneoId }, 
                  }) 
                } 
                className={`grid grid-cols-[44%_12%_44%] items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 transition ${ 
                  canEdit 
                    ? "cursor-pointer hover:border-red-200 hover:bg-red-50/50" 
                    : "" 
                }`} 
              > 
                {/* Casa */} 
                <div className="flex min-w-0 items-center gap-2 justify-start leading-tight"> 
                  {m.squadra_casa?.logo_url && ( 
                    <img 
                      src={m.squadra_casa.logo_url} 
                      alt={m.squadra_casa.nome} 
                      className="h-8 w-8 shrink-0 rounded-full bg-white object-contain p-0.5 shadow-sm" 
                    /> 
                  )} 
                  <span className="truncate text-sm font-semibold text-gray-800"> 
                    {m.squadra_casa?.nome} 
                  </span> 
                </div> 
 
                {/* Risultato */} 
                <div className="text-center text-base font-bold text-montecarlo-secondary leading-tight"> 
                  {formatScore(m)} 
                </div> 
 
                {/* Ospite */} 
                <div className="flex min-w-0 items-center gap-2 justify-end leading-tight"> 
                  <span className="truncate text-right text-sm font-semibold text-gray-800"> 
                    {m.squadra_ospite?.nome} 
                  </span> 
                  {m.squadra_ospite?.logo_url && ( 
                    <img 
                      src={m.squadra_ospite.logo_url} 
                      alt={m.squadra_ospite.nome} 
                      className="h-8 w-8 shrink-0 rounded-full bg-white object-contain p-0.5 shadow-sm" 
                    /> 
                  )} 
                </div> 
              </div> 
            </div> 
          </div> 
        ))} 
 
        {/* Classifica Finale */} 
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm"> 
          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" /> 
 
          <div className="p-3 sm:p-4"> 
            <div className="mb-3 flex items-center gap-2"> 
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 ring-1 ring-inset ring-red-200"> 
                🏅 
              </div> 
 
              <h3 className="text-lg font-bold text-gray-900"> 
                Classifica Finale 
              </h3> 
            </div> 
 
            <div className="overflow-hidden rounded-lg border border-gray-200"> 
              <table className="w-full table-auto border-collapse text-sm bg-white"> 
                <thead> 
                  <tr className="bg-gray-50 text-gray-600"> 
                    <th className="border-b border-r border-gray-200 px-3 py-2 text-center"> 
                      Pos 
                    </th> 
                    <th className="border-b border-gray-200 px-3 py-2 text-left"> 
                      Squadra 
                    </th> 
                  </tr> 
                </thead> 
                <tbody> 
                  {classifica.map((e) => ( 
                    <tr key={e.squadra.id} className="border-b border-gray-100 last:border-b-0"> 
                      <td className="border-r border-gray-200 px-3 py-2 text-center font-bold text-montecarlo-secondary"> 
                        {e.posizione} 
                      </td> 
                      <td className="px-3 py-2"> 
                        <div className="flex items-center gap-2"> 
                          {e.squadra.logo_url && ( 
                            <img 
                              src={e.squadra.logo_url} 
                              alt={e.squadra.nome} 
                              className="h-7 w-7 rounded-full bg-white object-contain p-0.5 shadow-sm" 
                            /> 
                          )} 
                          <span className="font-medium text-gray-800"> 
                            {e.squadra.nome} 
                          </span> 
                        </div> 
                      </td> 
                    </tr> 
                  ))} 
                </tbody> 
              </table> 
            </div> 
          </div> 
        </div> 
 
        {/* Pulsanti */} 
        <div 
          className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:hidden" 
          style={{ 
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)", 
          }} 
        > 
          <button 
            onClick={() => navigate(-1)} 
            className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-200" 
          > 
            Indietro 
          </button> 
 
          <button 
            onClick={() => window.print()} 
            className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 font-semibold text-montecarlo-secondary transition hover:bg-red-100" 
          > 
            Stampa 
          </button> 
 
          {canEdit && ( 
            <button 
              onClick={() => navigate("/tornei")} 
              className="w-full rounded-lg bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90" 
            > 
              Salva ed Esci 
            </button> 
          )} 
        </div> 
 
      </div> 
    </div> 
  ); 
}