// src/main.tsx

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// =======================================
// Gestione automatica aggiornamenti PWA
// =======================================
function ServiceWorkerManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) {
      return;
    }

    let intervalId: number | undefined;

    const pwaRegister = new Function(
      "return import('virtual:pwa-register')"
    );

    pwaRegister()
      .then(({ registerSW }: any) => {
        console.log("[PWA] Inizializzazione aggiornamenti...");

        const updateSW = registerSW({
          immediate: true,

          // Se viene rilevata una nuova versione,
          // la attiviamo e ricarichiamo automaticamente.
          onNeedRefresh() {
            console.log("[PWA] Nuova versione disponibile.");
            updateSW(true);
          },

          onOfflineReady() {
            console.log("[PWA] Applicazione pronta per uso offline.");
          },

          onRegistered(registration: ServiceWorkerRegistration | undefined) {
            if (!registration) return;

            console.log("[PWA] Service Worker registrato.");

            // Controllo periodico mentre l'app rimane aperta
            intervalId = window.setInterval(() => {
              registration.update().catch((error) => {
                console.warn(
                  "[PWA] Controllo aggiornamento non riuscito:",
                  error
                );
              });
            }, 60 * 1000);
          },

          onRegisterError(error: Error) {
            console.error(
              "[PWA] Errore registrazione Service Worker:",
              error
            );
          },
        });

        // Quando l'utente torna sull'app dopo averla lasciata
        // in background, controlliamo immediatamente.
        const checkWhenVisible = () => {
          if (document.visibilityState === "visible") {
            navigator.serviceWorker
              .getRegistration()
              .then((registration) => registration?.update())
              .catch((error) => {
                console.warn(
                  "[PWA] Controllo al ritorno sull'app non riuscito:",
                  error
                );
              });
          }
        };

        document.addEventListener("visibilitychange", checkWhenVisible);

        // Pulizia listener
        return () => {
          document.removeEventListener(
            "visibilitychange",
            checkWhenVisible
          );

          if (intervalId !== undefined) {
            window.clearInterval(intervalId);
          }
        };
      })
      .catch((error: Error) => {
        console.error("[PWA] Impossibile inizializzare la PWA:", error);
      });

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return null;
}

// =======================================
// Mount principale React
// =======================================
ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ServiceWorkerManager />
    </BrowserRouter>
  </React.StrictMode>
);