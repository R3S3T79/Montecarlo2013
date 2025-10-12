// src/main.tsx
// Data revisione: 12/10/2025 (rev: UpdateNotifier con icona + changelog + SW auto reload)

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// ===============================
// 🔹 Componente UpdateNotifier (icona + popup changelog)
// ===============================
function UpdateNotifier() {
  const [showIcon, setShowIcon] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [changelog, setChangelog] = useState<string[]>([]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Listener per messaggi dal Service Worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        console.log("[MAIN] Messaggio SW:", event.data);

        if (event.data?.type === "NEW_VERSION_AVAILABLE") {
          console.log("[MAIN] Nuova versione disponibile → mostro icona update");
          setWaitingWorker(event.source as ServiceWorker);
          setShowIcon(true);

          // 🔹 Carica changelog da /update-info.json (se presente)
          fetch("/update-info.json", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.changelog) setChangelog(data.changelog);
            })
            .catch(() => console.warn("[MAIN] Nessun changelog trovato"));
        }
      });

      // 🔁 Quando cambia il controller → reload automatico
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("[MAIN] controllerchange → ricarico nuova versione");
        window.location.reload();
      });
    }
  }, []);

  const openUpdateModal = () => setShowModal(true);
  const closeUpdateModal = () => setShowModal(false);

  const updateApp = () => {
    console.log("[MAIN] Aggiorno app → skipWaiting");
    if (waitingWorker) waitingWorker.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  };

  if (!showIcon) return null;

  return (
    <>
      {/* 🔔 Icona di aggiornamento */}
      <button
        onClick={openUpdateModal}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 50,
          height: 50,
          borderRadius: "50%",
          backgroundColor: "#c60045",
          border: "none",
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
          boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
          cursor: "pointer",
          zIndex: 9999,
        }}
        title="Nuovo aggiornamento disponibile"
      >
        ⟳
      </button>

      {/* 🪧 Popup changelog */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
          }}
          onClick={closeUpdateModal}
        >
          <div
            style={{
              background: "white",
              borderRadius: 10,
              padding: "20px 30px",
              width: "90%",
              maxWidth: 420,
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "#c60045", marginBottom: 12 }}>
              Nuova versione disponibile
            </h3>
            {changelog.length > 0 ? (
              <ul
                style={{
                  textAlign: "left",
                  marginBottom: 16,
                  listStyle: "disc",
                  paddingLeft: 22,
                }}
              >
                {changelog.map((item, i) => (
                  <li key={i} style={{ fontSize: 14, marginBottom: 4 }}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 14, marginBottom: 16 }}>
                Sono stati apportati miglioramenti all’app Montecarlo 2013.
              </p>
            )}
            <button
              onClick={updateApp}
              style={{
                background: "#c60045",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Aggiorna ora
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ===============================
// 🔹 Mount principale
// ===============================
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <UpdateNotifier />
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
