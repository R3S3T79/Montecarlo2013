// src/main.tsx
// Data revisione: 01/11/2025 — aggiornamento automatico Montecarlo2013 con banner elegante

import React, { useEffect, useState } from "react";
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
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register(`/sw-${Date.now()}.js`)
          .then((registration) => {
            console.log("✅ SW registrato:", registration.scope);

            // se c'è già un worker in attesa → mostra banner
            if (registration.waiting) {
              setWaitingWorker(registration.waiting);
              setShowBanner(true);
            }

            // quando arriva un nuovo worker
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (!newWorker) return;
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  setWaitingWorker(newWorker);
                  setShowBanner(true);
                }
              });
            });
          })
          .catch((err) => console.error("❌ Errore SW:", err));
      });
    }
  }, []);

  const handleRefresh = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      waitingWorker.addEventListener("statechange", () => {
        if (waitingWorker.state === "activated") {
          window.location.reload();
        }
      });
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
