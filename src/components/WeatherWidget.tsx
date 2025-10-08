// src/components/WeatherWidget.tsx
// Data creazione: 08/10/2025 (rev: usa coordinate dirette o nome fallback, compatibile view partite_v)

import React, { useEffect, useState } from "react";

interface WeatherWidgetProps {
  latitude?: number | null;
  longitude?: number | null;
  nomeLuogo?: string | null; // nome campo o squadra fallback
}

export default function WeatherWidget({
  latitude,
  longitude,
  nomeLuogo,
}: WeatherWidgetProps): JSX.Element {
  const [urlForecast, setUrlForecast] = useState<string>(
    "https://forecast7.com/it/43d840n10d680/montecarlo/"
  );
  const [label, setLabel] = useState<string>("Montecarlo");

  useEffect(() => {
    try {
      if (latitude && longitude) {
        // 🔹 Genera coordinate formattate per forecast7
        const latStr = `${Math.abs(latitude)
          .toFixed(3)
          .replace(".", "d")}${latitude >= 0 ? "n" : "s"}`;
        const lonStr = `${Math.abs(longitude)
          .toFixed(3)
          .replace(".", "d")}${longitude >= 0 ? "e" : "w"}`;

        const url = `https://forecast7.com/it/${latStr}${lonStr}/local/`;
        setUrlForecast(url);
        setLabel(nomeLuogo || "Campo");
      } else if (nomeLuogo) {
        // 🔹 Fallback: usa nome del luogo (es. "Forte dei Marmi")
        const formatted = nomeLuogo.toLowerCase().replace(/\s+/g, "-");
        const url = `https://forecast7.com/it/43d840n10d680/${formatted}/`;
        setUrlForecast(url);
        setLabel(nomeLuogo);
      } else {
        // 🔹 Fallback definitivo su Montecarlo
        setUrlForecast("https://forecast7.com/it/43d840n10d680/montecarlo/");
        setLabel("Montecarlo");
      }
    } catch (err) {
      console.warn("WeatherWidget.io: errore durante setup:", err);
      setUrlForecast("https://forecast7.com/it/43d840n10d680/montecarlo/");
      setLabel("Montecarlo");
    }
  }, [latitude, longitude, nomeLuogo]);

  return (
    <div style={{ marginTop: 12, textAlign: "center" }}>
      <h3 style={{ fontWeight: 600, marginBottom: 8 }}>{label} – Meteo</h3>

      <iframe
        key={urlForecast}
        src={urlForecast}
        width="100%"
        height="245"
        frameBorder="0"
        scrolling="no"
        style={{
          borderRadius: 8,
          overflow: "hidden",
          maxWidth: 400,
          margin: "0 auto",
        }}
        title={`Meteo ${label}`}
      ></iframe>
    </div>
  );
}
