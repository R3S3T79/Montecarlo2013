// src/pages/UserProfile.tsx
// Data creazione chat: 05/08/2025 (rev: allineamento tabelle + cambio password)

import React, { useEffect, useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type UserRole = "user" | "creator" | "admin";

interface UserProfileData {
  // user_profiles
  avatar_url: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string; // "YYYY-MM-DD" oppure ""
  phone: string;

  // condivisi (lettura da dove c'è, scrittura su entrambe)
  username: string;
  email: string;

  // visibile, non modificabile (sincronizzato su entrambe in salvataggio)
  role: UserRole;
}

export default function UserProfile(): JSX.Element {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileData>({
    avatar_url: null,
    first_name: "",
    last_name: "",
    date_of_birth: "",
    phone: "",
    username: "",
    email: "",
    role: "user",
  });

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cambio password (modale)
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const toNullIfEmpty = (v?: string | null) => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  };

  // ============== LOAD ==============
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      // 1) user_profiles by user_id
      const { data: up, error: upErr } = await supabase
        .from("user_profiles")
        .select("role, email, username, first_name, last_name, date_of_birth, phone, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (upErr) console.error("[UserProfile] load user_profiles error:", upErr);

      // 2) pending_users by auth email (potrebbe non esistere dopo approvazione)
      const authEmail = user.email || "";
      let pend: { role: string | null; username: string | null; email: string } | null = null;
      if (authEmail) {
        const { data: pData, error: pErr } = await supabase
          .from("pending_users")
          .select("role, username, email")
          .eq("email", authEmail)
          .maybeSingle();
        if (pErr) {
          // spesso RLS vieta la lettura da client -> non blocco
          console.warn("[UserProfile] pending_users read skipped/denied:", pErr.message);
        } else {
          pend = pData;
        }
      }

      // 3) merge: per campi profilo prendi da user_profiles; per username/role fallback a pending se mancano; email da auth
      setProfile({
        avatar_url: up?.avatar_url ?? null,
        first_name: up?.first_name ?? "",
        last_name: up?.last_name ?? "",
        date_of_birth: up?.date_of_birth ?? "",
        phone: up?.phone ?? "",
        username: (up?.username ?? pend?.username ?? "") || "",
        email: authEmail || up?.email || pend?.email || "",
        role: ((up?.role as UserRole) ?? (pend?.role as UserRole) ?? "user"),
      });

      setLoading(false);
    })();
  }, []);

  // ============== UPLOAD AVATAR (user_profiles) ==============
  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error("[UserProfile] upload error:", uploadError);
        alert("Errore nel caricamento immagine.");
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setProfile((p) => ({ ...p, avatar_url: data.publicUrl }));
    } finally {
      setUploading(false);
    }
  }

  // ============== SAVE ==============
  async function handleSubmit() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    // 1) user_profiles: scrivo SEMPRE i campi di profilo + username/email/role
    const upUpdates = {
      user_id: user.id,
      role: profile.role, // visibile, non editabile, ma sincronizzato
      email: user.email || profile.email || "",
      username: profile.username ?? "",
      first_name: toNullIfEmpty(profile.first_name),
      last_name: toNullIfEmpty(profile.last_name),
      date_of_birth: toNullIfEmpty(profile.date_of_birth),
      phone: toNullIfEmpty(profile.phone),
      avatar_url: toNullIfEmpty(profile.avatar_url),
    };

    const { data: upSaved, error: upSaveErr } = await supabase
      .from("user_profiles")
      .upsert(upUpdates, { onConflict: "user_id" })
      .select("role, email, username, first_name, last_name, date_of_birth, phone, avatar_url")
      .single();

    if (upSaveErr) {
      console.error("[UserProfile] upsert user_profiles error:", upSaveErr);
      alert(`Errore salvataggio profilo: ${upSaveErr.message}`);
      return;
    }

    // 2) pending_users: prova ad aggiornare username/role SOLO se la riga esiste (by email)
    //    (non blocco se fallisce per policy)
    if (profile.email) {
      try {
        // verifica esistenza
        const { data: exists, error: chkErr } = await supabase
          .from("pending_users")
          .select("email")
          .eq("email", profile.email)
          .maybeSingle();

        if (!chkErr && exists?.email) {
          const { error: pendErr } = await supabase
            .from("pending_users")
            .update({
              username: profile.username ?? "",
              role: profile.role, // testo o enum lato DB? Se è text va benissimo
            })
            .eq("email", profile.email);

          if (pendErr) {
            console.warn("[UserProfile] pending_users update skipped:", pendErr.message);
          }
        }
      } catch (e) {
        console.warn("[UserProfile] pending_users update not allowed:", (e as any)?.message);
      }
    }

    // aggiorna stato locale con quanto salvato
    setProfile((p) => ({
      ...p,
      avatar_url: upSaved?.avatar_url ?? null,
      first_name: upSaved?.first_name ?? "",
      last_name: upSaved?.last_name ?? "",
      date_of_birth: upSaved?.date_of_birth ?? "",
      phone: upSaved?.phone ?? "",
      username: upSaved?.username ?? "",
      email: user.email || upSaved?.email || "",
      role: (upSaved?.role as UserRole) ?? "user",
    }));

    navigate("/");
  }

  // ============== CAMBIO PASSWORD (auth) ==============
  async function handleChangePassword() {
    if (!profile.email) {
      alert("Nessuna email utente in sessione.");
      return;
    }
    if (!currentPw || !newPw || !confirmPw) {
      alert("Compila tutti i campi.");
      return;
    }
    if (newPw !== confirmPw) {
      alert("Le nuove password non coincidono.");
      return;
    }
    if (newPw.length < 8) {
      alert("La nuova password deve avere almeno 8 caratteri.");
      return;
    }

    setPwLoading(true);
    try {
      // Verifica password attuale (ri-autentica)
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPw,
      });
      if (signErr) {
        alert("Password attuale non corretta.");
        return;
      }

      // Aggiorna password in auth.users
      const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
      if (updErr) {
        alert(`Errore aggiornamento password: ${updErr.message}`);
        return;
      }

      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwOpen(false);
      alert("Password aggiornata con successo.");
    } finally {
      setPwLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6">Caricamento…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6 space-y-4">
        {/* Avatar */}
        {profile.avatar_url && (
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover mx-auto"
          />
        )}

        {/* Upload da dispositivo */}
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

        {/* Scatta foto */}
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

        {/* Campi profilo (solo user_profiles) */}
        <label className="block">
          <span className="text-sm font-medium">Nome</span>
          <input
            type="text"
            value={profile.first_name}
            onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Cognome</span>
          <input
            type="text"
            value={profile.last_name}
            onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Data di nascita</span>
          <input
            type="date"
            value={profile.date_of_birth}
            onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Telefono</span>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </label>

        {/* Condivisi (scrittura su entrambe) */}
        <label className="block">
          <span className="text-sm font-medium">Username</span>
          <input
            type="text"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
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

        {/* Ruolo: visibile, non editabile */}
        <div className="block">
  <span className="text-sm font-medium">Ruolo</span>
  <div className="mt-1 px-2 py-1 rounded bg-gray-100 border text-gray-700">
    {profile.role}
  </div>
</div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-red-600 to-gray-400 text-white py-2 rounded-lg hover:opacity-90 transition"
          >
            Salva modifiche
          </button>
          <button
            onClick={() => setPwOpen(true)}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
          >
            Cambia password
          </button>
        </div>
      </div>

      {/* MODALE CAMBIO PASSWORD */}
      {pwOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-sm rounded-lg p-5 space-y-3 shadow-lg">
            <h3 className="text-lg font-semibold">Cambia password</h3>

            <div>
              <label className="text-sm font-medium">Password attuale</label>
              <div className="mt-1 flex">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="flex-1 border rounded-l px-2 py-1"
                />
                <button
                  onClick={() => setShowCurrent((v) => !v)}
                  className="border border-l-0 rounded-r px-3"
                  type="button"
                >
                  {showCurrent ? "Nascondi" : "Mostra"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Nuova password</label>
              <div className="mt-1 flex">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="flex-1 border rounded-l px-2 py-1"
                />
                <button
                  onClick={() => setShowNew((v) => !v)}
                  className="border border-l-0 rounded-r px-3"
                  type="button"
                >
                  {showNew ? "Nascondi" : "Mostra"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Conferma nuova password</label>
              <div className="mt-1 flex">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="flex-1 border rounded-l px-2 py-1"
                />
                <button
                  onClick={() => setShowConfirm((v) => !v)}
                  className="border border-l-0 rounded-r px-3"
                  type="button"
                >
                  {showConfirm ? "Nascondi" : "Mostra"}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPwOpen(false)}
                className="px-3 py-2 rounded border hover:bg-gray-50"
                disabled={pwLoading}
              >
                Annulla
              </button>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 rounded bg-red-600 text-white hover:opacity-90 disabled:opacity-60"
                disabled={pwLoading}
              >
                {pwLoading ? "Salvataggio…" : "Aggiorna password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

