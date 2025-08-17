// src/pages/EditSquadra.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Save, X } from 'lucide-react';

interface Squadra {
  id: string;
  nome: string;
  nome_completo: string | null;
  logo_url: string | null;
  nome_stadio: string | null;
  indirizzo: string | null;
  mappa_url: string | null;
}

export default function EditSquadra(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Squadra>({
    id: '',
    nome: '',
    nome_completo: null,
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
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from<Squadra>('squadre')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        setError('Impossibile caricare la squadra');
      } else {
        setFormData(data);
        setLogoPreview(data.logo_url);
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  const handleInputChange = (field: keyof Squadra, value: string) => {
    setFormData(f => ({ ...f, [field]: value || null }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData(f => ({ ...f, logo_url: null }));
  };

  const handleCancel = () => {
    navigate('/squadre');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      let logo_url = formData.logo_url;

      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const filename = `${Date.now()}.${ext}`;
        const path = `squadre/${filename}`;
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(path, logoFile, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage
          .from('logos')
          .getPublicUrl(path);
        logo_url = data.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('squadre')
        .update({
          nome: formData.nome,
          nome_completo: formData.nome_completo,
          logo_url,
          nome_stadio: formData.nome_stadio,
          indirizzo: formData.indirizzo,
          mappa_url: formData.mappa_url,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      navigate('/squadre');
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Caricamento…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo Squadra
          </label>
          {logoPreview && (
            <div className="flex items-center mb-4 space-x-4">
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
          <p className="text-sm text-gray-500 mt-1">JPG, PNG, GIF</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Squadra *
          </label>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={e => handleInputChange('nome', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Completo
          </label>
          <input
            type="text"
            value={formData.nome_completo || ''}
            onChange={e => handleInputChange('nome_completo', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Stadio
          </label>
          <input
            type="text"
            value={formData.nome_stadio || ''}
            onChange={e => handleInputChange('nome_stadio', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Indirizzo
          </label>
          <input
            type="text"
            value={formData.indirizzo || ''}
            onChange={e => handleInputChange('indirizzo', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL mappa Google Maps
          </label>
          <input
            type="url"
            value={formData.mappa_url || ''}
            onChange={e => handleInputChange('mappa_url', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://www.google.com/maps/embed?pb=..."
          />
          <p className="text-sm text-gray-500 mt-1">
            deve contenere "/maps/embed?pb="
          </p>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={saving || !formData.nome.trim()}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save size={16} className="mr-2" />
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </form>
    </div>
  );
}
