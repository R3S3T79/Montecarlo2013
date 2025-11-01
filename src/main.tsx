// src/main.tsx
// Data: 31/10/2025 — aggiornamento automatico Montecarlo2013

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

function UpdatePopup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "NEW_VERSION_AVAILABLE") {
          const confirmed = window.confirm(
            "⚡ È disponibile una nuova versione di Montecarlo2013.\nVuoi aggiornare ora?"
          );
          if (confirmed && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          }
        }
      });
    }
  }, []);
  return null;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <UpdatePopup />
    </BrowserRouter>
  </React.StrictMode>
);

// ===============================
// 🔹 Registrazione e gestione SW
// ===============================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`/sw-${Date.now()}.js`)
      .then((registration) => {
        console.log("✅ SW registrato:", registration.scope);

        // Se il nuovo SW è in attesa, chiedi all’utente se vuole aggiornare
        if (registration.waiting) {
          showUpdatePrompt(registration.waiting);
        }

        // Quando arriva un nuovo SW e diventa waiting
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              showUpdatePrompt(newWorker);
            }
          });
        });
      })
      .catch((err) => console.error("❌ Errore SW:", err));
  });
}

function showUpdatePrompt(worker: ServiceWorker | null) {
  if (!worker) return;
  const confirmed = window.confirm("⚡ È disponibile una nuova versione di Montecarlo2013.\nVuoi aggiornare ora?");
  if (confirmed) {
    worker.postMessage({ type: "SKIP_WAITING" });
    worker.addEventListener("statechange", (e) => {
      if (worker.state === "activated") {
        window.location.reload();
      }
    });
  }
}

