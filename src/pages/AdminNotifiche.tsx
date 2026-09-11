import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, Check, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type TargetType = "all" | "admin" | "creator" | "users";

type Utente = {
  user_id: string;
  email: string | null;
  username: string | null;
  role: string | null;
  devices: number;
};

export default function AdminNotifiche() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("/");

  const [target, setTarget] = useState<TargetType>("all");

  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [utentiSelezionati, setUtentiSelezionati] = useState<string[]>([]);

  const [loadingUtenti, setLoadingUtenti] = useState(true);
  const [sending, setSending] = useState(false);

  // ==========================================
  // CARICAMENTO UTENTI
  // SOLO TRAMITE FUNZIONE SERVER CREATOR
  // ==========================================

  useEffect(() => {
    const caricaUtenti = async () => {
      setLoadingUtenti(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Sessione scaduta");
        }

        const response = await fetch(
          "/.netlify/functions/notification-users",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.error ||
              `Errore caricamento utenti (${response.status})`
          );
        }

        setUtenti((data?.users || []) as Utente[]);
      } catch (error: any) {
        console.error("Errore caricamento utenti:", error);

        alert(
          error?.message ||
            "Errore durante il caricamento degli utenti."
        );

        setUtenti([]);
      } finally {
        setLoadingUtenti(false);
      }
    };

    void caricaUtenti();
  }, []);

  // ==========================================
  // UTENTI ORDINATI
  // ==========================================

  const utentiOrdinati = useMemo(() => {
    return [...utenti].sort((a, b) => {
      const nomeA = (a.username || a.email || "").toLowerCase();
      const nomeB = (b.username || b.email || "").toLowerCase();

      return nomeA.localeCompare(nomeB, "it");
    });
  }, [utenti]);

  // ==========================================
  // SELEZIONE UTENTE
  // ==========================================

  const toggleUtente = (userId: string) => {
    setUtentiSelezionati((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }

      return [...current, userId];
    });
  };

  // ==========================================
  // INVIO
  // ==========================================

  const inviaNotifica = async () => {
    if (sending) return;

    const titoloPulito = title.trim();
    const messaggioPulito = message.trim();

    if (!titoloPulito) {
      alert("Inserisci il titolo della notifica.");
      return;
    }

    if (!messaggioPulito) {
      alert("Inserisci il messaggio della notifica.");
      return;
    }

    if (
      target === "users" &&
      utentiSelezionati.length === 0
    ) {
      alert("Seleziona almeno un utente.");
      return;
    }

    const conferma = window.confirm(
      "Vuoi inviare questa notifica?"
    );

    if (!conferma) return;

    setSending(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessione scaduta");
      }

      const response = await fetch(
        "/.netlify/functions/send-push",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            title: titoloPulito,
            message: messaggioPulito,
            url: url.trim() || "/",
            target,

            userIds:
              target === "users"
                ? utentiSelezionati
                : [],
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Errore durante l'invio (${response.status})`
        );
      }

      alert(
        [
          "Notifica inviata.",
          "",
          `Destinatari: ${data?.recipients ?? 0}`,
          `Dispositivi: ${data?.devices ?? 0}`,
          `Inviate: ${data?.sent ?? 0}`,
          `Errori: ${data?.failed ?? 0}`,
        ].join("\n")
      );

      // Puliamo solamente titolo e messaggio.
      // Destinatari e pagina restano selezionati.
      setTitle("");
      setMessage("");
    } catch (error: any) {
      console.error("Errore invio notifica:", error);

      alert(
        error?.message ||
          "Errore durante l'invio della notifica."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/90 p-4 shadow-xl sm:p-6">

          {/* HEADER */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Bell size={26} className="text-red-500" />

              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">
                  Gestione Notifiche
                </h1>

                <p className="mt-1 text-sm text-gray-400">
                  Invio manuale notifiche Montecarlo 2013
                </p>
              </div>
            </div>

            <Link
              to="/admin-panel"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-sm text-white transition hover:bg-neutral-700"
            >
              <ArrowLeft size={17} />
              Indietro
            </Link>
          </div>

          <div className="space-y-5">

            {/* TITOLO */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Titolo
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Es. Calendario pubblicato"
                className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-red-500"
              />
            </div>

            {/* MESSAGGIO */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Messaggio
              </label>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Scrivi il testo della notifica..."
                className="w-full resize-none rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-red-500"
              />
            </div>

            {/* PAGINA */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Pagina da aprire
              </label>

              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/"
                className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-red-500"
              />

              <p className="mt-1 text-xs text-gray-500">
                Esempio: /calendario oppure /prossima-partita
              </p>
            </div>

            {/* DESTINATARI */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-200">
                Destinatari
              </label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["all", "Tutti"],
                  ["admin", "Admin"],
                  ["creator", "Creator"],
                  ["users", "Specifici"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setTarget(value as TargetType)
                    }
                    className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                      target === value
                        ? "border-red-500 bg-red-600 text-white"
                        : "border-white/10 bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* UTENTI SPECIFICI */}
            {target === "users" && (
              <div className="rounded-xl border border-white/10 bg-neutral-800/60 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    Seleziona utenti
                  </span>

                  <span className="text-xs text-gray-400">
                    {utentiSelezionati.length} selezionati
                  </span>
                </div>

                {loadingUtenti ? (
                  <div className="py-6 text-center text-sm text-gray-400">
                    Caricamento utenti...
                  </div>
                ) : (
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {utentiOrdinati.map((utente) => {
                      const selected =
                        utentiSelezionati.includes(
                          utente.user_id
                        );

                      const numeroDispositivi =
                        utente.devices || 0;

                      const pushAttivo =
                        numeroDispositivi > 0;

                      return (
                        <button
                          key={utente.user_id}
                          type="button"
                          onClick={() =>
                            toggleUtente(utente.user_id)
                          }
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                            selected
                              ? "border-red-500 bg-red-500/10"
                              : "border-white/10 bg-neutral-900 hover:bg-neutral-800"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white">
                              {utente.username ||
                                utente.email ||
                                "Utente"}
                            </div>

                            <div className="truncate text-xs text-gray-400">
                              {utente.email}
                            </div>

                            <div className="mt-1 flex items-center gap-2 text-xs">
                              <span className="uppercase text-gray-500">
                                {utente.role || "user"}
                              </span>

                              <span
                                className={
                                  pushAttivo
                                    ? "text-green-400"
                                    : "text-gray-500"
                                }
                              >
                                {pushAttivo
                                  ? `● ${numeroDispositivi} ${
                                      numeroDispositivi === 1
                                        ? "dispositivo"
                                        : "dispositivi"
                                    }`
                                  : "○ Nessun dispositivo"}
                              </span>
                            </div>
                          </div>

                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-red-500 bg-red-600 text-white"
                                : "border-gray-600"
                            }`}
                          >
                            {selected && <Check size={15} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* INVIA */}
            <button
              type="button"
              onClick={() => void inviaNotifica()}
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={19} />

              {sending
                ? "Invio in corso..."
                : "Invia notifica"}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}