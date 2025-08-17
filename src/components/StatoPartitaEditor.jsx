import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function StatoPartitaEditor({ partitaId, statoAttuale }) {
  const [stato, setStato] = useState(statoAttuale || '')
  const [messaggio, setMessaggio] = useState('')

  const aggiornaStato = async () => {
    const { error } = await supabase
      .from('partite')
      .update({ stato })
      .eq('id', partitaId)

    if (error) {
     setMessaggio("Errore durante l'aggiornamento")
      console.error(error)
    } else {
      setMessaggio('Stato aggiornato correttamente')
    }
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <label>
        Stato partita:&nbsp;
        <select value={stato} onChange={(e) => setStato(e.target.value)}>
          <option value="">Seleziona stato</option>
          <option value="Giocata">Giocata</option>
          <option value="DaGiocare">DaGiocare</option>
        </select>
      </label>
      <button onClick={aggiornaStato} style={{ marginLeft: '1rem' }}>
        Salva
      </button>
      {messaggio && <p style={{ marginTop: '0.5rem', color: 'green' }}>{messaggio}</p>}
    </div>
  )
}
