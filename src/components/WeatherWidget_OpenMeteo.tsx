// src/components/WeatherWidget_OpenMeteo_Daily.tsx
// Data: 08/10/2025 — Versione estesa con previsioni 3 giorni Open-Meteo (no API key)

import React, { useEffect, useState } from "react";

interface WeatherWidgetProps {
  latitude?: number | null;
  longitude?: number | null;
  fallbackLat?: number | null;
  fallbackLon?: number | null;
  luogo?: string | null;
}

interface MeteoNow {
  temperature: number;
  windspeed: number;
  weathercode: number;
}

interface MeteoDaily {
  date: string;
  tmax: number;
  tmin: number;
  code: number;
}

export default function WeatherWidget_OpenMeteo_Daily({
  latitude,
  longitude,
  fallbackLat,
  fallbackLon,
  luogo,
}: WeatherWidgetProps): JSX.Element {
  const [now, setNow] = useState<MeteoNow | null>(null);
  const [daily, setDaily] = useState<MeteoDaily[]>([]);
  const [loading, setLoading] = useState(true);

  const lat = latitude ?? fallbackLat ?? 43.84;
  const lon = longitude ?? fallbackLon ?? 10.68;
  const nomeLuogo = luogo || "Montecarlo";

  useEffect(() => {
    let active = true;

    async function loadWeather() {
      try {
        setLoading(true);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Rome`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Errore rete Open-Meteo");
        const data = await res.json();
        if (!active) return;

        setNow(data.current_weather);
        const dailyArr: MeteoDaily[] = data.daily.time.map((t: string, i: number) => ({
          date: t,
          tmax: data.daily.temperature_2m_max[i],
          tmin: data.daily.temperature_2m_min[i],
          code: data.daily.weathercode[i],
        }));
        setDaily(dailyArr.slice(0, 3)); // solo oggi + 2 giorni
      } catch (err) {
        console.warn("[WeatherWidget_OpenMeteo_Daily] Errore:", err);
        setNow(null);
        setDaily([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadWeather();
    const interval = setInterval(loadWeather, 15 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [lat, lon]);

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>🌤 Meteo</h3>


      {loading ? (
        <div style={styles.loading}>Caricamento meteo...</div>
      ) : now ? (
        <>
          {/* METEO ATTUALE */}
          <div style={styles.nowBox}>
            <span style={styles.icon}>{getWeatherIcon(now.weathercode)}</span>
            <span style={styles.temp}>{now.temperature.toFixed(1)}°C</span>
          </div>
          <div style={styles.desc}>{getWeatherDescription(now.weathercode)}</div>
          <div style={styles.wind}>💨 {now.windspeed} km/h</div>

          {/* PREVISIONI GIORNALIERE */}
          <div style={styles.dailyBox}>
            {daily.map((d, idx) => (
              <div key={idx} style={styles.dayItem}>
                <div style={styles.dayLabel}>{formatDayLabel(d.date, idx)}</div>
                <div style={styles.dayIcon}>{getWeatherIcon(d.code)}</div>
                <div style={styles.dayTemp}>
                  {Math.round(d.tmax)}° / {Math.round(d.tmin)}°
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={styles.error}>Dati meteo non disponibili</div>
      )}
    </div>
  );
}

// --------------------------------------
// Funzioni di supporto
// --------------------------------------
function getWeatherIcon(code?: number): string {
  if (code === undefined) return "❔";
  if ([0, 1].includes(code)) return "☀️";
  if ([2, 3].includes(code)) return "⛅";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65].includes(code)) return "🌧️";
  if ([71, 73, 75].includes(code)) return "❄️";
  if ([80, 81, 82].includes(code)) return "🌦️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌥️";
}

function getWeatherDescription(code?: number): string {
  if (code === undefined) return "";
  const map: Record<number, string> = {
    0: "Sereno",
    1: "Prevalentemente sereno",
    2: "Parzialmente nuvoloso",
    3: "Coperto",
    45: "Nebbia",
    48: "Nebbia ghiacciata",
    51: "Pioviggine leggera",
    53: "Pioviggine moderata",
    55: "Pioviggine intensa",
    61: "Pioggia leggera",
    63: "Pioggia moderata",
    65: "Pioggia intensa",
    71: "Neve leggera",
    73: "Neve moderata",
    75: "Neve intensa",
    80: "Rovesci leggeri",
    81: "Rovesci moderati",
    82: "Rovesci forti",
    95: "Temporale",
    96: "Temporale con grandine",
  };
  return map[code] || "Condizioni variabili";
}

function formatDayLabel(date: string, index: number): string {
  const days = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const d = new Date(date);
  if (index === 0) return "Oggi";
  if (index === 1) return "Domani";
  return days[d.getDay()];
}

// --------------------------------------
// Stili inline (in linea con HomePage)
// --------------------------------------
const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(255,255,255,0.8)",
    border: "1px solid #e8e8e8",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    textAlign: "center",
  },
  title: { margin: 0, fontSize: 18, fontWeight: 600, marginBottom: 6 },
  loading: { fontSize: 14, opacity: 0.7 },
  nowBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  icon: { fontSize: 28 },
  temp: { fontSize: 24, fontWeight: 700 },
  desc: { fontSize: 14, opacity: 0.9 },
  wind: { fontSize: 13, opacity: 0.8, marginTop: 4 },
  dailyBox: {
    display: "flex",
    justifyContent: "space-around",
    marginTop: 12,
    gap: 10,
    flexWrap: "wrap",
  },
  dayItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontSize: 13,
    minWidth: 70,
  },
  dayLabel: { fontWeight: 600 },
  dayIcon: { fontSize: 22 },
  dayTemp: { marginTop: 2 },
  error: { color: "red", fontSize: 13 },
};
