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

// Modulo 1-3-3-2
const MODULO_1_3_3_2: SlotPos[] = [
  { x: 46.0000000000000,  y: 84.0000000000000 },   // portiere
  { x: 46.0000000000000,  y: 67.0000000000000 },  // difensore centrale
  { x: 77.0000000000000,  y: 67.0000000000000 },  // terzino destro
  { x: 15.0000000000000,  y: 67.0000000000000 }, // terzino sx
  { x: 46.0000000000000,  y: 46.0000000000000 }, // centrocampista centrale
  { x: 77.0000000000000,  y: 46.0000000000000 },  // centrocampista dx
  { x: 15.0000000000000,  y: 46.0000000000000 },   // centrocampista sx
  { x: 60.0000000000000,  y: 30.0000000000000 },   // Att DX
  { x: 34.0000000000000,  y: 30.0000000000000 }, // Att sx
];

// Modulo 1-3-4-1
const MODULO_1_3_4_1: SlotPos[] = [
  { x: 46.0000000000000,  y: 67.0000000000000 },  // difensore centrale
  { x: 33.88790560479777, y: 46.0000000000000 },  // centocampista centrale sx
  { x: 46.0000000000000,  y: 25.0000000000000 }, // Att 
  { x: 46.0000000000000,  y: 84.0000000000000 },   // portiere
  { x: 15.0000000000000,  y: 64.0000000000000 }, // terzino sx
  { x: 15.0000000000000,  y: 35.0000000000000 },   // centrocampista sx
  { x: 77.0000000000000,  y: 35.0000000000000 },  // centrocampista dx
  { x: 59.0000000000000,  y: 46.0000000000000 },  // centrocampista centrale dx
  { x: 77.0000000000000,  y: 64.0000000000000 },  // terzino destro
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
  const [modulo, setModulo] = useState<"1-3-3-2" | "1-3-4-1">("1-3-3-2");

  const getSlotsForModulo = (): SlotPos[] => {
    if (modulo === "1-3-4-1") return MODULO_1_3_4_1;
    return MODULO_1_3_3_2;
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

    return best;
  };

  // ============================
  // FETCH FORMAZIONE (completo con join)
  // ============================
  const fetchFormazione = useCallback(async () => {
    if (!partitaId) return;

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
                    // sposta chi era nello slot al parcheggio
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
  onChange={(e) =>
    setModulo(e.target.value as "1-3-3-2" | "1-3-4-1")
  }
  className="w-full border border-montecarlo-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
>
  <option value="1-3-3-2">3-3-2</option>
  <option value="1-3-4-1">3-4-1</option>
</select>

        </div>
      )}
    </div>
  );
}
