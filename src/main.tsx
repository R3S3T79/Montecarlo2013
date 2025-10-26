// src/main.tsx
// Data ripristino: 22/10/2025 (rev: versione stabile pre 19/10 — SW disattivato, avvio pulito)

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// ===============================
// 🔹 Mount principale
// ===============================
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// ===============================
// 🔹 Service Worker DISATTIVATO in locale
// ===============================
if ("serviceWorker" in navigator) {
  console.log("🚫 SW disattivato in ambiente locale");
}
