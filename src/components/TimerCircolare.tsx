// src/components/TimerCircolare.tsx
// Data creazione: 16/08/2025

import React, { useEffect, useRef, useState } from "react";

interface Props {
  /**
   * Millisecondi trascorsi (provenienti dal timer sincronizzato su Supabase).
   * Il componente calcola il countdown: remaining = (duration * 60) - elapsedSec
   */
  elapsed: number;

  /**
   * Durata iniziale in minuti da cui partire (default 20).
   * È la SORGENTE DI VERITÀ esterna (dalla tabella partita_timer_state).
   */
  initialDuration?: number;

  /**
   * Callback invocata quando l’utente cambia la durata nell’input centrale.
   * Qui il padre salva su Supabase e (consigliato) resetta/ferma il timer.
   */
  onDurationChange?: (minutes: number) => void;
}

export default function TimerCircolare({
  elapsed,
  initialDuration = 20,
  onDurationChange,
}: Props) {
  const [duration, setDuration] = useState<number>(initialDuration);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Allinea lo stato locale quando cambia la durata esterna
  useEffect(() => {
    setDuration(initialDuration);
  }, [initialDuration]);

  // ---- Calcoli countdown (con overrun negativo) ----
  const totalInitialSeconds = Math.max(0, Math.floor(duration * 60));
  const elapsedSeconds = Math.max(0, Math.floor(elapsed / 1000));
  // RIMOSSA la clamp a 0: permettiamo valori negativi per l’overrun
  const remaining = totalInitialSeconds - elapsedSeconds; // può essere < 0
  const isOvertime = remaining < 0;

  const absRemaining = Math.abs(remaining);
  const dispMinNum = Math.floor(absRemaining / 60);
  const dispSecNum = absRemaining % 60;

  const dispMinStr =
    (isOvertime ? "-" : "") + dispMinNum.toString().padStart(2, "0");
  const dispSecStr =
    (isOvertime ? "-" : "") + dispSecNum.toString().padStart(2, "0");

  // ---- Grafica cerchi ----
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // percentuali: minuti rispetto alla durata, secondi rispetto a 60
  // In overtime il cerchio minuti resta pieno e rosso.
  const pctMin =
    isOvertime || duration <= 0
      ? 100
      : 100 - Math.min(100, (dispMinNum / duration) * 100);

  // Per i secondi usiamo sempre il valore assoluto entro il minuto corrente
  const pctSec = 100 - (dispSecNum / 60) * 100;

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
  return (
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
            strokeDashoffset={(circumference * pctMin) / 100}
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
            strokeDashoffset={(circumference * pctSec) / 100}
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
  );
}
