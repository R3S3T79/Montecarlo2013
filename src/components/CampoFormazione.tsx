// src/components/CampoFormazione.tsx
// Data creazione chat: 04/10/2025 (rev definitiva: realtime completo + join giocatori_stagioni_view + foto + centratura precisa)

import React, { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import Draggable from "react-draggable";

interface CampoFormazioneProps {
  partitaId: string;
  editable?: boolean;
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

export default function CampoFormazione({
  partitaId,
  editable = false,
}: CampoFormazioneProps) {
  const [formazione, setFormazione] = useState<FormazioneGiocatore[]>([]);
  const campoRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

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
    giocatoreId: string,
    xPerc: number,
    yPerc: number
  ) => {
    const clamp = (num: number) => Math.min(Math.max(num, 0), 100);
    const newX = clamp(xPerc);
    const newY = clamp(yPerc);

    // Aggiorna UI locale
    setFormazione((prev) =>
      prev.map((g) =>
        g.id === giocatoreId
          ? { ...g, posizione_x: newX, posizione_y: newY }
          : g
      )
    );

    // Aggiorna Supabase
    const { error } = await supabase
      .from("formazioni_partita")
      .update({ posizione_x: newX, posizione_y: newY })
      .eq("id", giocatoreId);

    if (error) {
      console.error("❌ Errore aggiornamento posizione:", error.message);
    }
  };


  // ============================
  // RENDER
  // ============================
  return (
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
const posX = g.posizione_x ?? 5;
const posY = g.posizione_y ?? 5;

// correzione precisa con offset proporzionale
const correction = (0.5 / size.w) * 100; // metà punto percentuale
const pixelX = ((posX - correction) / 100) * size.w - playerSize / 2;
const pixelY = (posY / 100) * size.h - playerSize / 2;




          return (
            <Draggable
              key={g.id}
              disabled={!editable}
              bounds="parent"
              position={{ x: pixelX, y: pixelY }}
              onStop={(_, data) => {
                const xPerc = ((data.x + playerSize / 2) / size.w) * 100;
                const yPerc = ((data.y + playerSize / 2) / size.h) * 100;
                aggiornaPosizione(g.id, xPerc, yPerc);
              }}
            >
              <div
  className="absolute flex flex-col items-center"
  style={{ transform: "translateX(-1px)" }} // micro-correzione visiva
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
  );
}
