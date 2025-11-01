// src/main.tsx
// Data revisione: 01/11/2025 — Montecarlo2013 con banner elegante + log visivi + log console

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// =======================================
// 🔹 Helper per log con timestamp
// =======================================
function logSW(message: string, ...args: any[]) {
  const time = new Date().toLocaleTimeString();
  console.log(`[SW LOG ${time}] ${message}`, ...args);
  return time;
}

// =======================================
// 🔹 Banner aggiornamento con dark/light mode + log visivo
// =======================================
function UpdateBanner({
  onRefresh,
  buildTime,
}: {
  onRefresh: () => void;
  buildTime: string;
}) {
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
      ⚡ Nuova versione di <b>Montecarlo2013</b> disponibile!
      <br />
      <span style={{ fontSize: 13, opacity: 0.8 }}>
        Build rilevata alle: <b>{buildTime}</b>
      </span>
      <br />
      <button
        onClick={onRefresh}
        style={{
          marginTop: 6,
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
// 🔹 Gestore Service Worker con log
// =======================================
function ServiceWorkerManager() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [buildTime, setBuildTime] = useState<string>("");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      import("virtual:pwa-register").then(({ registerSW }) => {
        logSW("Inizializzazione registerSW...");

        const updateSW = registerSW({
          immediate: true,

          // 🔸 quando viene trovata una nuova build
          onNeedRefresh() {
            const time = logSW("Nuova versione trovata → onNeedRefresh()");
            setBuildTime(time);
            setShowBanner(true);
          },

          onOfflineReady() {
            logSW("App pronta per uso offline");
          },

          onRegistered(registration) {
            if (registration) {
              logSW("Service Worker registrato con scope:", registration.scope);

              registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (!newWorker) return;
                logSW("updatefound → nuovo worker in installazione:", newWorker);

                newWorker.addEventListener("statechange", () => {
                  logSW("Nuovo worker stato →", newWorker.state);
                  if (
                    newWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    const time = logSW(
                      "Nuovo worker installato e in attesa di attivazione"
                    );
                    setBuildTime(time);
                    setWaitingWorker(newWorker);
                    setShowBanner(true);
                  }
                });
              });
            } else {
              logSW("⚠️ Registrazione SW non completata o non disponibile");
            }
          },

          onRegisterError(error) {
            logSW("❌ Errore nella registrazione SW:", error);
          },
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          logSW("controllerchange → nuovo SW ora controlla la pagina");
        });

        // 🔁 controllo manuale ogni minuto
        setInterval(() => {
          logSW("Check aggiornamenti manuale...");
          updateSW();
        }, 60000);
      });
    }
  }, []);

  const handleRefresh = () => {
    if (waitingWorker) {
      logSW("Bottone cliccato: invio SKIP_WAITING al worker", waitingWorker);
      waitingWorker.postMessage({ type: "SKIP_WAITING" });

      waitingWorker.addEventListener("statechange", () => {
        logSW("waitingWorker stato →", waitingWorker.state);
        if (waitingWorker.state === "activated") {
          logSW("Nuovo SW attivato → ricarico pagina");
          window.location.reload();
        }
      });
    } else {
      logSW("Nessun worker in attesa → ricarico forzato");
      window.location.reload();
    }
  };

  return showBanner ? (
    <UpdateBanner onRefresh={handleRefresh} buildTime={buildTime} />
  ) : null;
}

// =======================================
// 🔹 Mount principale React
// =======================================
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ServiceWorkerManager />
    </BrowserRouter>
  </React.StrictMode>
);
