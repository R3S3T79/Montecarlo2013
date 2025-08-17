// src/hooks/useSyncedTimer.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

interface TimerState {
  partita_id: string;
  timer_started_at: string | null;
  timer_offset_ms: number;
  timer_status: "running" | "paused" | "stopped";
}

export function useSyncedTimer(partitaId: string) {
  const [state, setState] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // fetch stato iniziale
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("partita_timer_state")
        .select("*")
        .eq("partita_id", partitaId)
        .single();
      if (data) setState(data);
    };
    load();
  }, [partitaId]);

  // realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`timer-${partitaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "partita_timer_state",
          filter: `partita_id=eq.${partitaId}`,
        },
        (payload) => {
          setState(payload.new as TimerState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partitaId]);

  // aggiorna elapsed in base allo stato
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (state) {
      if (state.timer_status === "running" && state.timer_started_at) {
        interval = setInterval(() => {
          const started = new Date(state.timer_started_at!).getTime();
          setElapsed(
            state.timer_offset_ms + (Date.now() - started)
          );
        }, 1000);
      } else {
        setElapsed(state.timer_offset_ms);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state]);

  // comandi
  const start = useCallback(async () => {
    await supabase.from("partita_timer_state").upsert({
      partita_id: partitaId,
      timer_started_at: new Date().toISOString(),
      timer_status: "running",
    });
  }, [partitaId]);

  const pause = useCallback(async () => {
    if (!state?.timer_started_at) return;
    const diff = Date.now() - new Date(state.timer_started_at).getTime();
    await supabase.from("partita_timer_state").update({
      timer_offset_ms: state.timer_offset_ms + diff,
      timer_started_at: null,
      timer_status: "paused",
    }).eq("partita_id", partitaId);
  }, [partitaId, state]);

  const reset = useCallback(async () => {
    await supabase.from("partita_timer_state").update({
      timer_offset_ms: 0,
      timer_started_at: null,
      timer_status: "stopped",
    }).eq("partita_id", partitaId);
  }, [partitaId]);

  return { elapsed, state, start, pause, reset };
}
