// src/components/CampoFormazione.tsx
// Data creazione chat: 04/10/2025 (rev definitiva: realtime completo + join giocatori_stagioni_view + foto + centratura precisa)
// Rev: 17/11/2025 — aggiunti moduli 1-3-3-2 / 1-3-4-1, slot fissi, parcheggio DEFAULT, snap-to-slot e gestione slot occupato

import React, { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import Draggable from "react-draggable";

interface CampoFormazioneProps {
  partitaId: string;
  editable?: boolean;
  refreshKey?: number;
}

interface FormazioneGiocatore {
  id: string;
  giocatore_stagione_id: string;
  posizione_x: number | null;
  posizione_y: number | null;
  giocatori_stagioni_view: {
    id: string;
    nome: string | null;
    cognome: string | null;
    ruolo: string | null;
    foto_url: string | null;
  } | null;
}

interface SlotPos {
  x: number;
  y: number;
}

// Slot di parcheggio iniziale (punto di partenza titolari)
const DEFAULT_SLOT: SlotPos = {
  x: 10.909090909090908,
  y: 8.883495145631073,
};

// ===============================
// Modulo 4-4-2 (Calcio a 11)
// ===============================
const MODULO_4_4_2: SlotPos[] = [
  // Portiere
  { x: 46, y: 88 },

  // Difensori
  { x: 15, y: 72 }, // Terzino SX
  { x: 36, y: 72 }, // Centrale SX
  { x: 56, y: 72 }, // Centrale DX
  { x: 77, y: 72 }, // Terzino DX

  // Centrocampisti
  { x: 15, y: 50 }, // Esterno SX
  { x: 36, y: 50 }, // Centrale SX
  { x: 56, y: 50 }, // Centrale DX
  { x: 77, y: 50 }, // Esterno DX

  // Attaccanti
  { x: 36, y: 25 }, // Punta SX
  { x: 56, y: 25 }, // Punta DX
];

// ===============================
// Modulo 4-3-3 (Calcio a 11)
// ===============================
const MODULO_4_3_3: SlotPos[] = [
  // Portiere
  { x: 46, y: 88 },

  // Difensori
  { x: 15, y: 72 }, // Terzino SX
  { x: 36, y: 72 }, // Centrale SX
  { x: 56, y: 72 }, // Centrale DX
  { x: 77, y: 72 }, // Terzino DX

  // Centrocampisti
  { x: 26, y: 50 }, // Mezzala SX
  { x: 46, y: 45 }, // Centrocampista Centrale
  { x: 66, y: 50 }, // Mezzala DX

  // Attaccanti
  { x: 15, y: 25 }, // Ala SX
  { x: 46, y: 18 }, // Punta Centrale
  { x: 77, y: 25 }, // Ala DX
];

// ===============================
// Modulo 3-5-2 (Calcio a 11)
// ===============================
const MODULO_3_5_2: SlotPos[] = [
  // Portiere
  { x: 46, y: 88 },

  // Difensori
  { x: 25, y: 72 }, // Braccetto SX
  { x: 46, y: 70 }, // Difensore Centrale
  { x: 67, y: 72 }, // Braccetto DX

  // Centrocampisti
  { x: 10, y: 48 }, // Esterno SX
  { x: 30, y: 52 }, // Mezzala SX
  { x: 46, y: 46 }, // Centrocampista Centrale
  { x: 62, y: 52 }, // Mezzala DX
  { x: 82, y: 48 }, // Esterno DX

  // Attaccanti
  { x: 36, y: 22 }, // Seconda Punta
  { x: 56, y: 22 }, // Prima Punta
];

// ===============================
// Modulo 3-4-3 (Calcio a 11)
// ===============================
const MODULO_3_4_3: SlotPos[] = [
  // Portiere
  { x: 46, y: 88 },

  // Difensori
  { x: 25, y: 72 }, // Braccetto SX
  { x: 46, y: 70 }, // Difensore Centrale
  { x: 67, y: 72 }, // Braccetto DX

  // Centrocampisti
  { x: 15, y: 50 }, // Esterno SX
  { x: 36, y: 48 }, // Centrocampista SX
  { x: 56, y: 48 }, // Centrocampista DX
  { x: 77, y: 50 }, // Esterno DX

  // Attaccanti
  { x: 15, y: 22 }, // Ala SX
  { x: 46, y: 18 }, // Punta Centrale
  { x: 77, y: 22 }, // Ala DX
];

// ===============================
// Modulo 4-2-3-1 (Calcio a 11)
// ===============================
const MODULO_4_2_3_1: SlotPos[] = [
  // Portiere
  { x: 46, y: 88 },

  // Difensori
  { x: 15, y: 72 }, // Terzino SX
  { x: 36, y: 72 }, // Difensore Centrale SX
  { x: 56, y: 72 }, // Difensore Centrale DX
  { x: 77, y: 72 }, // Terzino DX

  // Mediani
  { x: 36, y: 55 }, // Mediano SX
  { x: 56, y: 55 }, // Mediano DX

  // Trequartisti
  { x: 15, y: 36 }, // Ala SX
  { x: 46, y: 30 }, // Trequartista Centrale
  { x: 77, y: 36 }, // Ala DX

  // Attaccante
  { x: 46, y: 15 }, // Punta Centrale
];

export default function CampoFormazione({
  partitaId,
  editable = false,
  refreshKey,
}: CampoFormazioneProps) {
  const [formazione, setFormazione] = useState<FormazioneGiocatore[]>([]);
  const campoRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // modulo selezionato (solo i due richiesti)
 const [modulo, setModulo] = useState<
  "4-4-2" | "4-3-3" | "3-5-2" | "3-4-3" | "4-2-3-1"
>("4-4-2");

const getSlotsForModulo = (): SlotPos[] => {
  switch (modulo) {
    case "4-3-3":
      return MODULO_4_3_3;

    case "3-5-2":
      return MODULO_3_5_2;

    case "3-4-3":
      return MODULO_3_4_3;

    case "4-2-3-1":
      return MODULO_4_2_3_1;

    case "4-4-2":
    default:
      return MODULO_4_4_2;
  }
};

  const EPS = 0.0001;

  const isSameSlot = (aX: number | null, aY: number | null, slot: SlotPos) => {
    if (aX == null || aY == null) return false;
    return Math.abs(aX - slot.x) < EPS && Math.abs(aY - slot.y) < EPS;
  };

 const findClosestSlot = (xPerc: number, yPerc: number): SlotPos | null => {
  const slots = getSlotsForModulo();
  if (!slots.length) return null;

  let best: SlotPos | null = null;
  let bestDist = Infinity;

  for (const s of slots) {
    const dx = s.x - xPerc;
    const dy = s.y - yPerc;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < bestDist) {
      bestDist = dist;
      best = s;
    }
  }

  console.log("Slot più vicino:", best, "Distanza:", bestDist);

  return best;
};

  // ============================
  // FETCH FORMAZIONE (completo con join)
  // ============================
  const fetchFormazione = useCallback(async () => {
    if (!partitaId) return;

   const { data: partita, error: errPartita } = await supabase
  .from("partite")
  .select("id, modulo")
  .eq("id", partitaId)
  .maybeSingle();

console.log("partitaId:", partitaId);
console.log("PARTITA:", partita);
console.log("ERRORE PARTITA:", errPartita);

if (partita?.modulo) {
  setModulo(
    partita.modulo as
      | "4-4-2"
      | "4-3-3"
      | "3-5-2"
      | "3-4-3"
      | "4-2-3-1"
  );
}

const { data, error } = await supabase
  .from("formazioni_partita")
  .select(`
    id,
    giocatore_stagione_id,
    posizione_x,
    posizione_y,
    giocatori_stagioni_view (
      id,
      nome,
      cognome,
      ruolo,
      foto_url
    )
  `)
  .eq("partita_id", partitaId)
  .order("id", { ascending: true });

    if (error) {
      console.error("❌ Errore fetch formazione:", error.message);
      setFormazione([]);
    } else {
      console.log("✅ Dati formazione aggiornati:", data);
      setFormazione((data || []) as FormazioneGiocatore[]);
    }
  }, [partitaId]);

  // ============================
  // Primo caricamento
  // ============================
  useEffect(() => {
    fetchFormazione();
  }, [fetchFormazione]);

  // ============================
  // Refresh esterno (refreshKey)
  // ============================
  useEffect(() => {
    fetchFormazione();
  }, [fetchFormazione, refreshKey]);

  // ============================
  // Realtime (INSERT / UPDATE / DELETE)
  // ============================
  useEffect(() => {
    if (!partitaId) return;

    const channel = supabase
      .channel(`realtime-formazione-${partitaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "formazioni_partita",
          filter: `partita_id=eq.${partitaId}`,
        },
        async (payload) => {
          console.log("🔁 Evento realtime:", payload.eventType, payload);
          // Refetch completo per mantenere sincronizzata la view
          await fetchFormazione();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partitaId, fetchFormazione]);

  // ============================
  // Resize listener → aggiorna size campo
  // ============================
  useEffect(() => {
    const updateSize = () => {
      if (campoRef.current) {
        setSize({
          w: campoRef.current.offsetWidth,
          h: campoRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // ============================
  // UPDATE POSIZIONE
  // ============================
  const aggiornaPosizione = async (
    giocatoreFormazioneId: string,
    xPerc: number,
    yPerc: number
  ) => {
    const clamp = (num: number) => Math.min(Math.max(num, 0), 100);
    const newX = clamp(xPerc);
    const newY = clamp(yPerc);

    // Aggiorna UI locale
    setFormazione((prev) =>
      prev.map((g) =>
        g.id === giocatoreFormazioneId
          ? { ...g, posizione_x: newX, posizione_y: newY }
          : g
      )
    );

    // Aggiorna Supabase
    const { error } = await supabase
      .from("formazioni_partita")
      .update({ posizione_x: newX, posizione_y: newY })
      .eq("id", giocatoreFormazioneId);

    if (error) {
      console.error("❌ Errore aggiornamento posizione:", error.message);
    }
  };
  // ============================
  // RENDER
  // ============================
  return (
    <div className="w-full">
      <div
        ref={campoRef}
        className="relative mx-auto mt-6 flex justify-center"
        style={{ width: "95%", aspectRatio: "2 / 3" }}
      >
        <img
          src="/campo.png"
          alt="Campo da calcio"
          className="absolute inset-0 w-full h-full object-contain mx-auto"
        />

        {/* Slot del modulo */}
{(() => {
  const playerSize = 40;
  const correction = size.w > 0 ? (0.5 / size.w) * 100 : 0;

  return getSlotsForModulo().map((slot, index) => {
    // Se uno slot è occupato NON mostrare il cerchio
    const occupato = formazione.some((g) =>
      isSameSlot(g.posizione_x, g.posizione_y, slot)
    );

    if (occupato) return null;

    // Stesso identico calcolo dei giocatori
    const pixelX =
      ((slot.x - correction) / 100) * size.w - playerSize / 2;

    const pixelY =
      (slot.y / 100) * size.h - playerSize / 2;

    return (
      <div
        key={`slot-${index}`}
        className="absolute rounded-full border-2 border-dashed border-white pointer-events-none"
        style={{
          width: playerSize,
          height: playerSize,
          left: pixelX,
          top: pixelY,
          zIndex: 1,
          opacity: 0.65,
          boxSizing: "border-box",
        }}
      />
    );
  });
})()}

        <div className="absolute inset-0">
          {formazione.map((g) => {
            const playerSize = 40; // px
            const posX = g.posizione_x ?? DEFAULT_SLOT.x;
            const posY = g.posizione_y ?? DEFAULT_SLOT.y;

            // correzione precisa con offset proporzionale
            const correction = size.w > 0 ? (0.5 / size.w) * 100 : 0;
            const pixelX = ((posX - correction) / 100) * size.w - playerSize / 2;
            const pixelY = (posY / 100) * size.h - playerSize / 2;

            return (
              <Draggable
  key={g.id}
  disabled={!editable}
                bounds="parent"
                position={{ x: pixelX, y: pixelY }}
                onStop={(_, data) => {
                  if (!size.w || !size.h) return;

                  // posizione rilasciata in percentuale
                  const xPerc = ((data.x + playerSize / 2) / size.w) * 100;
                  const yPerc = ((data.y + playerSize / 2) / size.h) * 100;

                  // trova lo slot più vicino per il modulo corrente
                  console.log({
  xPerc,
  yPerc,
  dataX: data.x,
  dataY: data.y,
  sizeW: size.w,
  sizeH: size.h,
});
                  const closest = findClosestSlot(xPerc, yPerc);

                  if (!closest) {
                    // se per qualche motivo non ci sono slot, rimanda al parcheggio
                    aggiornaPosizione(g.id, DEFAULT_SLOT.x, DEFAULT_SLOT.y);
                    return;
                  }

                  // verifica se lo slot è già occupato da un altro giocatore
const occupante = formazione.find(
  (other) =>
    other.id !== g.id &&
    isSameSlot(other.posizione_x, other.posizione_y, closest)
);

if (occupante) {
  const occupantePortiere =
    occupante.giocatori_stagioni_view?.ruolo?.toLowerCase() === "portiere";

  // Se lo slot è occupato dal portiere, annulla lo spostamento
  if (occupantePortiere) {
    return;
  }

  // Altrimenti continua come prima
  aggiornaPosizione(occupante.id, DEFAULT_SLOT.x, DEFAULT_SLOT.y);
}

// sposta il giocatore rilasciato nello slot scelto
aggiornaPosizione(g.id, closest.x, closest.y);
                }}
              >
                <div
  className="absolute flex flex-col items-center w-[70px]"
  style={{ transform: "translateX(-35px)" }} 
>

                  <img
                    src={
                      g.giocatori_stagioni_view?.foto_url || "/placeholder.png"
                    }
                    alt={g.giocatori_stagioni_view?.nome || "Giocatore"}
                    className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-montecarlo-secondary/40"
                  />
                  <div className="text-xs text-center mt-1 text-white font-bold drop-shadow">
                    {g.giocatori_stagioni_view?.cognome || "Gioc"}
                  </div>
                </div>
              </Draggable>
            );
          })}
        </div>
      </div>

      {/* Selettore modulo sotto il campo */}
      {editable && (
        <div className="mt-4 w-full max-w-sm mx-auto">
          <label className="block text-sm font-medium text-gray-200 mb-1">
            Modulo
          </label>
          <select
  value={modulo}
  onChange={async (e) => {
    const nuovoModulo = e.target.value as
      | "4-4-2"
      | "4-3-3"
      | "3-5-2"
      | "3-4-3"
      | "4-2-3-1";

    setModulo(nuovoModulo);

    const { error } = await supabase
      .from("partite")
      .update({ modulo: nuovoModulo })
      .eq("id", partitaId);

    if (error) {
      console.error("Errore salvataggio modulo:", error);
    }
  }}
  className="w-full border border-montecarlo-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
>
  <option value="4-4-2">4-4-2</option>
  <option value="4-3-3">4-3-3</option>
  <option value="3-5-2">3-5-2</option>
  <option value="3-4-3">3-4-3</option>
  <option value="4-2-3-1">4-2-3-1</option>
</select>

        </div>
      )}
    </div>
  );
}
