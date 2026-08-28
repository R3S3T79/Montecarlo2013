// src/components/CronometroPartita.tsx
// Data creazione: 16/08/2025

import React, { useEffect, useRef, useState } from "react";

interface Props {
  elapsed: number;
  initialDuration?: number;
  onDurationChange?: (minutes: number) => void;
  label?: string;
}

export default function CronometroPartita({
  elapsed,
  initialDuration = 20,
  onDurationChange,
  label,
}: Props) {
  const [duration, setDuration] = useState<number>(initialDuration);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Allinea lo stato locale quando cambia la durata esterna
  useEffect(() => {
    setDuration(initialDuration);
  }, [initialDuration]);

// ---- Calcoli cronometro ----
const elapsedSeconds = Math.max(0, Math.floor(elapsed / 1000));

const dispMinNum = Math.floor(elapsedSeconds / 60);
const dispSecNum = elapsedSeconds % 60;

const dispMinStr = dispMinNum.toString().padStart(2, "0");
const dispSecStr = dispSecNum.toString().padStart(2, "0");

// Diventa rosso quando supera la durata impostata
const isOvertime = dispMinNum >= duration;

  // ---- Grafica cerchi ----
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

 // Percentuale avanzamento minuti
const pctMin =
  duration <= 0
    ? 100
    : Math.min(100, (dispMinNum / duration) * 100);

// Percentuale avanzamento secondi nel minuto corrente
const pctSec = (dispSecNum / 60) * 100;

  // ---- Colori dinamici: verde in countdown, rosso in overtime ----
  const trackColor = isOvertime ? "rgba(255,0,0,0.2)" : "rgba(0,128,0,0.2)";
  const strokeColor = isOvertime ? "red" : "green";
  const textColor = isOvertime ? "text-red-700" : "text-green-700";

  // ---- UX: seleziona tutto all’ingresso dell’input ----
  const selectAll = () => {
    const el = inputRef.current;
    if (!el) return;
    // timeout 0 per compatibilità mobile (caret dopo focus)
    setTimeout(() => {
      el.select();
      try {
        el.setSelectionRange(0, el.value.length);
      } catch {
        /* no-op */
      }
    }, 0);
  };

  // ---- Render ----
  // ---- Render ----
return (
  <div className="flex flex-col items-center space-y-3">

    <div className="text-lg font-bold text-gray-700">
  {label}
</div>

    <div className="flex items-center space-x-6">
      {/* Cerchio minuti */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={
  circumference - (circumference * pctMin) / 100
}
            strokeLinecap="round"
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${textColor}`}
        >
          {dispMinStr}
        </div>
      </div>

      {/* Input centrale: minuti iniziali (select-all on focus/click) */}
      <input
        ref={inputRef}
        type="number"
        value={duration}
        min={1}
        max={99}
        onFocus={selectAll}
        onClick={selectAll}
        onMouseUp={(e) => e.preventDefault()} // mantiene la selezione al primo click
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!Number.isNaN(v) && v > 0) {
            setDuration(v);
            onDurationChange?.(v);
          }
        }}
        className="w-20 text-center border border-gray-300 rounded px-2 py-1 text-lg font-medium"
      />

      {/* Cerchio secondi */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={
  circumference - (circumference * pctSec) / 100
}
            strokeLinecap="round"
          />
        </svg>
                <div
          className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${textColor}`}
        >
          {dispSecStr}
        </div>
      </div>

    </div>

  </div>
);
}
