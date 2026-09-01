// src/main.tsx
// Data revisione: 12/11/2025 — versione compatibile con disattivazione PWA in sviluppo + banner aggiornamento elegante

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
    // ✅ Esegui l'import solo in produzione
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
  // 🧩 Evita che Vite analizzi il modulo in sviluppo
  const pwaRegister = new Function("return import('virtual:pwa-register')");

  pwaRegister().then(({ registerSW }: any) => {

        logSW("Inizializzazione registerSW...");

        const updateSW = registerSW({
          immediate: true,

          // 🔸 Quando viene trovata una nuova build
          onNeedRefresh() {
            const time = logSW("Nuova versione trovata → onNeedRefresh()");
            setBuildTime(time);
            setShowBanner(true);
          },

          onOfflineReady() {
            logSW("App pronta per uso offline");
          },

          onRegistered(registration: ServiceWorkerRegistration) {
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

          onRegisterError(error: Error) {
            logSW("❌ Errore nella registrazione SW:", error);
          },
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          logSW("controllerchange → nuovo SW ora controlla la pagina");
        });

        // 🔁 Controllo aggiornamenti manuale ogni 20s
        setInterval(() => {
          logSW("🔁 Check aggiornamenti manuale...");
          updateSW();
        }, 20000);

        // 👀 Controlla aggiornamenti quando la scheda torna visibile
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            logSW("👀 Scheda riaperta → controllo aggiornamenti immediato");
            navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
          }
        });
      });

      // 📩 Ascolta messaggi diretti dal service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "NEW_VERSION_AVAILABLE") {
          const time = logSW("⚡ Messaggio dal SW → Nuova versione disponibile");
          setBuildTime(time);
          setShowBanner(true);
        }
      });
    }
  }, []);

  // =======================================
  // 🔘 Bottone "Aggiorna ora"
  // =======================================
  const handleRefresh = () => {
    if (waitingWorker) {
      logSW("🔁 Bottone cliccato → invio SKIP_WAITING al worker", waitingWorker);
      waitingWorker.postMessage({ type: "SKIP_WAITING" });

      waitingWorker.addEventListener("statechange", () => {
        logSW("⚙️ Worker stato →", waitingWorker.state);
        if (waitingWorker.state === "activated") {
          logSW("✅ Nuovo SW attivato → ricarico pagina");
          window.location.reload();
        }
      });
    } else {
      logSW("⚡ Nessun worker in attesa → reload forzato (già attivo)");
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
