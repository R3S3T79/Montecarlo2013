// src/pages/EditSquadra.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Save, X } from 'lucide-react';

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
  nome_stadio: string | null;
  indirizzo: string | null;
  mappa_url: string | null;
}

export default function EditSquadra(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Squadra>({
    id: '',
    nome: '',
    logo_url: null,
    nome_stadio: null,
    indirizzo: null,
    mappa_url: null,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/squadre');
      return;
    }
    
    const fetchSquadra = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from<Squadra>('squadre')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Errore caricamento squadra:', error);
        setError('Impossibile caricare i dati della squadra');
      } else if (data) {
        setFormData(data);
        setLogoPreview(data.logo_url);
      }
      setLoading(false);
    };

    fetchSquadra();
  }, [id, navigate]);

  const handleInputChange = (field: keyof Squadra, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value || null
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Crea preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logo_url: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      let logo_url = formData.logo_url;

      // Se c'è un nuovo file logo, caricalo
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const filename = `${Date.now()}.${ext}`;
        const path = `squadre/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from('squadre')
          .upload(path, logoFile, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          throw new Error('Errore durante l\'upload del logo: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('squadre')
          .getPublicUrl(path);

        logo_url = publicUrl;
      }

      // Aggiorna la squadra nel database
      const { error: updateError } = await supabase
        .from('squadre')
        .update({
          nome: formData.nome,
          logo_url,
          nome_stadio: formData.nome_stadio || null,
          indirizzo: formData.indirizzo || null,
          mappa_url: formData.mappa_url || null,
        })
        .eq('id', id);

      if (updateError) {
        throw new Error('Errore durante il salvataggio: ' + updateError.message);
      }

      // Torna alla pagina di dettaglio
      navigate(`/squadre/${id}`);
    } catch (err: any) {
      console.error('Errore salvataggio:', err);
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/squadre/${id}`);
  };

  if (loading) {
    return <div className="p-4 text-center">Caricamento…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancel}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              <span className="ml-2">Annulla</span>
            </button>
            <h1 className="text-xl font-semibold">Modifica Squadra</h1>
            <div className="w-20"></div> {/* Spacer per centrare il titolo */}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Nome Squadra */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Squadra *
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Inserisci il nome della squadra"
            />
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo Squadra
            </label>
            
            {logoPreview && (
              <div className="mb-4 flex items-center space-x-4">
                <img
                  src={logoPreview}
                  alt="Preview logo"
                  className="w-16 h-16 object-contain border rounded"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="flex items-center text-red-600 hover:text-red-800"
                >
                  <X size={16} />
                  <span className="ml-1">Rimuovi</span>
                </button>
              </div>
            )}
            
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Formati supportati: JPG, PNG, GIF
            </p>
          </div>

          {/* Nome Stadio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Stadio
            </label>
            <input
              type="text"
              value={formData.nome_stadio || ''}
              onChange={(e) => handleInputChange('nome_stadio', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Inserisci il nome dello stadio"
            />
          </div>

          {/* Indirizzo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Indirizzo
            </label>
            <input
              type="text"
              value={formData.indirizzo || ''}
              onChange={(e) => handleInputChange('indirizzo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Inserisci l'indirizzo dello stadio"
            />
          </div>

          {/* URL Mappa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Mappa Google Maps
            </label>
            <input
              type="url"
              value={formData.mappa_url || ''}
              onChange={(e) => handleInputChange('mappa_url', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Inserisci l'URL di embed di Google Maps (deve contenere "/maps/embed?pb=")
            </p>
          </div>

          {/* Pulsanti */}
          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || !formData.nome.trim()}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} className="mr-2" />
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}