// src/components/WeatherWidget_OpenMeteo_Daily.tsx
// Data: 29/10/2025 — Versione con gradiente dinamico e contrasto alto

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
        setDaily(dailyArr.slice(0, 3));
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

  // 🔹 Determina il gradiente dinamico in base al meteo
  const backgroundGradient = getGradientByWeather(now?.weathercode);

  return (
    <div style={{ 
  ...styles.card, 
  background: backgroundGradient || "linear-gradient(145deg, #0052d4 0%, #4364f7 50%, #6fb1fc 100%)"
}}>

      <h3 style={styles.title}>🌤 Meteo {nomeLuogo}</h3>

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

// --------------------------
// Funzioni di supporto
// --------------------------
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
  return map[code ?? 0] || "Condizioni variabili";
}

function getGradientByWeather(code?: number): string {
  // 🎨 Versione con contrasti più evidenti e transizioni più ampie
  if (!code)
    return "linear-gradient(160deg, #007bff 0%, #66ccff 100%)"; // Default: blu acceso

  if ([0, 1].includes(code))
    return "linear-gradient(160deg, #00aaff 0%, #a1c4fd 100%)"; // ☀️ Sereno (azzurro cielo brillante)
  
  if ([2, 3].includes(code))
    return "linear-gradient(160deg, #7f8c8d 0%, #bdc3c7 100%)"; // ⛅ Nuvoloso (grigio chiaro più visibile)
  
  if ([45, 48].includes(code))
    return "linear-gradient(160deg, #606c88 0%, #3f4c6b 100%)"; // 🌫️ Nebbia (tono freddo)
  
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
    return "linear-gradient(160deg, #1e3c72 0%, #2a5298 100%)"; // 🌧️ Pioggia (blu profondo)
  
  if ([95, 96, 99].includes(code))
    return "linear-gradient(160deg, #141E30 0%, #243B55 100%)"; // ⛈️ Temporale (scuro drammatico)
  
  if ([71, 73, 75].includes(code))
    return "linear-gradient(160deg, #83a4d4 0%, #b6fbff 100%)"; // ❄️ Neve (azzurro ghiaccio)

  return "linear-gradient(160deg, #007bff 0%, #66ccff 100%)";
}


function formatDayLabel(date: string, index: number): string {
  const days = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const d = new Date(date);
  if (index === 0) return "Oggi";
  if (index === 1) return "Domani";
  return days[d.getDay()];
}

// --------------------------
// Stili moderni scuri e contrastati
// --------------------------
const styles: Record<string, React.CSSProperties> = {
  card: {
  borderRadius: 16,
  padding: 16,
  color: "white",
  textAlign: "center",
  boxShadow: `
    0 4px 10px rgba(0,0,0,0.3),         /* ombra di profondità */
    0 0 15px rgba(173, 216, 230, 0.6),  /* 💡 bagliore azzurro */
    0 0 30px rgba(255, 255, 255, 0.4)   /* 💡 alone bianco diffuso */
  `,
  transition: "background 0.4s ease, box-shadow 0.4s ease",
},

  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.3,
    marginBottom: 10,
    textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
  },
  loading: { fontSize: 14, opacity: 0.9 },
  nowBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  icon: { fontSize: 38 },
  temp: { fontSize: 30, fontWeight: 800 },
  desc: { fontSize: 15, marginTop: 4, opacity: 0.95 },
  wind: { fontSize: 13, marginTop: 4, opacity: 0.85 },
  dailyBox: {
    display: "flex",
    justifyContent: "space-around",
    marginTop: 14,
    gap: 10,
    flexWrap: "wrap",
  },
  dayItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: "6px 10px",
    minWidth: 70,
    backdropFilter: "blur(4px)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  },
  dayLabel: {
    fontWeight: 700,
    marginBottom: 2,
    fontSize: 13,
    textTransform: "uppercase",
  },
  dayIcon: { fontSize: 22 },
  dayTemp: { fontSize: 13, marginTop: 2 },
  error: { color: "#fff", fontSize: 13, opacity: 0.8 },
};
