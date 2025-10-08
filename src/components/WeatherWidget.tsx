// src/components/WeatherWidget.tsx
// Data creazione: 07/10/2025 (rev: versione iframe stabile, compatibile locale+produzione)

import React, { useEffect, useState } from "react";

interface WeatherWidgetProps {
  luogo?: string | null;
}

export default function WeatherWidget({ luogo }: WeatherWidgetProps): JSX.Element {
  const [urlForecast, setUrlForecast] = useState<string>(
    "https://forecast7.com/it/43d840n10d680/montecarlo/"
  );
  const [label, setLabel] = useState<string>("Montecarlo");

  useEffect(() => {
    const loadCoords = async () => {
      try {
        const q = encodeURIComponent(luogo || "Montecarlo");
        const res = await fetch(`/.netlify/functions/geocode?q=${q}`);
        const data = await res.json();

        const filtered = (data || []).filter(
          (item: any) =>
            item.display_name?.includes("Italia") ||
            item.display_name?.includes("Toscana") ||
            item.display_name?.includes("Lucca")
        );

        const target = filtered.length ? filtered[0] : data[0];

        if (target) {
          let lat = parseFloat(target.lat);
          let lon = parseFloat(target.lon);
          let name = (target.display_name.split(",")[0] || "campo")
            .replace(/\s+/g, "-")
            .toLowerCase();

          if (name.includes("montecarlo")) {
            lat = 43.84;
            lon = 10.68;
          }

          const latStr = `${Math.abs(lat).toFixed(5).replace(".", "d")}${lat >= 0 ? "n" : "s"}`;
          const lonStr = `${Math.abs(lon).toFixed(5).replace(".", "d")}${lon >= 0 ? "e" : "w"}`;
          const url = `https://forecast7.com/it/${latStr}${lonStr}/${name}/`;

          setUrlForecast(url);
          setLabel(name.replace(/-/g, " "));
        } else {
          fallbackMontecarlo();
        }
      } catch (err) {
        console.warn("Errore caricamento meteo:", err);
        fallbackMontecarlo();
      }
    };

    const fallbackMontecarlo = () => {
      setUrlForecast("https://forecast7.com/it/43d840n10d680/montecarlo/");
      setLabel("Montecarlo");
    };

    loadCoords();
  }, [luogo]);

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
