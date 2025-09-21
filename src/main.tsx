// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// ===============================
// Registrazione Service Worker
// Solo in produzione
// ===============================
if (import.meta.env.MODE === "production" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js") // il tuo file sta in public/sw.js
      .then(() => console.log("✅ Service Worker registrato"))
      .catch((err) => console.error("❌ Errore registrazione SW:", err));
  });
}
