// src/pages/DettaglioPartita.tsx
// Data creazione chat: 2025-08-03 
// rev3: aggiunto editor Rich Text (ReactQuill) per il campo commento, editabile da Admin/Creator

import React, { useEffect, useState, useRef } from 'react'
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
  commento?: string | null
  marcatori: MarcatoriEntry[]
}

export default function DettaglioPartita() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const containerRef = useRef<HTMLDivElement>(null)

  const [partita, setPartita] = useState<PartitaDettaglio | null>(null)
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [commento, setCommento] = useState<string>('')

  const role =
    (user?.user_metadata?.role as string) ||
    (user?.app_metadata?.role as string) ||
    'user'
  const canEdit = role === 'admin' || role === 'creator'

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B7280] to-[#bfb9b9]">
        <div className="text-white text-lg">Caricamento…</div>
      </div>
    )
  }
  if (!partita) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B7280] to-[#bfb9b9]">
        <div className="text-white text-lg">Partita non trovata</div>
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

  const goalCasaArr = [partita.goal_a1, partita.goal_a2, partita.goal_a3, partita.goal_a4]
  const goalOspiteArr = [partita.goal_b1, partita.goal_b2, partita.goal_b3, partita.goal_b4]

  const renderSezione = (squadra: SquadraInfo, goals: number[]) => {
    const total = goals.reduce((a, b) => a + b, 0)
    const isMonte = squadra.nome === 'Montecarlo'
    const marcatoriByTempo = (t: number) => partita.marcatori.filter(m => m.periodo === t)

    return (
      <div className="bg-white/90 rounded-lg shadow-montecarlo overflow-hidden">
        <div
          className={`p-4 flex items-center justify-between ${
            isMonte
              ? 'bg-montecarlo-red-50 border border-montecarlo-red-200'
              : 'bg-montecarlo-gray-50 border border-montecarlo-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {squadra.logo_url && (
              <img src={squadra.logo_url} alt={squadra.nome} className="w-8 h-8 object-contain" />
            )}
            <span
              className={`font-bold text-lg ${
                isMonte ? 'text-montecarlo-secondary' : 'text-gray-900'
              }`}
            >
              {squadra.nome}
            </span>
          </div>
          <span
            className={`font-bold text-2xl ${
              isMonte ? 'text-montecarlo-secondary' : 'text-gray-900'
            }`}
          >
            {total}
          </span>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map(tempo => (
            <div key={tempo}>
              <div className="flex justify-between">
                <span
                  className={`font-medium ${isMonte ? 'text-montecarlo-secondary' : 'text-gray-900'}`}
                >
                  {tempo}° Tempo
                </span>
                <span
                  className={`font-semibold ${isMonte ? 'text-montecarlo-secondary' : 'text-gray-900'}`}
                >
                  {goals[tempo - 1]}
                </span>
              </div>
              {isMonte && (
                <ul className="list-disc list-inside text-gray-700 text-lg mt-2">
                  {marcatoriByTempo(tempo).map((m, i) => (
                    <li key={i}>
                      {m.giocatore.cognome} {m.giocatore.nome}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-2 pb-2">
      <div className="max-w-md mx-auto text-xl" ref={containerRef}>
        <div className="bg-white/20 rounded-xl shadow-montecarlo -mt-2">
          {/* header: solo data */}
          <div className="bg-montecarlo-red-10/20 border-l-4 border-montecarlo-secondary flex justify-end px-6 py-4 rounded-t-xl">
            <span className="bg-montecarlo-accent text-montecarlo-secondary px-3 py-1 rounded-full text-sm font-medium shadow-gold">
              {dataFormatted}
            </span>
          </div>

          <div className="p-6 space-y-6">
            {renderSezione(partita.casa, goalCasaArr)}
            {renderSezione(partita.ospite, goalOspiteArr)}

            {/* Riepilogo / Telecronaca */}
            <div className="mt-6 bg-white/90 rounded-lg shadow-montecarlo p-4 relative">
              {canEdit && !editing && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="text-gray-600 hover:text-montecarlo-secondary"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-gray-600 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </div>
              )}

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
                  <div className="flex justify-end mt-2 gap-2">
                    <button
                      onClick={() => {
                        setEditing(false)
                        setCommento(partita.commento || '')
                      }}
                      className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1 rounded bg-montecarlo-accent text-white hover:bg-montecarlo-secondary"
                    >
                      Salva
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm text-gray-800 prose max-w-none"
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
        </div>
      </div>
    </div>
  )
}
