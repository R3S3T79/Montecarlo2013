// src/components/WeatherWidget.tsx
// Data creazione: 06/10/2025 (rev definitiva fix 404 + fallback stabile Montecarlo)

import React, { useEffect, useState } from "react";

interface WeatherWidgetProps {
  luogo?: string | null;
}

export default function WeatherWidget({ luogo }: WeatherWidgetProps): JSX.Element {
  const [urlForecast, setUrlForecast] = useState<string | null>(null);
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

          // ✅ Se il nome include Montecarlo, usa coordinate fisse note
          if (name.includes("montecarlo")) {
            lat = 43.84;
            lon = 10.68;
          }

          // ✅ conversione più robusta: 5 decimali e sempre n/e
          const latStr = `${Math.abs(lat).toFixed(5).replace(".", "d")}${lat >= 0 ? "n" : "s"}`;
          const lonStr = `${Math.abs(lon).toFixed(5).replace(".", "d")}${lon >= 0 ? "e" : "w"}`;

          const url = `https://forecast7.com/it/${latStr}${lonStr}/${name}/`;
          console.log("🌦️ URL Meteo:", url);

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

  useEffect(() => {
    if (!urlForecast) return;

    const loadScript = () => {
      const existing = document.getElementById("weatherwidget-io-js");
      if (existing) existing.remove();
      const script = document.createElement("script");
      script.id = "weatherwidget-io-js";
      script.src = "https://weatherwidget.io/js/widget.min.js";
      script.async = true;
      script.onload = () => {
        console.log("☁️ Widget script caricato, inizializzo...");
        setTimeout(() => {
          (window as any).__weatherwidget_init?.();
        }, 1500);
      };
      document.body.appendChild(script);
    };

    loadScript();
  }, [urlForecast]);

  return (
    <div style={{ marginTop: 12 }}>
      {urlForecast ? (
        <a
          key={urlForecast}
          className="weatherwidget-io"
          href={urlForecast}
          data-label_1={label}
          data-label_2="Meteo"
          data-days="3"
          data-theme="pure"
          style={{
            display: "block",
            borderRadius: 8,
            overflow: "hidden",
            textDecoration: "none",
          }}
        >
          {label} Meteo
        </a>
      ) : (
        <div style={{ textAlign: "center", opacity: 0.6 }}>Caricamento meteo…</div>
      )}
    </div>
  );
}
