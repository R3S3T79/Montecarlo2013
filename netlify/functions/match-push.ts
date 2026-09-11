import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type MatchEvent =
  | "match_start"
  | "goal"
  | "halftime"
  | "second_half_start"
  | "match_end";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const VAPID_PUBLIC_KEY =
  process.env.VITE_VAPID_PUBLIC_KEY;

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY;

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:marcomiressi@gmail.com";

const MONTECARLO_ID =
  "a16a8645-9f86-41d9-a81f-a92931f1cc67";

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metodo non consentito" });
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !VAPID_PUBLIC_KEY ||
    !VAPID_PRIVATE_KEY
  ) {
    console.error("Variabili ambiente mancanti");

    return json(500, {
      error: "Configurazione server incompleta",
    });
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  // =========================
  // AUTENTICAZIONE
  // =========================

  const authorization =
    event.headers.authorization ||
    event.headers.Authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return json(401, {
      error: "Autenticazione richiesta",
    });
  }

  const accessToken = authorization.slice(7);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return json(401, {
      error: "Sessione non valida",
    });
  }

  // =========================
  // CONTROLLO RUOLO
  // =========================

  const { data: profile, error: profileError } =
    await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

  if (profileError || !profile) {
    return json(403, {
      error: "Profilo utente non trovato",
    });
  }

  if (
    profile.role !== "creator" &&
    profile.role !== "admin"
  ) {
    return json(403, {
      error: "Operazione non autorizzata",
    });
  }

  // =========================
  // BODY
  // =========================

  let body: any;

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, {
      error: "Body JSON non valido",
    });
  }

  const partitaId = String(body.partitaId || "").trim();
  const matchEvent = body.event as MatchEvent;

  const marcatoreId = body.marcatoreId
    ? String(body.marcatoreId).trim()
    : "";

  const eventiValidi: MatchEvent[] = [
    "match_start",
    "goal",
    "halftime",
    "second_half_start",
    "match_end",
  ];

  if (!partitaId) {
    return json(400, {
      error: "partitaId mancante",
    });
  }

  if (!eventiValidi.includes(matchEvent)) {
    return json(400, {
      error: "Evento partita non valido",
    });
  }

  if (matchEvent === "goal" && !marcatoreId) {
    return json(400, {
      error: "marcatoreId mancante",
    });
  }

  // =========================
  // RECUPERA PARTITA
  // =========================

  const { data: partita, error: partitaError } =
    await supabase
      .from("partite")
      .select(`
        id,
        squadra_casa_id,
        squadra_ospite_id,
        goal_a,
        goal_b,
        rigori_a,
        rigori_b
      `)
      .eq("id", partitaId)
      .single();

  if (partitaError || !partita) {
    console.error(
      "Errore recupero partita:",
      partitaError?.message
    );

    return json(404, {
      error: "Partita non trovata",
    });
  }

  // =========================
  // CONTROLLO STATO TIMER
  // =========================

  const { data: timerState, error: timerError } =
    await supabase
      .from("partita_timer_state")
      .select("timer_status, run_index")
      .eq("partita_id", partitaId)
      .maybeSingle();

  if (timerError) {
    console.error(
      "Errore recupero timer:",
      timerError.message
    );

    return json(500, {
      error: "Errore recupero stato partita",
    });
  }

  if (matchEvent !== "goal") {
    if (!timerState) {
      return json(400, {
        error: "Stato timer non trovato",
      });
    }

    const statoValido =
      (matchEvent === "match_start" &&
        timerState.timer_status === "running" &&
        timerState.run_index === 1) ||

      (matchEvent === "halftime" &&
        timerState.timer_status === "stopped" &&
        timerState.run_index === 1) ||

      (matchEvent === "second_half_start" &&
        timerState.timer_status === "running" &&
        timerState.run_index === 2) ||

      (matchEvent === "match_end" &&
        timerState.timer_status === "stopped" &&
        timerState.run_index === 6);

    if (!statoValido) {
      return json(409, {
        error: "Evento non coerente con lo stato della partita",
        event: matchEvent,
        timer_status: timerState.timer_status,
        run_index: timerState.run_index,
      });
    }
  }

  // =========================
  // EVENT KEY
  // =========================

  let eventKey = "";

  switch (matchEvent) {
    case "match_start":
      eventKey = `match:${partitaId}:start`;
      break;

    case "halftime":
      eventKey = `match:${partitaId}:halftime`;
      break;

    case "second_half_start":
      eventKey = `match:${partitaId}:second-half-start`;
      break;

    case "match_end":
      eventKey = `match:${partitaId}:final`;
      break;

    case "goal":
      eventKey = `match:${partitaId}:goal:${marcatoreId}`;
      break;
  }

  // =========================
  // RECUPERA GOL ESATTO
  // =========================

  let gol: {
    id: string;
    squadra_segnante_id: string | null;
  } | null = null;

  if (matchEvent === "goal") {
    const { data, error } = await supabase
      .from("marcatori")
      .select("id, squadra_segnante_id")
      .eq("id", marcatoreId)
      .eq("partita_id", partitaId)
      .maybeSingle();

    if (error) {
      console.error(
        "Errore recupero gol:",
        error.message
      );

      return json(500, {
        error: "Errore recupero gol",
      });
    }

    if (!data) {
      return json(404, {
        error: "Gol non trovato",
      });
    }

    gol = data;
  }

  // =========================
  // RECUPERA SQUADRE
  // =========================

  const { data: squadre, error: squadreError } =
    await supabase
      .from("squadre")
      .select("id, nome")
      .in("id", [
        partita.squadra_casa_id,
        partita.squadra_ospite_id,
      ]);

  if (squadreError) {
    console.error(
      "Errore recupero squadre:",
      squadreError.message
    );

    return json(500, {
      error: "Errore recupero squadre",
    });
  }

  const casa =
    squadre?.find(
      (s) => s.id === partita.squadra_casa_id
    ) || null;

  const ospite =
    squadre?.find(
      (s) => s.id === partita.squadra_ospite_id
    ) || null;

  if (!casa || !ospite) {
    return json(500, {
      error: "Squadre della partita non trovate",
    });
  }

  const nomeCasa = casa.nome || "Casa";
  const nomeOspite = ospite.nome || "Ospite";

  const goalCasa = partita.goal_a ?? 0;
  const goalOspite = partita.goal_b ?? 0;

  const risultato =
    `${nomeCasa} ${goalCasa} - ${goalOspite} ${nomeOspite}`;

  // =========================
  // COSTRUZIONE NOTIFICA
  // =========================

  let title = "Montecarlo Calcio";
  let message = risultato;

  switch (matchEvent) {
    case "match_start":
      title = "⚽ Partita iniziata";
      message = `${nomeCasa} - ${nomeOspite}`;
      break;

    case "goal": {
      const montecarloHaSegnato =
        gol?.squadra_segnante_id === MONTECARLO_ID;

      title = montecarloHaSegnato
        ? "⚽ GOOOL MONTECARLO!"
        : "⚽ Gol avversario";

      message = risultato;
      break;
    }

    case "halftime":
      title = "⏸️ Fine primo tempo";
      message = risultato;
      break;

    case "second_half_start":
      title = "▶️ Inizia il secondo tempo";
      message = risultato;
      break;

    case "match_end":
      title = "🏁 Partita terminata";
      message = `Risultato finale: ${risultato}`;

      if (
        partita.rigori_a != null &&
        partita.rigori_b != null &&
        (partita.rigori_a > 0 ||
          partita.rigori_b > 0)
      ) {
        message +=
          ` (Rigori ${partita.rigori_a} - ${partita.rigori_b})`;
      }

      break;
  }

  // =========================
  // BLOCCO DUPLICATI
  // =========================

  const { error: logError } = await supabase
    .from("push_event_log")
    .insert({
      event_key: eventKey,
      partita_id: partitaId,
      event_type: matchEvent,
    });

  if (logError) {
    if (logError.code === "23505") {
      console.log(
        "Push già inviata, evento ignorato:",
        eventKey
      );

      return json(200, {
        success: true,
        duplicate: true,
        event: matchEvent,
        partitaId,
      });
    }

    console.error(
      "Errore registrazione push_event_log:",
      logError.message
    );

    return json(500, {
      error: "Errore registrazione evento push",
    });
  }

  // =========================
  // RECUPERA DISPOSITIVI
  // =========================

  const { data: subscriptions, error: subsError } =
    await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");

  if (subsError) {
    console.error(
      "Errore recupero push subscriptions:",
      subsError.message
    );

    // Nessuna push è partita: consente un nuovo tentativo.
    await supabase
      .from("push_event_log")
      .delete()
      .eq("event_key", eventKey);

    return json(500, {
      error: "Errore recupero dispositivi",
    });
  }

  if (!subscriptions?.length) {
    // Non consideriamo consumato l'evento se non
    // esiste alcun dispositivo a cui inviarlo.
    await supabase
      .from("push_event_log")
      .delete()
      .eq("event_key", eventKey);

    return json(200, {
      success: true,
      sent: 0,
      failed: 0,
      message: "Nessun dispositivo registrato",
    });
  }

  // =========================
  // CONFIGURA WEB PUSH
  // =========================

  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  const payload = JSON.stringify({
    title,
    body: message,
    url: "/prossima-partita",
    tag: eventKey,
  });

  // =========================
  // INVIO
  // =========================

  let sent = 0;
  let failed = 0;

  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );

        sent++;
      } catch (err: any) {
        failed++;

        const statusCode =
          err?.statusCode || err?.status;

        console.error(
          "Errore invio push:",
          statusCode,
          err?.message
        );

        if (
          statusCode === 404 ||
          statusCode === 410
        ) {
          staleIds.push(sub.id);
        }
      }
    })
  );

  // Se non è arrivata a nessun dispositivo,
  // elimina il log per consentire un nuovo tentativo.
  if (sent === 0) {
    await supabase
      .from("push_event_log")
      .delete()
      .eq("event_key", eventKey);
  }

  // =========================
  // PULIZIA SUBSCRIPTION SCADUTE
  // =========================

  if (staleIds.length > 0) {
    const { error: deleteError } =
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", staleIds);

    if (deleteError) {
      console.error(
        "Errore eliminazione subscription scadute:",
        deleteError.message
      );
    }
  }

  return json(200, {
    success: true,
    duplicate: false,
    event: matchEvent,
    partitaId,
    eventKey,
    title,
    message,
    sent,
    failed,
  });
};