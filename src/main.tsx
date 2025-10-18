// src/main.tsx
// Data revisione: 18/10/2025 (rev: UpdateNotifier con banner cliccabile + fix SW comunicazione)

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// ===============================
// 🔹 Componente UpdateNotifier (banner cliccabile)
// ===============================
function UpdateNotifier() {
  const [showBanner, setShowBanner] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [changelog, setChangelog] = useState<string[]>([]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        console.log(
          "%c[MAIN ← SW] Messaggio ricevuto dal Service Worker:",
          "color:#00ff00;font-weight:bold;",
          event.data
        );

        if (event.data?.type === "NEW_VERSION_AVAILABLE") {
          console.log("%c[MAIN] Nuova versione trovata → mostro banner", "color:#ff00ff;font-weight:bold;");
          setWaitingWorker(event.source as ServiceWorker);
          setShowBanner(true);

          // 🔹 Carica changelog se disponibile
          fetch("/update-info.json", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.changelog) setChangelog(data.changelog);
            })
            .catch(() => console.warn("[MAIN] Nessun changelog trovato"));
        }
      });
    }
  }, []);

  // 🔹 Cliccando sul banner → attiva nuovo SW e ricarica
  const updateApp = () => {
    console.log("[MAIN] Utente ha cliccato su 'Aggiorna'");
    if (waitingWorker) waitingWorker.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  };

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#c60045",
        color: "white",
        padding: "12px 18px",
        borderRadius: 8,
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
        cursor: "pointer",
        zIndex: 9999,
        textAlign: "center",
        fontSize: 15,
        fontWeight: "bold",
      }}
      onClick={updateApp}
    >
      🔄 Nuovo aggiornamento disponibile — clicca per aggiornare
    </div>
  );
}

// ===============================
// 🔹 Mount principale (UpdateNotifier sempre visibile)
// ===============================
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* ✅ Banner sempre visibile, anche durante login */}
    <UpdateNotifier />

    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// ===============================
// 🔹 Registrazione Service Worker
// ===============================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ Service Worker registrato:", registration);

        // Se un nuovo SW è già waiting → avvisa subito
        if (registration.waiting) {
          console.log("[SW] Worker in attesa → invio messaggio di update");
          registration.waiting.postMessage({ type: "NEW_VERSION_AVAILABLE" });
        }

        // Quando viene trovato un nuovo SW
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("[SW] Nuovo SW trovato:", newWorker);
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[SW] Nuova versione installata → invio messaggio di update");
                newWorker.postMessage({ type: "NEW_VERSION_AVAILABLE" });
              }
            });
          }
        });
      })
      .catch((err) => console.error("❌ Errore registrazione SW:", err));
  });
}
