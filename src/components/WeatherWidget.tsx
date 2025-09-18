// src/components/WeatherWidget.tsx
// Data creazione: 14/09/2025 (fix init widget)

import React, { useEffect } from "react";

export default function WeatherWidget(): JSX.Element {
  useEffect(() => {
    const init = () => {
      // funzione globale dello script che inizializza i widget già montati
      (window as any).__weatherwidget_init?.();
    };

    // se lo script non è ancora caricato → lo aggiungo
    if (!document.getElementById("weatherwidget-io-js")) {
      const script = document.createElement("script");
      script.id = "weatherwidget-io-js";
      script.src = "https://weatherwidget.io/js/widget.min.js";
      script.async = true;
      script.onload = init; // inizializza quando caricato
      document.body.appendChild(script);
    } else {
      // se è già presente → reinizializza subito
      init();
    }
  }, []);

  return (
    <div style={{ marginTop: 12 }}>
      <a
        className="weatherwidget-io"
        href="https://forecast7.com/it/43d84n10d68/montecarlo/"
        data-label_1="Montecarlo"
        data-label_2="Meteo"
        data-theme="original"
        style={{ display: "block", borderRadius: 8 }}
      >
        Montecarlo Meteo
      </a>
    </div>
  );
}
