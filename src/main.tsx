// src/main.tsx
// Data revisione: 12/10/2025 (rev: fix auto-update + banner + controllerchange log)

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// ===============================
// 🔹 Componente banner aggiornamento
// ===============================
function UpdateBanner() {
  const [show, setShow] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "NEW_VERSION_AVAILABLE") {
          console.log("[SW] Nuova versione disponibile → mostro banner");
          setWaitingWorker(event.source as ServiceWorker);
          setShow(true);
        }
      });
    }
  }, []);

  const updateApp = () => {
    if (waitingWorker) {
      console.log("[SW] Forzo SKIP_WAITING → controllerchange scatterà");
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    // Se non c'è SW, ricarico comunque
    window.location.reload();
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#fff0f5",
        border: "2px solid #ff4d6d",
        borderRadius: 12,
        padding: "10px 20px",
        zIndex: 9999,
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        textAlign: "center",
      }}
    >
      <span style={{ marginRight: 12, color: "#c60045", fontWeight: 600 }}>
        È disponibile una nuova versione dell’app
      </span>
      <button
        onClick={updateApp}
        style={{
          background: "#ff4d6d",
          color: "white",
          border: "none",
          borderRadius: 6,
          padding: "6px 12px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Aggiorna ora
      </button>
    </div>
  );
}

// ===============================
// 🔹 Mount principale
// ===============================
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <UpdateBanner />
    </BrowserRouter>
  </React.StrictMode>
);

// ===============================
// 🔹 Registrazione Service Worker
// ===============================
if (import.meta.env.MODE === "production" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ Service Worker registrato:", registration);

        // Se c'è già un worker in attesa, segnalo aggiornamento
        if (registration.waiting) {
          console.log("[SW] Nuova versione già in attesa → invio messaggio");
          registration.waiting.postMessage({ type: "NEW_VERSION_AVAILABLE" });
        }

        // Quando un nuovo SW diventa “waiting”
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[SW] installato nuovo worker → notifica banner");
                newWorker.postMessage({ type: "NEW_VERSION_AVAILABLE" });
              }
            });
          }
        });

        // 🔁 Quando cambia il controller (nuovo SW attivo)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[SW] controllerchange → reload forzato");
          window.location.reload();
        });
      })
      .catch((err) => console.error("❌ Errore registrazione SW:", err));
  });
}
