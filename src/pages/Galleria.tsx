// src/pages/Galleria.tsx
// Data creazione: 18/08/2025 (rev: UI migliorata – barra upload in container trasparente + X rossa per eliminare)

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../lib/roles";

interface Media {
  id: string;
  uploader_uid: string;
  uploader_email: string;
  storage_path: string; // URL Cloudinary
  mime_type: string;
  tipo: "image" | "video";
  titolo: string | null;
  created_at: string;
}

export default function Galleria(): JSX.Element {
  // ======= STATE =======
  const [files, setFiles] = useState<File[]>([]);
  const [titolo, setTitolo] = useState("");
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadIndex, setUploadIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomItem, setZoomItem] = useState<Media | null>(null);

  // ======= AUTH / ROLE =======
  const { user } = useAuth();
  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  const canAdmin = role === UserRole.Admin || role === UserRole.Creator;

  // ======= ENV =======
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // ======= STILI RAPIDI =======
  const btnStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    background: "#fff",
    color: "#111",
    cursor: "pointer",
    border: "1px solid #ddd",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    fontWeight: 600,
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    background: "#111827",
    color: "#fff",
    border: "none",
    fontWeight: 700,
  };

  const inputStyle: React.CSSProperties = {
    flex: "1 1 240px",
    minWidth: 220,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "rgba(255,255,255,0.9)",
  };

  // ======= FETCH LIST =======
  const fetchMedia = async () => {
    const { data, error } = await supabase
      .from("galleria_media")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setMedia(data as Media[]);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  // ======= UPLOAD SINGOLO (con progress via XHR) =======
  const uploadToCloudinary = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
      );

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          try {
            if (xhr.status >= 200 && xhr.status < 300) {
              const json = JSON.parse(xhr.responseText);
              if (json.secure_url) return resolve(json.secure_url as string);
            }
            return reject(new Error("Upload fallito su Cloudinary"));
          } catch (err) {
            return reject(err);
          }
        }
      };

      xhr.onerror = () => reject(new Error("Errore rete durante upload"));
      xhr.send(formData);
    });
  };

  // ======= UPLOAD MULTIPLO SEQUENZIALE =======
  const handleUpload = async () => {
    if (!files.length) return;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      alert("Devi essere loggato");
      return;
    }
    const me = userData.user;

    setLoading(true);
    setUploadIndex(0);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];

        if (f.size > 5 * 1024 * 1024) {
          alert(`"${f.name}" supera 5 MB e verrà saltato.`);
          continue;
        }

        setUploadIndex(i);
        setUploadProgress(0);

        // 1) Upload su Cloudinary
        const link = await uploadToCloudinary(f);

        // 2) Salva su Supabase
        const { error } = await supabase.from("galleria_media").insert([
          {
            storage_path: link,
            mime_type: f.type,
            tipo: f.type.startsWith("video") ? "video" : "image",
            titolo: (titolo || "").trim() || f.name,
            size_bytes: f.size,
            uploader_uid: me.id,
            uploader_email: me.email,
          },
        ]);
        if (error) throw error;
      }

      setFiles([]);
      setTitolo("");
      await fetchMedia();
      alert("Upload completato!");
    } catch (err) {
      console.error(err);
      alert("Errore durante l'upload");
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setUploadIndex(0);
    }
  };

  // ======= DELETE =======
  const deleteMedia = async (item: Media) => {
    const ok = window.confirm("Eliminare questo elemento dalla galleria?");
    if (!ok) return;

    const { error } = await supabase
      .from("galleria_media")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Eliminazione non autorizzata. Verifica le policy RLS.");
      console.error(error);
      return;
    }

    setMedia((prev) => prev.filter((m) => m.id !== item.id));
  };

  // ======= ZOOM (doppio click) =======
  const openZoom = (item: Media) => {
    setZoomItem(item);
    setZoomOpen(true);
  };

  const closeZoom = () => {
    setZoomOpen(false);
    setZoomItem(null);
  };

  // ======= RENDER =======
  return (
    <div className="min-h-screen mt-2 px-2 pb-6">
      {/* Barra Upload in container trasparente */}
      <div
        style={{
          background: "rgba(255,255,255,0.9)",
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
        }}
      >
        {/* Inputs nascosti */}
        <input
          id="pick-file"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          style={{ display: "none" }}
        />

        <input
          id="camera-file"
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          style={{ display: "none" }}
        />

        {/* Barra comandi */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          }}
        >
          <label htmlFor="pick-file" style={btnStyle}>
            📁 Scegli dalla galleria
          </label>
          <label htmlFor="camera-file" style={btnStyle}>
            📷 Scatta foto
          </label>

          <input
            type="text"
            placeholder="Titolo (opzionale)"
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            style={inputStyle}
          />

          <button
            onClick={handleUpload}
            disabled={!files.length || loading}
            style={{
              ...btnPrimary,
              opacity: !files.length || loading ? 0.7 : 1,
              cursor: !files.length || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Caricamento…" : `Carica${files.length ? ` (${files.length})` : ""}`}
          </button>
        </div>

        {/* Riepilogo selezione + progresso */}
        {!!files.length && (
          <div style={{ marginTop: 10, fontSize: 14 }}>
            Selezionati: {files.length} file
            {loading && (
              <div style={{ marginTop: 8 }}>
                <div style={{ marginBottom: 4 }}>
                  File {uploadIndex + 1} / {files.length} —{" "}
                  {files[uploadIndex]?.name}
                </div>
                <div
                  style={{
                    height: 8,
                    background: "#e5e7eb",
                    borderRadius: 999,
                  }}
                >
                  <div
                    style={{
                      height: 8,
                      width: `${uploadProgress}%`,
                      background: "#111827",
                      borderRadius: 999,
                      transition: "width .2s linear",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista media */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {media.map((m) => {
          const isOwner = user?.id === m.uploader_uid;
          const canDelete = isOwner || canAdmin;

          return (
            <div
              key={m.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 10,
                background: "rgba(255,255,255,0.85)",
              }}
            >
              <div
                onDoubleClick={() => openZoom(m)}
                title="Doppio click per ingrandire"
                style={{ cursor: "zoom-in" }}
              >
                {m.tipo === "image" ? (
                  <img
                    src={m.storage_path}
                    alt={m.titolo || "media"}
                    style={{ width: "100%", borderRadius: 6 }}
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={m.storage_path}
                    controls
                    style={{ width: "100%", borderRadius: 6 }}
                  />
                )}
              </div>

              {/* Titolo + X eliminazione */}
              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{m.titolo || ""}</span>
                {canDelete && (
                  <button
                    onClick={() => deleteMedia(m)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#dc2626",
                      fontSize: 18,
                      fontWeight: "bold",
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(220,38,38,0.1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                    title="Elimina"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODALE ZOOM */}
      {zoomOpen && zoomItem && (
        <div
          onClick={closeZoom}
          onKeyDown={(e) => e.key === "Escape" && closeZoom()}
          tabIndex={0}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{ maxWidth: "95vw", maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {zoomItem.tipo === "image" ? (
              <img
                src={zoomItem.storage_path}
                alt={zoomItem.titolo || "zoom"}
                style={{ maxWidth: "95vw", maxHeight: "90vh", borderRadius: 8 }}
              />
            ) : (
              <video
                src={zoomItem.storage_path}
                controls
                autoPlay
                style={{ maxWidth: "95vw", maxHeight: "90vh", borderRadius: 8 }}
              />
            )}
            <div style={{ textAlign: "center", marginTop: 8, color: "#fff" }}>
              <button
                onClick={closeZoom}
                style={{
                  ...btnStyle,
                  background: "#111827",
                  color: "#fff",
                  borderColor: "#111827",
                }}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
