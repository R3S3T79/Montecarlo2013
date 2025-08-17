// Data creazione chat: 2025-07-27
// src/pages/NuovaSquadra.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function NuovaSquadra() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [nomeStadio, setNomeStadio] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [mappaUrl, setMappaUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let logoUrl: string | null = null;

    if (logoFile) {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${nome.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, logoFile);

      if (uploadError) {
        console.error("❌ Errore upload immagine:", uploadError);
        alert("Errore durante il caricamento del logo.");
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);
      logoUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from("squadre").insert([
      {
        nome: nome.trim(),
        logo_url: logoUrl,
        nome_stadio: nomeStadio.trim() || null,
        indirizzo: indirizzo.trim() || null,
        mappa_url: mappaUrl.trim() || null,
      },
    ]);

    if (error) {
      console.error("❌ Errore inserimento squadra:", error);
      alert("Errore durante il salvataggio.");
      setLoading(false);
    } else {
      console.log("✅ Squadra inserita correttamente");
      navigate("/squadre");
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-semibold text-white">Nome Squadra *</label>
          <input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="Es. Montecarlo"
          />
        </div>

        <div>
          <label className="block font-semibold text-white">Logo (file immagine)</label>
          
          {/* Bottone custom per upload */}
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded inline-block">
            Scegli file
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {logoPreview && (
            <img
              src={logoPreview}
              alt="Anteprima logo"
              className="mt-2 h-24 object-contain border rounded"
            />
          )}
        </div>

        <div>
          <label className="block font-semibold text-white">Nome Stadio</label>
          <input
            type="text"
            value={nomeStadio}
            onChange={(e) => setNomeStadio(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="Stadio Comunale"
          />
        </div>

        <div>
          <label className="block font-semibold text-white">Indirizzo</label>
          <input
            type="text"
            value={indirizzo}
            onChange={(e) => setIndirizzo(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="Via Roma, 123"
          />
        </div>

        <div>
          <label className="block font-semibold text-white">Mappa (URL embed)</label>
          <input
            type="url"
            value={mappaUrl}
            onChange={(e) => setMappaUrl(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="https://www.google.com/maps/embed?..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white font-semibold px-6 py-2 rounded hover:bg-green-700"
        >
          {loading ? "Salvataggio..." : "Salva Squadra"}
        </button>
      </form>
    </div>
  );
}
