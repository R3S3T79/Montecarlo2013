// src/pages/EditGiocatore.tsx
// Data creazione chat: 14/08/2025 (rev: fix campi nome/cognome da v_giocatori_completo)

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface Stagione {
  id: string;
  stagione_nome: string;
}

interface GiocatoreView {
  giocatore_stagione_id: string;
  giocatore_uid: string;
  stagione_id: string;
  stagione_nome: string;
  nome: string;             // 🔹 corretto
  cognome: string;          // 🔹 corretto
  data_nascita: string | null;
  ruolo: string | null;
  numero_cartellino: number | null;
  foto_url: string | null;
}

export default function EditGiocatore() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'nuovo';
  const navigate = useNavigate();

  // Stati anagrafica
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [dataNascita, setDataNascita] = useState('');
  const [ruolo, setRuolo] = useState('');
  const [numeroCartellino, setNumeroCartellino] = useState<number | ''>('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Stagioni
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioniSelezionate, setStagioniSelezionate] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Carico stagioni disponibili
  useEffect(() => {
    supabase
      .from('stagioni')
      .select('id, nome')
      .order('data_inizio', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setStagioni(data.map(s => ({ id: s.id, stagione_nome: s.nome })));
        }
      });
  }, []);

  // Carico dati giocatore se modifica
  useEffect(() => {
    if (isNew) return;

    (async () => {
      const { data, error } = await supabase
        .from<GiocatoreView>('v_giocatori_completo')
        .select('*')
        .eq('giocatore_uid', id)
        .order('stagione_id', { ascending: false });

      if (error || !data || data.length === 0) {
        console.error('Errore caricamento dati giocatore:', error);
        return;
      }

      const latest = data[0];
      setNome(latest.nome);
      setCognome(latest.cognome);
      setDataNascita(latest.data_nascita || '');
      setRuolo(latest.ruolo || '');
      setNumeroCartellino(latest.numero_cartellino ?? '');
      setFotoUrl(latest.foto_url);
      setStagioniSelezionate(data.map(r => r.stagione_id));
    })();
  }, [id, isNew]);

  // Gestione stagioni
  const handleStagioneChange = (stagId: string) => {
    setStagioniSelezionate(prev =>
      prev.includes(stagId) ? prev.filter(x => x !== stagId) : [...prev, stagId]
    );
  };

  // Gestione file foto
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      setFile(f);
      setFotoUrl(URL.createObjectURL(f));
    }
  };
  const handleScattaFoto = () => inputRef.current?.click();

  // Salvataggio
  const handleSubmit = async () => {
    if (!nome.trim() || !cognome.trim()) {
      alert('Inserisci nome e cognome.');
      return;
    }
    if (stagioniSelezionate.length === 0) {
      alert('Seleziona almeno una stagione.');
      return;
    }

    // Upload immagine se presente
    let finalFotoUrl = fotoUrl;
    if (file) {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('giocatori')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Errore upload immagine:', uploadError);
        alert('Impossibile caricare l\'immagine.');
        return;
      }
      const { data: pu } = supabase.storage.from('giocatori').getPublicUrl(fileName);
      finalFotoUrl = pu.publicUrl;
    }

    if (isNew) {
      // Creo giocatore
      const newGiocatoreUid = crypto.randomUUID();
      const { error: insertPlayerErr } = await supabase
        .from('giocatori')
        .insert([{
          id: newGiocatoreUid,
          nome: nome.trim(),
          cognome: cognome.trim(),
          foto_url: finalFotoUrl,
          data_nascita: dataNascita || null,
          numero_cartellino: numeroCartellino === '' ? null : Number(numeroCartellino)
        }]);

      if (insertPlayerErr) {
        console.error('Errore creazione giocatore:', insertPlayerErr);
        alert('Errore durante la creazione.');
        return;
      }

      // Creo associazioni stagioni con ruolo
      const records = stagioniSelezionate.map(stagId => ({
        giocatore_uid: newGiocatoreUid,
        stagione_id: stagId,
        ruolo: ruolo || null,
        nome: nome.trim(),
        cognome: cognome.trim()
      }));
      const { error: insertStagErr } = await supabase
        .from('giocatori_stagioni')
        .insert(records);

      if (insertStagErr) {
        console.error('Errore creazione stagioni:', insertStagErr);
        alert('Errore durante la creazione.');
        return;
      }

    } else {
      // Aggiorno giocatore
      const { error: updatePlayerErr } = await supabase
        .from('giocatori')
        .update({
          nome: nome.trim(),
          cognome: cognome.trim(),
          foto_url: finalFotoUrl,
          data_nascita: dataNascita || null,
          numero_cartellino: numeroCartellino === '' ? null : Number(numeroCartellino)
        })
        .eq('id', id);

      if (updatePlayerErr) {
        console.error('Errore aggiornamento giocatore:', updatePlayerErr);
        alert('Errore durante l\'aggiornamento.');
        return;
      }

      // Update stagioni già presenti
      const { error: updErr } = await supabase
        .from('giocatori_stagioni')
        .update({
          ruolo: ruolo || null,
          nome: nome.trim(),
          cognome: cognome.trim()
        })
        .eq('giocatore_uid', id)
        .in('stagione_id', stagioniSelezionate);

      if (updErr) {
        console.error('Errore update stagioni esistenti:', updErr);
        alert('Errore durante l\'aggiornamento delle stagioni.');
        return;
      }

      // Inserisci solo stagioni mancanti
      const { data: esistenti, error: exErr } = await supabase
        .from('giocatori_stagioni')
        .select('stagione_id')
        .eq('giocatore_uid', id);

      if (exErr) {
        console.error('Errore lettura stagioni esistenti:', exErr);
        alert('Errore durante la lettura delle stagioni.');
        return;
      }

      const setEsistenti = new Set((esistenti || []).map(r => r.stagione_id));
      const daInserire = stagioniSelezionate.filter(sid => !setEsistenti.has(sid));

      if (daInserire.length > 0) {
        const nuovi = daInserire.map(stagId => ({
          giocatore_uid: id!,
          stagione_id: stagId,
          ruolo: ruolo || null,
          nome: nome.trim(),
          cognome: cognome.trim()
        }));
        const { error: insErr } = await supabase
          .from('giocatori_stagioni')
          .insert(nuovi);

        if (insErr) {
          console.error('Errore insert nuove stagioni:', insErr);
          alert('Errore durante l\'inserimento delle nuove stagioni.');
          return;
        }
      }
    }

    navigate('/rosa');
  };

  const handleAnnulla = () => navigate('/rosa');

  return (
    <div className="bg-white/90 max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      {/* Nome */}
      <label className="block font-medium">Nome</label>
      <input
        type="text"
        value={nome}
        onChange={e => setNome(e.target.value)}
        className="w-full border px-3 py-2 rounded mb-3"
      />

      {/* Cognome */}
      <label className="block font-medium">Cognome</label>
      <input
        type="text"
        value={cognome}
        onChange={e => setCognome(e.target.value)}
        className="w-full border px-3 py-2 rounded mb-3"
      />

      {/* Data nascita */}
      <label className="block font-medium">Data di nascita</label>
      <input
        type="date"
        value={dataNascita}
        onChange={e => setDataNascita(e.target.value)}
        className="w-full border px-3 py-2 rounded mb-3"
      />

      {/* Ruolo */}
<label className="block font-medium">Ruolo</label>
<select
  value={ruolo}
  onChange={e => setRuolo(e.target.value)}
  className="w-full border px-3 py-2 rounded mb-3"
>
  <option value="">-- Seleziona ruolo --</option>
  <option value="Portiere">Portiere</option>
  <option value="Difensore">Difensore</option>
  <option value="Centrocampista">Centrocampista</option>
  <option value="Attaccante">Attaccante</option>
</select>

      {/* Numero cartellino */}
      <label className="block font-medium">Numero Cartellino</label>
      <input
        type="number"
        value={numeroCartellino}
        onChange={e => setNumeroCartellino(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-full border px-3 py-2 rounded mb-3"
      />

      {/* Foto */}
      <label className="block font-medium mb-1">Foto Giocatore</label>
      <div className="flex gap-2 mb-4">
        <button onClick={handleScattaFoto} className="bg-blue-600 text-white px-4 py-2 rounded">
          Scatta Foto
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <label className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer flex items-center justify-center">
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          Carica File
        </label>
        {fotoUrl && <img src={fotoUrl} alt="anteprima" className="w-16 h-16 rounded-full" />}
      </div>

      {/* Stagioni */}
      <label className="block font-medium mb-2">Stagioni a Montecarlo</label>
      <div className="flex flex-col gap-1 max-h-40 overflow-auto mb-6">
        {stagioni.map(s => (
          <label key={s.id} className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={stagioniSelezionate.includes(s.id)}
              onChange={() => handleStagioneChange(s.id)}
            />
            {s.stagione_nome}
          </label>
        ))}
      </div>

      {/* Azioni */}
      <div className="flex justify-between">
        <button onClick={handleAnnulla} className="bg-gray-400 text-white px-4 py-2 rounded">
          Annulla
        </button>
        <button onClick={handleSubmit} className="bg-red-600 text-white px-4 py-2 rounded">
          {isNew ? 'Crea' : 'Aggiorna'}
        </button>
      </div>
    </div>
  );
}
