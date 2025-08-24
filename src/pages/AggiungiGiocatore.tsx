// src/pages/AggiungiGiocatore.tsx
// Data creazione chat: 2025-08-14 (fix duplicati)

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

interface Stagione {
  id: string;
  nome: string;
}

export default function AggiungiGiocatore(): JSX.Element {
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [dataNascita, setDataNascita] = useState('');
  const [ruolo, setRuolo] = useState('');
  const [numeroCartellino, setNumeroCartellino] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);

  const navigate = useNavigate();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('stagioni')
        .select('id, nome')
        .order('data_inizio', { ascending: false });
      if (!error && data) setStagioni(data);
    })();
  }, []);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const resetForm = () => {
    setNome('');
    setCognome('');
    setDataNascita('');
    setRuolo('');
    setNumeroCartellino('');
    setFile(null);
    setSelectedSeasons([]);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const toggleSeason = (id: string) => {
    setSelectedSeasons(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!nome.trim() || !cognome.trim()) {
      alert('Inserisci nome e cognome');
      return;
    }
    if (selectedSeasons.length === 0) {
      alert('Seleziona almeno una stagione');
      return;
    }

    // Upload immagine se presente
    let foto_url: string | null = null;
    if (file) {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const filename = `${Date.now()}.${ext}`;
      const path = `giocatori/${filename}`;
      const { error: uploadErr } = await supabase
        .storage
        .from('giocatori')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) {
        alert('Errore upload immagine: ' + uploadErr.message);
        setUploading(false);
        return;
      }
      const { data: urlData, error: urlErr } = supabase
        .storage
        .from('giocatori')
        .getPublicUrl(path);
      if (!urlErr && urlData.publicUrl) foto_url = urlData.publicUrl;
      setUploading(false);
    }

    // Controllo duplicato
    const { data: existingPlayers, error: dupErr } = await supabase
      .from('giocatori')
      .select('id, nome, cognome')
      .ilike('nome', nome.trim())
      .ilike('cognome', cognome.trim());

    let giocatoreId: string;

    if (!dupErr && existingPlayers && existingPlayers.length > 0) {
      // Giocatore già esistente
      giocatoreId = existingPlayers[0].id;

      // Recupero stagioni già collegate
      const { data: stagEsistenti } = await supabase
        .from('giocatori_stagioni')
        .select('stagione_id')
        .eq('giocatore_uid', giocatoreId);

      const stagioniPresenti = stagEsistenti?.map(s => s.stagione_id) || [];
      const stagioniDaAggiungere = selectedSeasons.filter(
        s => !stagioniPresenti.includes(s)
      );

      if (stagioniDaAggiungere.length > 0) {
        const records = stagioniDaAggiungere.map(stagId => ({
          giocatore_uid: giocatoreId,
          stagione_id: stagId,
          ruolo: ruolo || null
        }));
        const { error: insErr } = await supabase
          .from('giocatori_stagioni')
          .insert(records);
        if (insErr) {
          alert('Errore aggiunta stagioni: ' + insErr.message);
          return;
        }
      }
      alert(`Giocatore già presente. Aggiunte stagioni: ${stagioniDaAggiungere.join(', ')}`);
    } else {
      // Nuovo giocatore → lascia creare l'UUID a Supabase
const { data: inserted, error: insertGiocErr } = await supabase
  .from('giocatori')
  .insert([{
    nome: nome.trim(),
    cognome: cognome.trim(),
    data_nascita: dataNascita || null,
    numero_cartellino: numeroCartellino ? parseInt(numeroCartellino, 10) : null,
    foto_url
  }])
  .select('id')
  .single();

if (insertGiocErr) {
  alert('Errore salvataggio giocatore: ' + insertGiocErr.message);
  return;
}

const giocatoreId = inserted.id;


      const records = selectedSeasons.map(stagId => ({
        giocatore_uid: giocatoreId,
        stagione_id: stagId,
        ruolo: ruolo || null
      }));
      const { error: insertStagErr } = await supabase
        .from('giocatori_stagioni')
        .insert(records);
      if (insertStagErr) {
        alert('Errore salvataggio stagioni giocatore: ' + insertStagErr.message);
        return;
      }
    }

    resetForm();
    navigate('/rosa');
  };

  const handleCancel = () => {
    resetForm();
    navigate('/rosa');
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-2 pt-2 max-w-md">
        <div className="bg-white/95 rounded-2xl shadow-montecarlo p-6 space-y-5">
          {/* Anteprima immagine */}
          <div className="flex justify-center mb-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Anteprima Giocatore"
                className="w-32 h-32 object-cover rounded-full border border-montecarlo-gray-300"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-2 border-dashed border-montecarlo-gray-300 flex items-center justify-center text-montecarlo-gray-300">
                Nessuna foto
              </div>
            )}
          </div>

          {/* Campi anagrafici */}
          <input type="text" placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          <input type="text" placeholder="Cognome" value={cognome} onChange={e => setCognome(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          <input type="date" value={dataNascita} onChange={e => setDataNascita(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          <input type="text" placeholder="Ruolo" value={ruolo} onChange={e => setRuolo(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          <input type="number" placeholder="Numero Cartellino" value={numeroCartellino} onChange={e => setNumeroCartellino(e.target.value)} className="w-full border rounded-lg px-3 py-2" />

          {/* Selezione stagioni */}
          <div>
            <label className="block font-semibold mb-2">Stagioni giocate:</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto border p-2 rounded-lg">
              {stagioni.map(s => (
                <label key={s.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={s.id}
                    checked={selectedSeasons.includes(s.id)}
                    onChange={() => toggleSeason(s.id)}
                  />
                  <span>{s.nome}</span>
                </label>
              ))}
            </div>
          </div>

          {/* File inputs */}
          <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

          <button type="button" onClick={() => galleryInputRef.current?.click()} className="w-full bg-gray-200 py-2 rounded-lg border">Scegli File</button>
          <button type="button" onClick={() => cameraInputRef.current?.click()} className="w-full bg-montecarlo-accent text-white py-2 rounded-lg">Scatta Foto</button>

          {/* Azioni */}
          <div className="flex space-x-4 pt-4">
            <button onClick={handleSubmit} disabled={uploading} className="flex-1 bg-montecarlo-accent text-white py-2 rounded-lg font-semibold">
              {uploading ? 'Caricamento...' : 'Salva'}
            </button>
            <button onClick={handleCancel} className="flex-1 border text-montecarlo-secondary border-montecarlo-secondary py-2 rounded-lg">Annulla</button>
          </div>
        </div>
      </div>
    </div>
  );
}
