// src/main.tsx
// Data revisione: 12/10/2025 (rev: fix comunicazione SW → banner + listener robusto)

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
      // Listener messaggi dal Service Worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        console.log("[MAIN] Messaggio SW ricevuto:", event.data);

        if (event.data?.type === "NEW_VERSION_AVAILABLE") {
          console.log("[MAIN] Nuova versione disponibile → mostro banner");
          setWaitingWorker(event.source as ServiceWorker);
          setShow(true);
        }
      });

      // Se il controller cambia → ricarica automatico
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("[MAIN] controllerchange → ricarico nuova versione");
        window.location.reload();
      });
    }
  }, []);

  const updateApp = () => {
    console.log("[MAIN] Clic su Aggiorna ora");
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    // fallback: reload diretto
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
// 🔹 Registrazione Service Worker (refresh automatico garantito)
// ===============================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ Service Worker registrato:", registration);

        // Se un nuovo SW è già waiting → chiedi di aggiornare subito
        if (registration.waiting) {
          console.log("[SW] Worker in attesa → attivo skipWaiting");
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // Quando un nuovo SW viene trovato
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("[SW] Nuovo SW trovato:", newWorker);
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[SW] Nuova versione installata → attivo SKIP_WAITING");
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });

        // 🔁 Quando cambia il controller → reload automatico
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          console.log("[SW] Controller cambiato → ricarico pagina");
          window.location.reload();
        });
      })
      .catch((err) => console.error("❌ Errore registrazione SW:", err));
  });
}
