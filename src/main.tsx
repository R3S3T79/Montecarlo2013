// src/main.tsx
// Data revisione: 01/11/2025 — aggiornamento automatico Montecarlo2013 con banner elegante

import React, { useEffect, useState } from "react";
import type { ServiceWorker } from "typescript"; // Aggiunto per il tipo ServiceWorker
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// =======================================
// 🔹 Banner aggiornamento con dark/light mode
// =======================================
function UpdateBanner({ onRefresh }: { onRefresh: () => void }) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  const background = prefersDark
    ? "linear-gradient(90deg, #111, #333)"
    : "linear-gradient(90deg, #b30000, #ff0000)";
  const textColor = prefersDark ? "#ffd700" : "#fff";
  const buttonBg = prefersDark ? "#ffd700" : "#fff";
  const buttonText = prefersDark ? "#111" : "#b30000";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background,
        color: textColor,
        textAlign: "center",
        padding: "12px 8px",
        fontWeight: 600,
        fontSize: 16,
        zIndex: 9999,
        boxShadow: "0 -2px 8px rgba(0,0,0,0.4)",
        transition: "background 0.3s ease",
      }}
    >
      ⚡ Aggiorna <b>Montecarlo2013</b>!
      <button
        onClick={onRefresh}
        style={{
          marginLeft: 12,
          padding: "6px 14px",
          backgroundColor: buttonBg,
          color: buttonText,
          border: "none",
          borderRadius: 6,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      >
        Aggiorna ora
      </button>
    </div>
  );
}


// =======================================
// 🔹 Componente che gestisce il Service Worker
// =======================================
function ServiceWorkerManager() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Importa la funzione di registrazione del service worker da vite-plugin-pwa
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onNeedRefresh() {
          // Quando un nuovo service worker è in attesa (installed)
          // e pronto per l'attivazione, mostriamo il banner.
          setShowBanner(true);
        },
        onOfflineReady() {
          console.log('✅ App pronta per l\'uso offline');
        },
        onRegistered(registration) {
          if (registration) {
            console.log('✅ SW registrato:', registration.scope);
            // Salva il worker in attesa per poterlo attivare al click
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setWaitingWorker(newWorker);
                  }
                });
              }
            });
          }
        },
        onRegisterError(error) {
          console.error('❌ Errore SW:', error);
        },
      });
    });
  }, []);

  const handleRefresh = () => {
    if (waitingWorker) {
      // Invia il messaggio per saltare lo stato di attesa
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      // Ricarica la pagina dopo l'attivazione
      waitingWorker.addEventListener('statechange', () => {
        if (waitingWorker.state === 'activated') {
          window.location.reload();
        }
      });
    } else {
      // Se non c'è un waitingWorker (caso di onNeedRefresh senza waitingWorker esplicito)
      // si può forzare la ricarica, ma è meno pulito.
      // In un setup standard con registerSW, onNeedRefresh implica che c'è un worker in attesa.
      window.location.reload();
    }
  };

  return showBanner ? <UpdateBanner onRefresh={handleRefresh} /> : null;
}

// =======================================
// 🔹 Montaggio principale React
// =======================================
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ServiceWorkerManager />
    </BrowserRouter>
  </React.StrictMode>
);
