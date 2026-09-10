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

    let reloading = false;

    // Se all'avvio esiste già un controller significa che
    // questa pagina è già gestita da un Service Worker.
    const hadController = Boolean(
      navigator.serviceWorker.controller
    );

    // =======================================
    // NUOVO SERVICE WORKER ATTIVATO
    // =======================================
    const handleControllerChange = () => {
      // Evita reload al primo install della PWA.
      if (!hadController) {
        return;
      }

      // Evita più reload consecutivi.
      if (reloading) {
        return;
      }

      reloading = true;

      console.log(
        "[PWA] Nuova versione attivata. Ricarico l'app..."
      );

      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    // =======================================
    // CONTROLLO AGGIORNAMENTI
    // =======================================
    const checkForUpdate = async () => {
      try {
        const registration =
          await navigator.serviceWorker.getRegistration();

        if (!registration) {
          return;
        }

        console.log(
          "[PWA] Controllo disponibilità nuova versione..."
        );

        await registration.update();
      } catch (error) {
        console.warn(
          "[PWA] Controllo aggiornamento non riuscito:",
          error
        );
      }
    };

    // Controllo subito all'apertura dell'app.
    void checkForUpdate();

    // Controllo ogni 60 secondi se l'app rimane aperta.
    const intervalId = window.setInterval(() => {
      void checkForUpdate();
    }, 60 * 1000);

    // Quando l'utente torna sull'app dopo averla
    // lasciata in background, controlla subito.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdate();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    // =======================================
    // CLEANUP
    // =======================================
    return () => {
      window.clearInterval(intervalId);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
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