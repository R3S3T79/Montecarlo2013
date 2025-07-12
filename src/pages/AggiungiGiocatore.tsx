// src/pages/AggiungiGiocatore.tsx

import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AggiungiGiocatore(): JSX.Element {
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [ruolo, setRuolo] = useState('');
  const [numeroCartellino, setNumeroCartellino] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const resetForm = () => {
    setNome('');
    setCognome('');
    setRuolo('');
    setNumeroCartellino('');
    setFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!nome.trim() || !cognome.trim()) {
      alert('Inserisci nome e cognome');
      return;
    }

    let foto_url: string | null = null;

    if (file) {
      setUploading(true);
      // Genera un nome univoco per il file
      const ext = file.name.split('.').pop();
      const filename = `${Date.now()}.${ext}`;
      const path = `giocatori/${filename}`;

      // 1) Upload sul bucket
      const { error: uploadErr } = await supabase
        .storage
        .from('giocatori')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) {
        console.error('Errore upload immagine:', uploadErr);
        alert('Errore durante l\'upload dell\'immagine');
        setUploading(false);
        return;
      }

      // 2) Estrai l'URL pubblico corretto
      const {
        data: { publicUrl },
        error: urlErr
      } = supabase
        .storage
        .from('giocatori')
        .getPublicUrl(path);
      if (urlErr) console.error('Errore getPublicUrl:', urlErr);

      foto_url = publicUrl;
      setUploading(false);
    }

    // 3) Inserisci il record con l’URL completo in foto_url
    const { error: insertErr } = await supabase
      .from('giocatori')
      .insert({
        nome,
        cognome,
        ruolo: ruolo || null,
        numero_cartellino: numeroCartellino ? parseInt(numeroCartellino, 10) : null,
        foto_url
      });

    if (insertErr) {
      console.error('Errore salvataggio giocatore:', insertErr);
      alert('Errore durante il salvataggio del giocatore');
      return;
    }

    resetForm();
    navigate('/rosa');
  };

  const handleCancel = () => {
    resetForm();
    navigate('/rosa');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <h1 className="text-2xl font-bold mb-4 text-center">Aggiungi Giocatore</h1>
      <div className="space-y-4 bg-white p-6 rounded-lg shadow">
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />

        <input
          type="text"
          placeholder="Cognome"
          value={cognome}
          onChange={e => setCognome(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />

        <input
          type="text"
          placeholder="Ruolo"
          value={ruolo}
          onChange={e => setRuolo(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />

        <input
          type="number"
          placeholder="Numero Cartellino"
          value={numeroCartellino}
          onChange={e => setNumeroCartellino(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />

        <input
          type="file"
          accept="image/*"
          className="w-full"
          onChange={handleFileChange}
        />

        <div className="flex space-x-4 pt-4">
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Caricamento...' : 'Salva'}
          </button>

          <button
            onClick={handleCancel}
            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded hover:bg-gray-100"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
