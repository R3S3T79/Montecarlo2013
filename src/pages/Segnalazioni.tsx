// src/pages/Segnalazioni.tsx
// Data creazione chat: 08/10/2026

import React, { useEffect, useState } from "react";
import { Bug, Database, Lightbulb, ImagePlus, Send, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

// =======================================
// 1. TIPI
// =======================================

type TipoSegnalazione = "Bug" | "Errore dati" | "Suggerimento";

interface Segnalazione {
  id: string;
  user_id: string;
  username: string | null;
  tipo: TipoSegnalazione;
  descrizione: string;
  screenshot_url: string | null;
    stato: "Nuova" | "In lavorazione" | "Conclusa" | "Chiusa";
  risposta: string | null;
  created_at: string;
}

// =======================================
// 2. COMPONENTE
// =======================================

export default function Segnalazioni(): JSX.Element {
  const { user } = useAuth();

  const [tipo, setTipo] = useState<TipoSegnalazione>("Bug");
  const [descrizione, setDescrizione] = useState("");
  const [segnalazioni, setSegnalazioni] = useState<Segnalazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [invio, setInvio] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // =======================================
// 3. SELEZIONE SCREENSHOT
// =======================================

const selezionaScreenshot = (file: File | null) => {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Puoi allegare solamente un'immagine.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Lo screenshot non può superare 5 MB.");
    return;
  }

  if (screenshotPreview) {
    URL.revokeObjectURL(screenshotPreview);
  }

  setScreenshot(file);
  setScreenshotPreview(URL.createObjectURL(file));
};

const rimuoviScreenshot = () => {
  if (screenshotPreview) {
    URL.revokeObjectURL(screenshotPreview);
  }

  setScreenshot(null);
  setScreenshotPreview(null);
};

  // =======================================
  // 3. CARICAMENTO SEGNALAZIONI
  // =======================================

  const caricaSegnalazioni = async () => {
    if (!user?.id) {
      setSegnalazioni([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("segnalazioni")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore caricamento segnalazioni:", error);
      setSegnalazioni([]);
    } else {
      setSegnalazioni((data || []) as Segnalazione[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    void caricaSegnalazioni();
  }, [user?.id]);

  // =======================================
// 4. UPLOAD SCREENSHOT
// =======================================

const uploadScreenshot = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Upload screenshot fallito");
  }

  const data = await response.json();

  if (!data.secure_url) {
    throw new Error("URL screenshot non ricevuto");
  }

  return data.secure_url as string;
};

  // =======================================
  // 4. INVIO SEGNALAZIONE
  // =======================================

  const inviaSegnalazione = async () => {
    if (!user?.id || invio) return;

    const testo = descrizione.trim();

    if (!testo) {
      alert("Inserisci una descrizione della segnalazione.");
      return;
    }

    setInvio(true);

    try {
      const { data: profilo } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();

      const username =
        profilo?.username ||
        user.user_metadata?.username ||
        user.email ||
        null;

        let screenshotUrl: string | null = null;

       if (screenshot) {
       screenshotUrl = await uploadScreenshot(screenshot);
       }

      const { error } = await supabase.from("segnalazioni").insert({
  user_id: user.id,
  username,
  tipo,
  descrizione: testo,
  screenshot_url: screenshotUrl,
});

      if (error) {
        console.error("Errore invio segnalazione:", error);
        alert("Errore durante l'invio della segnalazione.");
        return;
      }

      setDescrizione("");
      setTipo("Bug");
      rimuoviScreenshot();

      await caricaSegnalazioni();

      alert("Segnalazione inviata correttamente.");
    } finally {
      setInvio(false);
    }
  };

  // =======================================
// 5. ELIMINA SEGNALAZIONE
// =======================================

const eliminaSegnalazione = async (id: string) => {
  const conferma = window.confirm(
    "Vuoi eliminare definitivamente questa segnalazione?"
  );

  if (!conferma) return;

  const { error } = await supabase
    .from("segnalazioni")
    .delete()
    .eq("id", id)
    .eq("user_id", user?.id);

  if (error) {
    console.error("Errore eliminazione segnalazione:", error);
    alert("Errore durante l'eliminazione della segnalazione.");
    return;
  }

  await caricaSegnalazioni();
};

  // =======================================
  // 5. STILI STATO
  // =======================================

  const stileStato = (stato: Segnalazione["stato"]) => {
  if (stato === "Chiusa") {
    return "border-gray-500/30 bg-gray-500/10 text-gray-700";
  }

  if (stato === "Conclusa") {
    return "border-green-500/30 bg-green-500/10 text-green-700";
  }

  if (stato === "In lavorazione") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-700";
  }

  return "border-red-500/30 bg-red-500/10 text-red-700";
};

  // =======================================
  // 6. INTERFACCIA
  // =======================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b]">
      <div className="w-full px-3 pt-3 pb-8 box-border">

        {/* 6.1 NUOVA SEGNALAZIONE */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fafafa] to-[#eeeeee] shadow-[0_8px_24px_rgba(0,0,0,0.40)]">

          <div className="border-l-4 border-red-600 bg-gradient-to-r from-red-600 via-red-700 to-[#454545] px-4 py-3">
            <h2 className="text-center text-[15px] font-extrabold uppercase tracking-wide text-white">
              Segnalazioni e suggerimenti
            </h2>
          </div>

          <div className="p-4">

            <p className="mb-4 text-center text-[13px] font-medium leading-relaxed text-gray-500">
              Segnala un problema, un dato errato oppure proponi un miglioramento dell&apos;app.
            </p>

            {/* 6.2 TIPO SEGNALAZIONE */}
            <div className="grid grid-cols-3 gap-2">

              <button
                type="button"
                onClick={() => setTipo("Bug")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-[11px] font-extrabold uppercase transition ${
                  tipo === "Bug"
                    ? "border-red-600 bg-red-600 text-white shadow-md"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                <Bug size={21} />
                Bug
              </button>

              <button
                type="button"
                onClick={() => setTipo("Errore dati")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-[11px] font-extrabold uppercase transition ${
                  tipo === "Errore dati"
                    ? "border-red-600 bg-red-600 text-white shadow-md"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                <Database size={21} />
                Errore dati
              </button>

              <button
                type="button"
                onClick={() => setTipo("Suggerimento")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-[11px] font-extrabold uppercase transition ${
                  tipo === "Suggerimento"
                    ? "border-red-600 bg-red-600 text-white shadow-md"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                <Lightbulb size={21} />
                Suggerimento
              </button>

            </div>

            {/* 6.3 DESCRIZIONE */}
            <div className="mt-4">
              <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-wide text-gray-500">
                Descrizione
              </label>

              <textarea
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                rows={6}
                placeholder="Descrivi il problema o il suggerimento..."
                className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#252525] shadow-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-600/20"
              />
            </div>

            {/* 6.4 SCREENSHOT */}
<div className="mt-4">
  <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-wide text-gray-500">
    Screenshot (opzionale)
  </label>

  {!screenshotPreview ? (
    <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm font-semibold text-gray-600 transition hover:border-red-500 hover:text-red-600">
      <ImagePlus size={20} />
      Allega screenshot

      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) =>
          selezionaScreenshot(e.target.files?.[0] || null)
        }
      />
    </label>
  ) : (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <img
        src={screenshotPreview}
        alt="Anteprima screenshot"
        className="max-h-[300px] w-full rounded-lg object-contain"
      />

      <button
        type="button"
        onClick={rimuoviScreenshot}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition hover:bg-red-500"
        title="Rimuovi screenshot"
      >
        <X size={18} />
      </button>
    </div>
  )}
</div>

            {/* 6.4 INVIO */}
            <button
              type="button"
              onClick={() => void inviaSegnalazione()}
              disabled={invio}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-md transition hover:from-red-500 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} />
              {invio ? "Invio..." : "Invia segnalazione"}
            </button>

          </div>
        </section>

        {/* 6.5 LE MIE SEGNALAZIONI */}
        <section className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fafafa] to-[#eeeeee] shadow-[0_8px_24px_rgba(0,0,0,0.40)]">

          <div className="border-l-4 border-red-600 bg-gradient-to-r from-red-600 via-red-700 to-[#454545] px-4 py-3">
            <h2 className="text-center text-[15px] font-extrabold uppercase tracking-wide text-white">
              Le mie segnalazioni
            </h2>
          </div>

          <div className="p-3">

            {loading ? (
              <div className="py-8 text-center text-sm font-semibold text-red-600">
                Caricamento...
              </div>
            ) : segnalazioni.length === 0 ? (
              <div className="py-8 text-center text-sm font-medium text-gray-500">
                Nessuna segnalazione inviata.
              </div>
            ) : (
              <div className="space-y-3">

                {segnalazioni.map((segnalazione) => (
                  <div
                    key={segnalazione.id}
                    className="relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
                  >
                    <div className="absolute left-0 top-0 h-full w-[4px] bg-red-600" />

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-extrabold uppercase tracking-wide text-red-600">
                          {segnalazione.tipo}
                        </div>

                        <div className="mt-2 whitespace-pre-wrap break-words text-[13px] font-medium leading-relaxed text-[#252525]">
                          {segnalazione.descrizione}
                        </div>

                        {segnalazione.risposta && (
  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3">
    <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-red-600">
      Risposta
    </div>

    <div className="whitespace-pre-wrap break-words text-[12px] font-medium leading-relaxed text-[#252525]">
      {segnalazione.risposta}
    </div>
  </div>
)}

                        {segnalazione.screenshot_url && (
  <a
    href={segnalazione.screenshot_url}
    target="_blank"
    rel="noopener noreferrer"
    className="mt-3 block"
  >
    <img
      src={segnalazione.screenshot_url}
      alt="Screenshot segnalazione"
      className="max-h-[250px] w-full rounded-lg border border-gray-200 object-contain"
    />
  </a>
)}

                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase ${stileStato(
                          segnalazione.stato
                        )}`}
                      >
                        {segnalazione.stato}
                      </span>

                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
  <div className="text-[10px] font-semibold text-gray-400">
    {new Date(segnalazione.created_at).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}
  </div>

  <button
    type="button"
    onClick={() => void eliminaSegnalazione(segnalazione.id)}
    className="text-[10px] font-extrabold uppercase text-red-600 transition hover:text-red-500"
  >
    Elimina
  </button>
</div>
                  </div>
                ))}

              </div>
            )}

          </div>
        </section>

      </div>
    </div>
  );
}