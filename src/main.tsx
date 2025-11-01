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

// Registrazione SW personalizzato
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`/sw-${Date.now()}.js`)
      .then((reg) => console.log("✅ SW registrato:", reg.scope))
      .catch((err) => console.error("❌ Errore SW:", err));
  });
}
