// src/pages/EditSquadra.tsx
// Data creazione chat: 13/09/2026

import { useEffect, useState } from 'react';
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

// =========================
// 1. COMPONENTE
// =========================

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

  // =========================
  // 2. CARICAMENTO SQUADRA
  // =========================

  useEffect(() => {
    if (!id) {
      navigate('/squadre');
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('squadre')
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

  // =========================
  // 3. GESTIONE CAMPI
  // =========================

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

  // =========================
  // 4. SALVATAGGIO
  // =========================

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

  // =========================
  // 5. CARICAMENTO
  // =========================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b] flex items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-[#252525]/90 px-6 py-4 font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          Caricamento…
        </div>
      </div>
    );
  }

  // =========================
  // 6. RENDER
  // =========================

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b]">
      <div className="max-w-3xl mx-auto px-3 py-5">
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#252525]/95 shadow-[0_10px_30px_rgba(0,0,0,0.40)]"
        >
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4">
            <div className="text-lg font-bold text-white">
              Modifica Squadra
            </div>
            <div className="mt-1 text-xs text-white/80">
              Aggiorna i dati della squadra
            </div>
          </div>

          <div className="space-y-6 p-5">
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Logo Squadra
              </label>

              {logoPreview && (
                <div className="mb-4 flex items-center space-x-4 rounded-xl border border-white/10 bg-[#1f1f1f] p-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white p-2 shadow">
                    <img
                      src={logoPreview}
                      alt="Preview logo"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="flex items-center rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-900/40"
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
                className="w-full rounded-xl border border-white/15 bg-[#1f1f1f] px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-red-600 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
              />

              <p className="mt-1 text-xs text-gray-400">
                JPG, PNG, GIF
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Nome Squadra *
              </label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={e => handleInputChange('nome', e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#1f1f1f] px-3 py-2.5 text-white outline-none transition placeholder:text-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-600/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Nome Completo
              </label>
              <input
                type="text"
                value={formData.nome_completo || ''}
                onChange={e => handleInputChange('nome_completo', e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#1f1f1f] px-3 py-2.5 text-white outline-none transition placeholder:text-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-600/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Nome Stadio
              </label>
              <input
                type="text"
                value={formData.nome_stadio || ''}
                onChange={e => handleInputChange('nome_stadio', e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#1f1f1f] px-3 py-2.5 text-white outline-none transition placeholder:text-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-600/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Indirizzo
              </label>
              <input
                type="text"
                value={formData.indirizzo || ''}
                onChange={e => handleInputChange('indirizzo', e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#1f1f1f] px-3 py-2.5 text-white outline-none transition placeholder:text-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-600/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                URL mappa Google Maps
              </label>
              <input
                type="url"
                value={formData.mappa_url || ''}
                onChange={e => handleInputChange('mappa_url', e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#1f1f1f] px-3 py-2.5 text-white outline-none transition placeholder:text-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-600/40"
                placeholder="https://www.google.com/maps/embed?pb=..."
              />
              <p className="mt-1 text-xs text-gray-400">
                deve contenere "/maps/embed?pb="
              </p>
            </div>

            <div className="flex justify-end space-x-3 border-t border-white/10 pt-5">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-white/20 bg-[#333333] px-5 py-2.5 font-semibold text-white transition hover:bg-[#404040]"
              >
                Annulla
              </button>

              <button
                type="submit"
                disabled={saving || !formData.nome.trim()}
                className="flex items-center rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-5 py-2.5 font-bold text-white shadow-lg transition hover:from-red-700 hover:to-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} className="mr-2" />
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}