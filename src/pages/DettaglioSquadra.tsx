// src/pages/DettaglioSquadra.tsx 
 
import { useEffect, useState } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom'; 
import { supabase } from '../lib/supabaseClient'; 
import { Trash2 } from 'lucide-react'; 
import { useAuth } from '../context/AuthContext'; 
 
interface Squadra { 
  id: string; 
  nome: string; 
  nome_completo: string | null; 
  logo_url: string | null; 
  nome_stadio: string | null; 
  indirizzo: string | null; 
  mappa_url: string | null; 
} 
 
export default function DettaglioSquadra(): JSX.Element { 
  const { id } = useParams<{ id: string }>(); 
  const navigate = useNavigate(); 
  const { user } = useAuth(); 
   
  const [squadra, setSquadra] = useState<Squadra | null>(null); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null); 
 
  useEffect(() => { 
    if (!id) return; 
    (async () => { 
      setLoading(true); 
      const { data, error } = await supabase 
        .from('squadre') 
        .select('*') 
        .eq('id', id) 
        .single(); 
      if (error || !data) { 
        setError('Squadra non trovata'); 
      } else { 
        setSquadra(data); 
      } 
      setLoading(false); 
    })(); 
  }, [id]); 
 
  const handleDelete = async () => { 
    if (!id || !window.confirm('Sei sicuro di voler eliminare questa squadra?')) return; 
    const { error } = await supabase.from('squadre').delete().eq('id', id); 
    if (error) { 
      alert('Errore durante l\'eliminazione'); 
    } else { 
      navigate('/squadre'); 
    } 
  }; 
 
  if (loading) { 
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl bg-white px-6 py-4 font-bold text-[#222] shadow-xl">
          Caricamento…
        </div>
      </div>
    ); 
  } 
  if (error) { 
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl bg-white px-6 py-4 font-bold text-red-600 shadow-xl">
          {error}
        </div>
      </div>
    ); 
  } 
  if (!squadra) { 
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl bg-white px-6 py-4 font-bold text-[#222] shadow-xl">
          Nessuna squadra da mostrare
        </div>
      </div>
    ); 
  } 
 
  return ( 
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] px-[2px] pt-2 pb-6 box-border"> 
      <div className="w-full"> 

        {/* 1. Header */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-red-700 to-[#3c3c3c] shadow-[0_8px_24px_rgba(0,0,0,0.40)]">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">

            <button 
              onClick={() => navigate('/squadre')} 
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-2xl font-bold text-white transition hover:bg-black/60"
            > 
              ←
            </button> 

            <h1 className="text-center text-[17px] font-extrabold uppercase tracking-wide text-white">
              Dettaglio Squadra
            </h1>

            {(user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'creator') ? ( 
              <button 
                onClick={handleDelete} 
                className="flex items-center gap-1 text-[12px] font-extrabold uppercase text-white transition hover:text-red-100"
              > 
                <Trash2 size={18} /> 
                <span className="hidden sm:inline">Elimina</span> 
              </button> 
            ) : (
              <div className="w-10" />
            )}

          </div>
        </section>

        {/* 2. Logo + Nome Squadra */}
        <section className="relative mt-4 overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.40)]">

          <div className="pointer-events-none absolute -right-8 top-0 text-[160px] font-black leading-none text-gray-100">
            M
          </div>

          <div className="relative flex items-center gap-5 p-5">

            <div className="flex h-[130px] w-[130px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-red-600 bg-white shadow-lg">
              {squadra.logo_url ? ( 
                <img 
                  src={squadra.logo_url} 
                  alt={`Logo ${squadra.nome}`} 
                  className="h-[108px] w-[108px] object-contain" 
                /> 
              ) : ( 
                <div className="flex h-full w-full items-center justify-center bg-[#2b2b2b] text-4xl font-black text-white"> 
                  {squadra.nome.charAt(0)} 
                </div> 
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-extrabold uppercase leading-tight text-[#252525]">
                {squadra.nome.split(' ')[0]}
              </div>

              <div className="mt-1 break-words text-[26px] font-black uppercase leading-tight text-red-600">
                {squadra.nome.split(' ').slice(1).join(' ') || squadra.nome}
              </div>

              <div className="mt-4 h-[4px] w-16 rounded-full bg-red-600" />
            </div>

          </div>
        </section>

        {/* 3. Nome completo */}
        <section className="mt-4 overflow-hidden rounded-xl border-l-4 border-red-600 bg-white shadow-[0_5px_16px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-4 px-4 py-4">

            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-xl text-white shadow-md">
              🛡️
            </div>

            <div className="min-w-0 flex-1 border-l border-red-200 pl-4">
              <div className="text-[12px] font-extrabold uppercase tracking-wide text-red-600">
                Nome Completo
              </div>

              <div className="mt-1 text-[14px] font-semibold leading-tight text-[#252525]">
                {squadra.nome_completo || '—'}
              </div>
            </div>

          </div>
        </section>

        {/* 4. Nome stadio */}
        <section className="mt-3 overflow-hidden rounded-xl border-l-4 border-[#2b2b2b] bg-white shadow-[0_5px_16px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-4 px-4 py-4">

            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#2b2b2b] text-xl text-white shadow-md">
              🏟️
            </div>

            <div className="min-w-0 flex-1 border-l border-gray-300 pl-4">
              <div className="text-[12px] font-extrabold uppercase tracking-wide text-red-600">
                Nome Stadio
              </div>

              <div className="mt-1 text-[14px] font-semibold leading-tight text-[#252525]">
                {squadra.nome_stadio || '—'}
              </div>
            </div>

          </div>
        </section>

        {/* 5. Indirizzo */}
        <section className="mt-3 overflow-hidden rounded-xl border-l-4 border-red-600 bg-white shadow-[0_5px_16px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-4 px-4 py-4">

            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-xl text-white shadow-md">
              📍
            </div>

            <div className="min-w-0 flex-1 border-l border-red-200 pl-4">
              <div className="text-[12px] font-extrabold uppercase tracking-wide text-red-600">
                Indirizzo
              </div>

              <div className="mt-1 text-[14px] font-semibold leading-tight text-[#252525]">
                {squadra.indirizzo || '—'}
              </div>
            </div>

          </div>
        </section>

        {/* 6. Mappa */}
        <section className="mt-3 overflow-hidden rounded-xl border-l-4 border-[#2b2b2b] bg-white shadow-[0_5px_16px_rgba(0,0,0,0.28)]">
          <div className="p-4">

            <div className="mb-3 flex items-center gap-4">

              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#2b2b2b] text-xl text-white shadow-md">
                🗺️
              </div>

              <div className="flex-1 border-l border-gray-300 pl-4">
                <div className="text-[12px] font-extrabold uppercase tracking-wide text-red-600">
                  Mappa
                </div>

                <div className="mt-1 text-[11px] font-medium text-gray-500">
                  Posizione dello stadio
                </div>
              </div>

            </div>

            {squadra.mappa_url ? ( 
              <div className="h-64 w-full overflow-hidden rounded-xl border border-gray-300 bg-gray-100 shadow-inner"> 
                <iframe 
                  src={squadra.mappa_url} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  loading="lazy" 
                  allowFullScreen 
                /> 
              </div> 
            ) : ( 
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm font-medium text-gray-500">
                Nessuna mappa disponibile
              </div>
            )}

          </div>
        </section>

      </div>
    </div> 
  ); 
} 