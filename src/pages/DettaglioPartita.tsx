// src/pages/DettaglioPartita.tsx
// Data creazione chat: 2025-08-03 
// rev3: aggiunto editor Rich Text (ReactQuill) per il campo commento, editabile da Admin/Creator

import { useEffect, useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

interface MarcatoriEntry {
  periodo: number
  giocatore: { nome: string; cognome: string }
}
interface TiroRigore {
  id: string
  giocatore_stagione_id: string | null
  squadra_id: string
  ordine: number
  esito: 'segnato' | 'sbagliato'
  giocatore?: {
    nome: string
    cognome: string
  } | null
}

interface SquadraInfo {
  id: string
  nome: string
  logo_url?: string | null
}

interface PartitaDettaglio {
  id: string
  stagione_id: string
  data_ora: string
  casa: SquadraInfo
  ospite: SquadraInfo
  goal_a1: number
  goal_a2: number
  goal_a3: number
  goal_a4: number
  goal_b1: number
  goal_b2: number
  goal_b3: number
  goal_b4: number
  rigori_a: number
  rigori_b: number
  commento?: string | null
  marcatori: MarcatoriEntry[]
}

export default function DettaglioPartita() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const containerRef = useRef<HTMLDivElement>(null)

  const [partita, setPartita] = useState<PartitaDettaglio | null>(null)
  const [tiriRigori, setTiriRigori] = useState<TiroRigore[]>([])
  const [loading, setLoading] = useState(true)
  const [supplementariGiocati, setSupplementariGiocati] = useState(false)

  const [editing, setEditing] = useState(false)
  const [commento, setCommento] = useState<string>('')

const [role, setRole] = useState<string | null>(null);
const [, setRoleLoading] = useState(true);

useEffect(() => {
  (async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userNow = sessionData?.session?.user;

    if (!userNow) {
      setRole(null);
      setRoleLoading(false);
      return;
    }

    const { data: prof, error } = await supabase
      .from("user_profiles")
      .select("role::text")
      .eq("user_id", userNow.id)
      .maybeSingle();

    if (!error && prof?.role) setRole(prof.role);
    else setRole(
      (userNow.user_metadata?.role as string) ||
      (userNow.app_metadata?.role as string) ||
      null
    );

    setRoleLoading(false);
  })();
}, []);

const canEdit = role === "admin" || role === "creator";


  const handleScreenshot = async () => {
    if (!containerRef.current) return
    const canvas = await html2canvas(containerRef.current)
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = 'partita.png'
    link.click()
  }

  useEffect(() => {
    const listener = () => {
      handleScreenshot()
    }
    window.addEventListener('capture-container', listener)
    return () => {
      window.removeEventListener('capture-container', listener)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true })
  }, [user, authLoading, navigate])

  useEffect(() => {
    async function fetchDetail() {
      if (!id) {
        setLoading(false)
        return
      }

      const { data: pd, error: errPd } = await supabase
        .from('partite')
        .select(`
          id,
          stagione_id,
          data_ora,
          goal_a1, goal_a2, goal_a3, goal_a4,
goal_b1, goal_b2, goal_b3, goal_b4,
rigori_a, rigori_b,
commento,
          casa: squadra_casa_id ( id, nome, logo_url ),
          ospite: squadra_ospite_id ( id, nome, logo_url )
        `)
        .eq('id', id)
        .single()

      if (errPd || !pd) {
        console.error(errPd)
        setLoading(false)
        return
      }

      const { data: marcatoriData, error: errMd } = await supabase
        .from('marcatori_alias')
        .select('periodo, giocatore_stagione_id, giocatore_nome, giocatore_cognome')
        .eq('partita_id', id)

      if (errMd) console.error(errMd)

              const { data: rigoriData, error: errRigori } = await supabase
        .from('rigori_partita')
        .select(`
          id,
          giocatore_stagione_id,
          squadra_id,
          ordine,
          esito
        `)
        .eq('partita_id', id)
        .order('ordine', { ascending: true })

      if (errRigori) {
  console.error('Errore caricamento dettaglio rigori:', errRigori)
} else {
  const rigori = (rigoriData || []) as TiroRigore[]

  const giocatoriIds = rigori
    .map(r => r.giocatore_stagione_id)
    .filter((gid): gid is string => !!gid)

  let giocatoriRigori: {
    id: string
    nome: string | null
    cognome: string | null
  }[] = []

  if (giocatoriIds.length > 0) {
    const { data: giocatoriData, error: errGiocatori } = await supabase
      .from('giocatori_stagioni')
      .select('id, nome, cognome')
      .in('id', giocatoriIds)

    if (errGiocatori) {
      console.error(
        'Errore caricamento rigoristi:',
        errGiocatori
      )
    } else {
      giocatoriRigori = giocatoriData || []
    }
  }

  const rigoriConGiocatore = rigori.map(r => {
    const giocatore = giocatoriRigori.find(
      g => g.id === r.giocatore_stagione_id
    )

    return {
      ...r,
      giocatore: giocatore
        ? {
            nome: giocatore.nome || '',
            cognome: giocatore.cognome || ''
          }
        : null
    }
  })

  setTiriRigori(rigoriConGiocatore)
}

              const { data: supplementariData, error: errSupplementari } = await supabase
        .from('minuti_giocati')
        .select('id')
        .eq('partita_id', id)
        .in('run_index', [3, 4])
        .limit(1)

      if (errSupplementari) {
        console.error('Errore verifica supplementari:', errSupplementari)
      } else {
        setSupplementariGiocati((supplementariData || []).length > 0)
      }

      const marcatori: MarcatoriEntry[] = (marcatoriData || [])
        .filter(m => m.giocatore_nome || m.giocatore_cognome)
        .map(m => ({
          periodo: m.periodo,
          giocatore: {
            nome: m.giocatore_nome || '',
            cognome: m.giocatore_cognome || ''
          }
        }))

      setPartita({ ...(pd as any), marcatori })
      setCommento(pd.commento || '')
      setLoading(false)
    }

    if (user) fetchDetail()
  }, [id, user, authLoading, navigate])

  const handleSave = async () => {
    if (!id) return
    const { error } = await supabase
      .from('partite')
      .update({ commento })
      .eq('id', id)

    if (error) {
      console.error('Errore salvataggio commento:', error)
      return
    }
    if (partita) setPartita({ ...partita, commento })
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!id) return
    const { error } = await supabase
      .from('partite')
      .update({ commento: null })
      .eq('id', id)

    if (error) {
      console.error('Errore eliminazione commento:', error)
      return
    }
    if (partita) setPartita({ ...partita, commento: null })
    setCommento('')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-xl border border-white/20 bg-black/60 px-6 py-4 text-lg font-semibold text-white shadow-xl">
          Caricamento…
        </div>
      </div>
    )
  }
  if (!partita) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-xl border border-white/20 bg-black/60 px-6 py-4 text-lg font-semibold text-white shadow-xl">
          Partita non trovata
        </div>
      </div>
    )
  }

  const dataFormatted = new Date(partita.data_ora)
    .toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    .replace(/^./, ch => ch.toUpperCase())

  const oraFormatted = new Date(partita.data_ora)
    .toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    })

  const goalCasaArr = [
  partita.goal_a1,
  partita.goal_a2,
  partita.goal_a3,
  partita.goal_a4
]

const goalOspiteArr = [
  partita.goal_b1,
  partita.goal_b2,
  partita.goal_b3,
  partita.goal_b4
]

  const totaleCasa = goalCasaArr.reduce((a, b) => a + b, 0)
  const totaleOspite = goalOspiteArr.reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen w-full px-[2px] pb-4 box-border">
      <div className="w-full max-w-md mx-auto" ref={containerRef}>

        {/* 1. Data partita */}
        <div className="mb-3 flex items-center rounded-xl border border-white/20 bg-black/65 px-4 py-3 shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
          <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-lg text-white">
            📅
          </div>

          <div className="text-[14px] font-semibold text-white">
            {dataFormatted} - {oraFormatted}
          </div>
        </div>

        {/* 2. Risultato principale */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-[0_10px_28px_rgba(0,0,0,0.42)]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5">

            <div className="flex min-w-0 flex-col items-center">
              {partita.casa.logo_url && (
                <img
                  src={partita.casa.logo_url}
                  alt={partita.casa.nome}
                  className="mb-2 h-16 w-16 object-contain"
                />
              )}

              <div className="w-full truncate text-center text-[15px] font-extrabold text-[#181818]">
                {partita.casa.nome}
              </div>

              <div className="mt-2 h-1 w-[80%] rounded-full bg-red-600" />
            </div>

            <div className="flex items-center gap-3 px-2">
              <span className="text-[48px] font-black leading-none text-[#151515]">
                {totaleCasa}
              </span>

              <span className="h-12 w-[2px] bg-red-500" />

              <span className="text-[48px] font-black leading-none text-[#151515]">
                {totaleOspite}
              </span>
            </div>

            <div className="flex min-w-0 flex-col items-center">
              {partita.ospite.logo_url && (
                <img
                  src={partita.ospite.logo_url}
                  alt={partita.ospite.nome}
                  className="mb-2 h-16 w-16 object-contain"
                />
              )}

              <div className="w-full truncate text-center text-[15px] font-extrabold text-[#181818]">
                {partita.ospite.nome}
              </div>

              <div className="mt-2 h-1 w-[80%] rounded-full bg-[#244fa3]" />
            </div>
          </div>

          <div className="flex justify-center pb-4">
            <div className="rounded-full border border-gray-300 bg-white px-4 py-1 text-xs font-semibold text-gray-700 shadow-sm">
              ⏱ Terminata
            </div>
          </div>
        </div>

        {/* 3. Marcatori */}
        <div className="mb-4 overflow-hidden rounded-2xl bg-white/95 shadow-[0_8px_22px_rgba(0,0,0,0.38)]">

          <div className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-white">
            <span className="text-xl">⚽</span>
            <span className="font-extrabold uppercase tracking-wide">
              Marcatori
            </span>
          </div>

          <div className="p-4">
            {partita.marcatori.length > 0 ? (
              <div className="space-y-3">
                {partita.marcatori.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-base shadow-sm">
                      ⚽
                    </div>

                    <div>
                      <div className="text-[12px] font-medium text-gray-500">
                        {m.periodo === 1
                          ? '1° Tempo'
                          : m.periodo === 2
                            ? '2° Tempo'
                            : m.periodo === 3
                              ? '1° Supplementare'
                              : '2° Supplementare'}
                      </div>

                      <div className="text-[14px] font-bold text-[#181818]">
                        {m.giocatore?.cognome || ''} {m.giocatore?.nome || ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-center text-sm text-gray-500">
                Nessun marcatore registrato
              </div>
            )}
          </div>
        </div>

        {/* 4. Parziali */}
        <div className="mb-4 overflow-hidden rounded-2xl bg-white/95 shadow-[0_8px_22px_rgba(0,0,0,0.38)]">

          <div className="bg-gradient-to-r from-[#242424] to-[#3b3b3b] px-4 py-3 text-center font-extrabold text-white">
            Parziali
          </div>

          <div className="divide-y divide-gray-200">

            <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
              <div className="text-left text-sm font-semibold text-[#222]">
                {partita.casa.nome}
              </div>
              <div className="px-4 text-xs font-bold uppercase text-gray-500">
                1° Tempo
              </div>
              <div className="text-right text-sm font-semibold text-[#222]">
                {partita.ospite.nome}
              </div>

              <div className="mt-1 text-left text-xl font-black text-red-600">
                {partita.goal_a1}
              </div>
              <div />
              <div className="mt-1 text-right text-xl font-black text-[#244fa3]">
                {partita.goal_b1}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
              <div className="text-left text-sm font-semibold text-[#222]">
                {partita.casa.nome}
              </div>
              <div className="px-4 text-xs font-bold uppercase text-gray-500">
                2° Tempo
              </div>
              <div className="text-right text-sm font-semibold text-[#222]">
                {partita.ospite.nome}
              </div>

              <div className="mt-1 text-left text-xl font-black text-red-600">
                {partita.goal_a2}
              </div>
              <div />
              <div className="mt-1 text-right text-xl font-black text-[#244fa3]">
                {partita.goal_b2}
              </div>
            </div>

            {supplementariGiocati && (
              <>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
                  <div className="text-left text-sm font-semibold text-[#222]">
                    {partita.casa.nome}
                  </div>
                  <div className="px-4 text-xs font-bold uppercase text-gray-500">
                    1° Suppl.
                  </div>
                  <div className="text-right text-sm font-semibold text-[#222]">
                    {partita.ospite.nome}
                  </div>

                  <div className="mt-1 text-left text-xl font-black text-red-600">
                    {partita.goal_a3}
                  </div>
                  <div />
                  <div className="mt-1 text-right text-xl font-black text-[#244fa3]">
                    {partita.goal_b3}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
                  <div className="text-left text-sm font-semibold text-[#222]">
                    {partita.casa.nome}
                  </div>
                  <div className="px-4 text-xs font-bold uppercase text-gray-500">
                    2° Suppl.
                  </div>
                  <div className="text-right text-sm font-semibold text-[#222]">
                    {partita.ospite.nome}
                  </div>

                  <div className="mt-1 text-left text-xl font-black text-red-600">
                    {partita.goal_a4}
                  </div>
                  <div />
                  <div className="mt-1 text-right text-xl font-black text-[#244fa3]">
                    {partita.goal_b4}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* 5. Rigori */}
        {((partita.rigori_a ?? 0) > 0 || (partita.rigori_b ?? 0) > 0) && (
          <div className="mb-4 overflow-hidden rounded-2xl bg-white/95 shadow-[0_8px_22px_rgba(0,0,0,0.38)]">

            <div className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-white">
              <span className="text-xl">🥅</span>
              <span className="font-extrabold uppercase tracking-wide">
                Rigori
              </span>
            </div>

            <div className="p-4">

              <div className="mb-4 text-center text-[16px] font-extrabold text-[#181818]">
                {partita.casa.nome}{' '}
                <span className="text-red-600">
                  {partita.rigori_a ?? 0} - {partita.rigori_b ?? 0}
                </span>{' '}
                {partita.ospite.nome}
              </div>

              <div className="space-y-2">
                {tiriRigori.map((tiro) => {
                  const isCasa = tiro.squadra_id === partita.casa.id
                  const isMontecarlo =
                    tiro.squadra_id === partita.casa.id
                      ? partita.casa.nome === 'Montecarlo'
                      : partita.ospite.nome === 'Montecarlo'

                  const nomeRigorista =
                    isMontecarlo && tiro.giocatore
                      ? `${tiro.giocatore.cognome} ${tiro.giocatore.nome}`.trim()
                      : `Rigore ${tiro.ordine}`

                  return (
                    <div
                      key={tiro.id}
                      className={`flex ${
                        isCasa ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div className="flex min-w-[48%] items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                        <span
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                            isCasa ? 'bg-red-600' : 'bg-[#244fa3]'
                          }`}
                        >
                          {tiro.ordine}
                        </span>

                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#222]">
                          {nomeRigorista}
                        </span>

                        <span className="font-bold">
                          {tiro.esito === 'segnato' ? '✅' : '❌'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        )}

        {/* 6. Supplementari */}
        <div className="mb-4 overflow-hidden rounded-2xl bg-white/95 shadow-[0_8px_22px_rgba(0,0,0,0.38)]">

          <div className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-white">
            <span className="text-xl">⏱</span>
            <span className="font-extrabold uppercase tracking-wide">
              Supplementari
            </span>
          </div>

          <div className="flex items-center justify-center gap-4 px-4 py-5">
            <span className="text-sm font-medium text-gray-700">
              Supplementari giocati
            </span>

            <span
              className={`rounded-full px-5 py-1 text-sm font-bold ${
                supplementariGiocati
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {supplementariGiocati ? 'Sì' : 'No'}
            </span>
          </div>
        </div>

        {/* 7. Commento / Telecronaca */}
        <div className="mb-4 overflow-hidden rounded-2xl bg-white/95 shadow-[0_8px_22px_rgba(0,0,0,0.38)]">

          <div className="relative flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-white">
            <span className="text-xl">💬</span>

            <span className="font-extrabold uppercase tracking-wide">
              Commento
            </span>

            {canEdit && !editing && (
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg bg-white px-3 py-1 text-sm font-bold text-red-600 shadow-sm"
                >
                  ✏️ Modifica
                </button>

                <button
                  onClick={handleDelete}
                  className="rounded-lg bg-white px-2 py-1 text-sm text-red-600 shadow-sm"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {editing ? (
              <div>
                <ReactQuill
                  theme="snow"
                  value={commento}
                  onChange={setCommento}
                  modules={{
                    toolbar: [
                      [{ 'font': [] }, { 'size': [] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'align': [] }],
                      ['clean']
                    ]
                  }}
                />

                <div className="flex justify-end mt-3 gap-2">
                  <button
                    onClick={() => {
                      setEditing(false)
                      setCommento(partita.commento || '')
                    }}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                  >
                    Annulla
                  </button>

                  <button
                    onClick={handleSave}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Salva
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="prose max-w-none text-sm leading-relaxed text-gray-800"
                dangerouslySetInnerHTML={{
                  __html:
                    partita.commento && partita.commento.trim() !== ''
                      ? partita.commento
                      : 'Riepilogo Partita'
                }}
              />
            )}
          </div>
        </div>

        {/* 8. Azioni */}
        <div className="grid grid-cols-2 gap-3">

          <button
            onClick={handleScreenshot}
            className="rounded-full border border-white/30 bg-black/75 px-4 py-3 font-bold text-white shadow-[0_6px_18px_rgba(0,0,0,0.38)]"
          >
            📷 Screenshot
          </button>

          <button
            onClick={() => navigate('/risultati')}
            className="rounded-full bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 font-bold text-white shadow-[0_6px_18px_rgba(0,0,0,0.38)]"
          >
            ☷ Lista Partite
          </button>

        </div>

      </div>
    </div>
  )
}