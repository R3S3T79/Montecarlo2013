// src/pages/AdminSegnalazioni.tsx
// =======================================
// 1. IMPORT
// =======================================

import React, { useEffect, useState } from "react";
import { Bug, Save } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// =======================================
// 2. TIPI
// =======================================

type StatoSegnalazione =
  | "Nuova"
  | "In lavorazione"
  | "Conclusa"
  | "Chiusa";

interface Segnalazione {
  id: string;
  user_id: string;
  username: string | null;
  tipo: string;
  descrizione: string;
  screenshot_url: string | null;
  stato: StatoSegnalazione;
  risposta: string | null;
  created_at: string;
}

// =======================================
// 3. COMPONENTE
// =======================================

export default function AdminSegnalazioni() {
  const [segnalazioni, setSegnalazioni] = useState<Segnalazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // =======================================
  // 4. CARICAMENTO SEGNALAZIONI
  // =======================================

  const loadSegnalazioni = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("segnalazioni")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore caricamento segnalazioni:", error);
      alert("Errore durante il caricamento delle segnalazioni.");
      setLoading(false);
      return;
    }

    setSegnalazioni((data || []) as Segnalazione[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadSegnalazioni();
  }, []);

  // =======================================
  // 5. MODIFICA DATI LOCALI
  // =======================================

  const modificaStato = (
    id: string,
    stato: StatoSegnalazione
  ) => {
    setSegnalazioni((prev) =>
      prev.map((segnalazione) =>
        segnalazione.id === id
          ? {
              ...segnalazione,
              stato,
            }
          : segnalazione
      )
    );
  };

  const modificaRisposta = (
    id: string,
    risposta: string
  ) => {
    setSegnalazioni((prev) =>
      prev.map((segnalazione) =>
        segnalazione.id === id
          ? {
              ...segnalazione,
              risposta,
            }
          : segnalazione
      )
    );
  };

  // =======================================
  // 6. SALVATAGGIO
  // =======================================

  const salvaSegnalazione = async (
    segnalazione: Segnalazione
  ) => {
    if (savingId) return;

    setSavingId(segnalazione.id);

    const risposta =
      segnalazione.risposta?.trim() || null;

    const { error } = await supabase
      .from("segnalazioni")
      .update({
        stato: segnalazione.stato,
        risposta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", segnalazione.id);

    if (error) {
      console.error(
        "Errore salvataggio segnalazione:",
        error
      );

      alert(
        "Errore durante il salvataggio della segnalazione."
      );

      setSavingId(null);
      return;
    }

    setSegnalazioni((prev) =>
      prev.map((item) =>
        item.id === segnalazione.id
          ? {
              ...item,
              risposta,
            }
          : item
      )
    );

    setSavingId(null);

    alert("Segnalazione aggiornata correttamente.");
  };

  // =======================================
  // 7. FORMATTAZIONE DATA
  // =======================================

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // =======================================
  // 8. LOADING
  // =======================================

  if (loading) {
    return (
      <div className="px-3 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-neutral-900/90 p-6 shadow-xl">
          <p className="text-center text-sm text-gray-300">
            Caricamento segnalazioni...
          </p>
        </div>
      </div>
    );
  }

  // =======================================
  // 9. RENDER
  // =======================================

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 rounded-2xl border border-white/10 bg-neutral-900/90 p-4 shadow-xl sm:p-6">
          <div className="flex items-center gap-2">
            <Bug
              size={24}
              className="text-red-500"
            />

            <h1 className="text-xl font-bold text-white sm:text-2xl">
              Gestione Segnalazioni
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-400">
            Gestione errori, bug e suggerimenti inviati dagli utenti
          </p>
        </div>

        {segnalazioni.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/90 p-6 text-center text-sm text-gray-400 shadow-xl">
            Nessuna segnalazione presente.
          </div>
        ) : (
          <div className="space-y-4">
            {segnalazioni.map((segnalazione) => {
              const isSaving =
                savingId === segnalazione.id;

              return (
                <div
                  key={segnalazione.id}
                  className="rounded-2xl border border-white/10 bg-neutral-900/90 p-4 shadow-xl sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
                          {segnalazione.tipo}
                        </span>

                        <span className="text-xs text-gray-500">
                          {formatDate(
                            segnalazione.created_at
                          )}
                        </span>
                      </div>

                      <div className="mt-3 text-sm font-semibold text-white">
                        {segnalazione.username ||
                          "Utente"}
                      </div>

                      <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">
                        {segnalazione.descrizione}
                      </div>

                      {segnalazione.screenshot_url && (
                        <div className="mt-4">
                          <a
                            href={
                              segnalazione.screenshot_url
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={
                                segnalazione.screenshot_url
                              }
                              alt="Screenshot segnalazione"
                              className="max-h-80 rounded-xl border border-white/10 object-contain"
                            />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="w-full lg:w-80">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Stato
                      </label>

                      <select
                        value={segnalazione.stato}
                        disabled={isSaving}
                        onChange={(e) =>
                          modificaStato(
                            segnalazione.id,
                            e.target
                              .value as StatoSegnalazione
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-sm text-white outline-none transition focus:border-red-500 disabled:opacity-50"
                      >
                        <option value="Nuova">
                          Nuova
                        </option>

                        <option value="In lavorazione">
                          In lavorazione
                        </option>

                        <option value="Conclusa">
                          Conclusa
                        </option>

                        <option value="Chiusa">
                          Chiusa
                        </option>
                      </select>

                      <label className="mb-1 mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Risposta
                      </label>

                      <textarea
                        value={
                          segnalazione.risposta || ""
                        }
                        disabled={isSaving}
                        onChange={(e) =>
                          modificaRisposta(
                            segnalazione.id,
                            e.target.value
                          )
                        }
                        rows={5}
                        placeholder="Scrivi una risposta all'utente..."
                        className="w-full resize-y rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-red-500 disabled:opacity-50"
                      />

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          void salvaSegnalazione(
                            segnalazione
                          )
                        }
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Save size={17} />

                        {isSaving
                          ? "Salvataggio..."
                          : "Salva"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}