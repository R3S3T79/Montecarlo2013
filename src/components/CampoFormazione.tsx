// src/components/CampoFormazione.tsx
// Rev: realtime completo + recupero separato giocatori_stagioni_view
// Rev: moduli calcio a 11, slot fissi, parcheggio DEFAULT,
// snap-to-slot e gestione slot occupato

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { supabase } from "../lib/supabaseClient";
import Draggable from "react-draggable";

interface CampoFormazioneProps {
  partitaId: string;
  editable?: boolean;
  refreshKey?: number;
}

interface GiocatoreView {
  id: string;
  nome: string | null;
  cognome: string | null;
  ruolo: string | null;
  foto_url: string | null;
}

interface FormazioneGiocatore {
  id: string;
  giocatore_stagione_id: string;
  posizione_x: number | null;
  posizione_y: number | null;
  giocatori_stagioni_view: GiocatoreView[];
}

interface SlotPos {
  x: number;
  y: number;
}

// ========================================
// PARCHEGGIO INIZIALE
// ========================================

const DEFAULT_SLOT: SlotPos = {
  x: 10.909090909090908,
  y: 8.883495145631073,
};

// ========================================
// 4-4-2
// ========================================

const MODULO_4_4_2: SlotPos[] = [
  // Portiere
  { x: 46, y: 88 },

  // Difensori
  { x: 15, y: 72 },
  { x: 36, y: 72 },
  { x: 56, y: 72 },
  { x: 77, y: 72 },

  // Centrocampisti
  { x: 15, y: 50 },
  { x: 36, y: 50 },
  { x: 56, y: 50 },
  { x: 77, y: 50 },

  // Attaccanti
  { x: 36, y: 25 },
  { x: 56, y: 25 },
];

// ========================================
// 4-3-3
// ========================================

const MODULO_4_3_3: SlotPos[] = [
  // Portiere
  { x: 46, y: 88 },

  // Difensori
  { x: 15, y: 72 },
  { x: 36, y: 72 },
  { x: 56, y: 72 },
  { x: 77, y: 72 },

  // Centrocampisti
  { x: 26, y: 50 },
  { x: 46, y: 45 },
  { x: 66, y: 50 },

  // Attaccanti
  { x: 15, y: 25 },
  { x: 46, y: 18 },
  { x: 77, y: 25 },
];

// ========================================
// 3-5-2
// ========================================

const MODULO_3_5_2: SlotPos[] = [
  // Portiere
  { x: 46, y: 88 },

  // Difensori
  { x: 25, y: 72 },
  { x: 46, y: 70 },
  { x: 67, y: 72 },

  // Centrocampisti
  { x: 10, y: 48 },
  { x: 30, y: 52 },
  { x: 46, y: 46 },
  { x: 62, y: 52 },
  { x: 82, y: 48 },

  // Attaccanti
  { x: 36, y: 22 },
  { x: 56, y: 22 },
];

// ========================================
// 3-4-3
// ========================================

const MODULO_3_4_3: SlotPos[] = [
  // Portiere
  { x: 46, y: 88 },

  // Difensori
  { x: 25, y: 72 },
  { x: 46, y: 70 },
  { x: 67, y: 72 },

  // Centrocampisti
  { x: 15, y: 50 },
  { x: 36, y: 48 },
  { x: 56, y: 48 },
  { x: 77, y: 50 },

  // Attaccanti
  { x: 15, y: 22 },
  { x: 46, y: 18 },
  { x: 77, y: 22 },
];

// ========================================
// 4-2-3-1
// ========================================

const MODULO_4_2_3_1: SlotPos[] = [
  // Portiere
  { x: 46, y: 88 },

  // Difensori
  { x: 15, y: 72 },
  { x: 36, y: 72 },
  { x: 56, y: 72 },
  { x: 77, y: 72 },

  // Mediani
  { x: 36, y: 55 },
  { x: 56, y: 55 },

  // Trequartisti
  { x: 15, y: 36 },
  { x: 46, y: 30 },
  { x: 77, y: 36 },

  // Attaccante
  { x: 46, y: 15 },
];

// ========================================
// COMPONENTE
// ========================================

export default function CampoFormazione({
  partitaId,
  editable = false,
  refreshKey,
}: CampoFormazioneProps) {
  const [formazione, setFormazione] =
    useState<FormazioneGiocatore[]>([]);

  const campoRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState<{
    w: number;
    h: number;
  }>({
    w: 0,
    h: 0,
  });

  const [modulo, setModulo] = useState<
    "4-4-2" | "4-3-3" | "3-5-2" | "3-4-3" | "4-2-3-1"
  >("4-4-2");

  // ========================================
  // SLOT DEL MODULO
  // ========================================

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

  const isSameSlot = (
    aX: number | null,
    aY: number | null,
    slot: SlotPos
  ) => {
    if (aX == null || aY == null) {
      return false;
    }

    return (
      Math.abs(aX - slot.x) < EPS &&
      Math.abs(aY - slot.y) < EPS
    );
  };

  // ========================================
  // TROVA SLOT PIÙ VICINO
  // ========================================

  const findClosestSlot = (
    xPerc: number,
    yPerc: number
  ): SlotPos | null => {
    const slots = getSlotsForModulo();

    if (!slots.length) {
      return null;
    }

    let best: SlotPos | null = null;
    let bestDist = Infinity;

    for (const slot of slots) {
      const dx = slot.x - xPerc;
      const dy = slot.y - yPerc;

      const dist = Math.sqrt(
        dx * dx + dy * dy
      );

      if (dist < bestDist) {
        bestDist = dist;
        best = slot;
      }
    }

    return best;
  };

  // ========================================
  // FETCH FORMAZIONE
  // ========================================

  const fetchFormazione = useCallback(async () => {
    if (!partitaId) {
      return;
    }

    // ----------------------------------------
    // 1. Recupera modulo partita
    // ----------------------------------------

    const {
      data: partita,
      error: errPartita,
    } = await supabase
      .from("partite")
      .select("id, modulo")
      .eq("id", partitaId)
      .maybeSingle();

    if (errPartita) {
      console.error(
        "❌ Errore recupero partita:",
        errPartita
      );
    }

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

    // ----------------------------------------
    // 2. Recupera formazione
    // ----------------------------------------

    const {
      data: formazioneData,
      error: formazioneError,
    } = await supabase
      .from("formazioni_partita")
      .select(`
        id,
        giocatore_stagione_id,
        posizione_x,
        posizione_y
      `)
      .eq("partita_id", partitaId)
      .order("id", {
        ascending: true,
      });

    if (formazioneError) {
      console.error(
        "❌ Errore fetch formazione:",
        formazioneError.message
      );

      setFormazione([]);
      return;
    }

    if (
      !formazioneData ||
      formazioneData.length === 0
    ) {
      setFormazione([]);
      return;
    }

    // ----------------------------------------
    // 3. Recupera gli ID giocatore_stagione
    // ----------------------------------------

    const giocatoriStagioneIds =
      formazioneData
        .map(
          (g) =>
            g.giocatore_stagione_id
        )
        .filter(
          (id): id is string =>
            typeof id === "string" &&
            id.length > 0
        );

    if (giocatoriStagioneIds.length === 0) {
      console.warn(
        "⚠️ Nessun giocatore_stagione_id trovato"
      );

      setFormazione([]);
      return;
    }

    // ----------------------------------------
    // 4. Recupera separatamente i giocatori
    // dalla view.
    //
    // IMPORTANTE:
    // formazioni_partita ha una FK verso
    // giocatori_stagioni, NON verso la view.
    // ----------------------------------------

    const {
      data: giocatoriData,
      error: giocatoriError,
    } = await supabase
      .from("giocatori_stagioni_view")
      .select(`
        id,
        nome,
        cognome,
        ruolo,
        foto_url
      `)
      .in(
        "id",
        giocatoriStagioneIds
      );

    if (giocatoriError) {
      console.error(
        "❌ Errore fetch giocatori:",
        giocatoriError.message
      );

      setFormazione([]);
      return;
    }

    // ----------------------------------------
    // 5. Mappa ID -> giocatore
    // ----------------------------------------

    const giocatoriMap = new Map<
      string,
      GiocatoreView
    >();

    for (const giocatore of giocatoriData || []) {
      giocatoriMap.set(
        giocatore.id,
        {
          id: giocatore.id,
          nome: giocatore.nome,
          cognome:
            giocatore.cognome,
          ruolo: giocatore.ruolo,
          foto_url:
            giocatore.foto_url,
        }
      );
    }

    // ----------------------------------------
    // 6. Unisce formazione + giocatori
    // ----------------------------------------

    const formazioneCompleta: FormazioneGiocatore[] =
      formazioneData.map((g) => {
        const giocatore =
          giocatoriMap.get(
            g.giocatore_stagione_id
          );

        return {
          id: g.id,
          giocatore_stagione_id:
            g.giocatore_stagione_id,

          posizione_x:
            g.posizione_x,

          posizione_y:
            g.posizione_y,

          // Manteniamo l'array perché il render
          // esistente usa [0].
          giocatori_stagioni_view:
            giocatore
              ? [giocatore]
              : [],
        };
      });

    console.log(
      "✅ Dati formazione completi:",
      formazioneCompleta
    );

    setFormazione(
      formazioneCompleta
    );
  }, [partitaId]);

  // ========================================
  // PRIMO CARICAMENTO
  // ========================================

  useEffect(() => {
    fetchFormazione();
  }, [fetchFormazione]);

  // ========================================
  // REFRESH ESTERNO
  // ========================================

  useEffect(() => {
    fetchFormazione();
  }, [
    fetchFormazione,
    refreshKey,
  ]);

  // ========================================
  // REALTIME
  // ========================================

  useEffect(() => {
    if (!partitaId) {
      return;
    }

    const channel = supabase
      .channel(
        `realtime-formazione-${partitaId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "formazioni_partita",
          filter: `partita_id=eq.${partitaId}`,
        },
        async (payload) => {
          console.log(
            "🔁 Evento realtime:",
            payload.eventType,
            payload
          );

          await fetchFormazione();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    partitaId,
    fetchFormazione,
  ]);

  // ========================================
  // DIMENSIONI CAMPO
  // ========================================

  useEffect(() => {
    const updateSize = () => {
      if (!campoRef.current) {
        return;
      }

      setSize({
        w: campoRef.current.offsetWidth,
        h: campoRef.current.offsetHeight,
      });
    };

    updateSize();

    window.addEventListener(
      "resize",
      updateSize
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateSize
      );
    };
  }, []);

  // ========================================
  // AGGIORNA POSIZIONE
  // ========================================

  const aggiornaPosizione = async (
    giocatoreFormazioneId: string,
    xPerc: number,
    yPerc: number
  ) => {
    const clamp = (num: number) =>
      Math.min(
        Math.max(num, 0),
        100
      );

    const newX = clamp(xPerc);
    const newY = clamp(yPerc);

    // Aggiornamento immediato UI
    setFormazione((prev) =>
      prev.map((g) =>
        g.id ===
        giocatoreFormazioneId
          ? {
              ...g,
              posizione_x: newX,
              posizione_y: newY,
            }
          : g
      )
    );

    // Aggiornamento database
    const { error } = await supabase
      .from("formazioni_partita")
      .update({
        posizione_x: newX,
        posizione_y: newY,
      })
      .eq(
        "id",
        giocatoreFormazioneId
      );

    if (error) {
      console.error(
        "❌ Errore aggiornamento posizione:",
        error.message
      );

      // In caso di errore riallineiamo
      // l'interfaccia col database.
      await fetchFormazione();
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="w-full">
      <div
        ref={campoRef}
        className="relative mx-auto mt-6 flex justify-center"
        style={{
          width: "95%",
          aspectRatio: "2 / 3",
        }}
      >
        {/* Immagine campo */}
        <img
          src="/campo.png"
          alt="Campo da calcio"
          className="absolute inset-0 w-full h-full object-contain mx-auto"
        />

        {/* ================================= */}
        {/* SLOT LIBERI DEL MODULO */}
        {/* ================================= */}

        {(() => {
          const playerSize = 40;

          const correction =
            size.w > 0
              ? (0.5 / size.w) *
                100
              : 0;

          return getSlotsForModulo().map(
            (slot, index) => {
              const occupato =
                formazione.some((g) =>
                  isSameSlot(
                    g.posizione_x,
                    g.posizione_y,
                    slot
                  )
                );

              if (occupato) {
                return null;
              }

              const pixelX =
                ((slot.x -
                  correction) /
                  100) *
                  size.w -
                playerSize / 2;

              const pixelY =
                (slot.y / 100) *
                  size.h -
                playerSize / 2;

              return (
                <div
                  key={`slot-${index}`}
                  className="absolute rounded-full border-2 border-dashed border-white pointer-events-none"
                  style={{
                    width:
                      playerSize,
                    height:
                      playerSize,
                    left: pixelX,
                    top: pixelY,
                    zIndex: 1,
                    opacity: 0.65,
                    boxSizing:
                      "border-box",
                  }}
                />
              );
            }
          );
        })()}

        {/* ================================= */}
        {/* GIOCATORI */}
        {/* ================================= */}

        <div className="absolute inset-0">
          {formazione.map((g) => {
            const playerSize = 40;

            const posX =
              g.posizione_x ??
              DEFAULT_SLOT.x;

            const posY =
              g.posizione_y ??
              DEFAULT_SLOT.y;

            const correction =
              size.w > 0
                ? (0.5 / size.w) *
                  100
                : 0;

            const pixelX =
              ((posX -
                correction) /
                100) *
                size.w -
              playerSize / 2;

            const pixelY =
              (posY / 100) *
                size.h -
              playerSize / 2;

            return (
              <Draggable
                key={g.id}
                disabled={!editable}
                bounds="parent"
                position={{
                  x: pixelX,
                  y: pixelY,
                }}
                onStop={(_, data) => {
                  if (
                    !size.w ||
                    !size.h
                  ) {
                    return;
                  }

                  // Posizione percentuale
                  const xPerc =
                    ((data.x +
                      playerSize /
                        2) /
                      size.w) *
                    100;

                  const yPerc =
                    ((data.y +
                      playerSize /
                        2) /
                      size.h) *
                    100;

                  // Slot più vicino
                  const closest =
                    findClosestSlot(
                      xPerc,
                      yPerc
                    );

                  if (!closest) {
                    aggiornaPosizione(
                      g.id,
                      DEFAULT_SLOT.x,
                      DEFAULT_SLOT.y
                    );

                    return;
                  }

                  // Controlla se lo slot è occupato
                  const occupante =
                    formazione.find(
                      (other) =>
                        other.id !==
                          g.id &&
                        isSameSlot(
                          other.posizione_x,
                          other.posizione_y,
                          closest
                        )
                    );

                  if (occupante) {
                    const occupantePortiere =
                      occupante
                        .giocatori_stagioni_view?.[0]
                        ?.ruolo?.toLowerCase() ===
                      "portiere";

                    // Se lo slot è occupato
                    // dal portiere, annulla.
                    if (
                      occupantePortiere
                    ) {
                      return;
                    }

                    // Altrimenti rimanda
                    // l'occupante al parcheggio.
                    aggiornaPosizione(
                      occupante.id,
                      DEFAULT_SLOT.x,
                      DEFAULT_SLOT.y
                    );
                  }

                  // Posiziona il giocatore
                  // nello slot scelto.
                  aggiornaPosizione(
                    g.id,
                    closest.x,
                    closest.y
                  );
                }}
              >
                <div
                  className="absolute flex flex-col items-center w-[70px]"
                  style={{
                    transform:
                      "translateX(-35px)",
                  }}
                >
                  <img
                    src={
                      g
                        .giocatori_stagioni_view?.[0]
                        ?.foto_url ||
                      "/placeholder.png"
                    }
                    alt={
                      g
                        .giocatori_stagioni_view?.[0]
                        ?.nome ||
                      "Giocatore"
                    }
                    className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-montecarlo-secondary/40"
                  />

                  <div className="text-xs text-center mt-1 text-white font-bold drop-shadow">
                    {g
                      .giocatori_stagioni_view?.[0]
                      ?.cognome ||
                      "Gioc"}
                  </div>
                </div>
              </Draggable>
            );
          })}
        </div>
      </div>

      {/* ================================= */}
      {/* SELETTORE MODULO */}
      {/* ================================= */}

      {editable && (
        <div className="mt-4 w-full max-w-sm mx-auto">
          <label className="block text-sm font-medium text-gray-200 mb-1">
            Modulo
          </label>

          <select
            value={modulo}
            onChange={async (e) => {
              const nuovoModulo =
                e.target.value as
                  | "4-4-2"
                  | "4-3-3"
                  | "3-5-2"
                  | "3-4-3"
                  | "4-2-3-1";

              setModulo(
                nuovoModulo
              );

              const { error } =
                await supabase
                  .from("partite")
                  .update({
                    modulo:
                      nuovoModulo,
                  })
                  .eq(
                    "id",
                    partitaId
                  );

              if (error) {
                console.error(
                  "❌ Errore salvataggio modulo:",
                  error
                );
              }
            }}
            className="w-full border border-montecarlo-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
          >
            <option value="4-4-2">
              4-4-2
            </option>

            <option value="4-3-3">
              4-3-3
            </option>

            <option value="3-5-2">
              3-5-2
            </option>

            <option value="3-4-3">
              3-4-3
            </option>

            <option value="4-2-3-1">
              4-2-3-1
            </option>
          </select>
        </div>
      )}
    </div>
  );
}