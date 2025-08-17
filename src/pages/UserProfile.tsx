// src/pages/UserProfile.tsx
// Data creazione chat: 05/08/2025

import React, { useEffect, useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

interface UserProfileData {
  avatar_url: string | null;
  nome: string;
  cognome: string;
  data_nascita: string;
  telefono: string;
  username: string;
  email: string;
}

export default function UserProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileData>({
    avatar_url: null,
    nome: "",
    cognome: "",
    data_nascita: "",
    telefono: "",
    username: "",
    email: "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      // estraiamo dai metadati o dalla tabella user_profiles
      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setProfile({
          avatar_url: data.avatar_url,
          nome: data.nome,
          cognome: data.cognome,
          data_nascita: data.data_nascita,
          telefono: data.telefono,
          username: data.username,
          email: user.email || "",
        });
      } else {
        setProfile((p) => ({ ...p, email: user.email || "" }));
      }
    }
    loadProfile();
  }, []);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });
    if (uploadError) {
      console.error(uploadError);
    } else {
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setProfile((p) => ({ ...p, avatar_url: data.publicUrl }));
    }
    setUploading(false);
  }

  async function handleSubmit() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const updates = {
      user_id: user.id,
      avatar_url: profile.avatar_url,
      nome: profile.nome,
      cognome: profile.cognome,
      data_nascita: profile.data_nascita,
      telefono: profile.telefono,
      username: profile.username,
      updated_at: new Date(),
    };
    await supabase.from("user_profiles").upsert(updates);
    navigate("/");
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6 space-y-4">
        

        {/* Anteprima avatar */}
        {profile.avatar_url && (
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover mx-auto"
          />
        )}

        {/* Upload file da dispositivo */}
        <label className="block">
          <span className="text-sm font-medium">Immagine di profilo</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="mt-1 block w-full text-sm text-gray-700"
          />
        </label>

        {/* Scatta foto con la camera */}
        <label className="block">
          <span className="text-sm font-medium">Scatta una foto</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={uploading}
            className="mt-1 block w-full text-sm text-gray-700"
          />
        </label>

        {/* Campi profilo */}
        <label className="block">
          <span className="text-sm font-medium">Nome</span>
          <input
            type="text"
            value={profile.nome}
            onChange={(e) => setProfile({ ...profile, nome: e.target.value })}
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Cognome</span>
          <input
            type="text"
            value={profile.cognome}
            onChange={(e) => setProfile({ ...profile, cognome: e.target.value })}
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Data di nascita</span>
          <input
            type="date"
            value={profile.data_nascita}
            onChange={(e) =>
              setProfile({ ...profile, data_nascita: e.target.value })
            }
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Telefono</span>
          <input
            type="tel"
            value={profile.telefono}
            onChange={(e) =>
              setProfile({ ...profile, telefono: e.target.value })
            }
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Username</span>
          <input
            type="text"
            value={profile.username}
            onChange={(e) =>
              setProfile({ ...profile, username: e.target.value })
            }
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            value={profile.email}
            readOnly
            className="mt-1 block w-full border rounded bg-gray-100 px-2 py-1"
          />
        </label>

        <button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-red-600 to-gray-400 text-white py-2 rounded-lg hover:opacity-90 transition"
        >
          Salva modifiche
        </button>
      </div>
    </div>
  );
}
