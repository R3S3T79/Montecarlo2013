// src/main.tsx
// Data revisione: 31/10/2025 — versione con controllo automatico aggiornamenti PWA (popup + polling)

// ============================================
// 🔹 Import principali
// ============================================
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// ============================================
// 🔹 Montaggio principale React
// ============================================
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// ============================================
// 🔹 Gestione Service Worker (vite-plugin-pwa)
// ============================================
import { registerSW } from "virtual:pwa-register";

// intervallo di controllo aggiornamenti (in ms)
const intervalMS = 60 * 1000; // ogni 60 secondi

const updateSW = registerSW({
  // ⚡ quando viene trovata una nuova versione
  onNeedRefresh() {
    const confirmed = window.confirm(
      "È disponibile una nuova versione di Montecarlo2013.\nVuoi aggiornare ora?"
    );
    if (confirmed) updateSW(true);
  },

  // 📦 quando l'app è pronta per l'uso offline
  onOfflineReady() {
    console.log("✅ App pronta per uso offline");
  },
});

// 🔁 forza controllo aggiornamenti anche se l'app resta aperta
setInterval(() => {
  updateSW();
}, intervalMS);

console.log("🔄 Controllo aggiornamenti PWA attivo ogni", intervalMS / 1000, "secondi");
