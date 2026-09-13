import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// =========================
// 1. CONFIGURAZIONE
// =========================

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

// =========================
// 2. HANDLER
// =========================

export const handler: Handler = async (event) => {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
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
  // 3. AUTENTICAZIONE
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
  // 4. CONTROLLO CREATOR
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

  if (profile.role !== "creator") {
    return json(403, {
      error: "Operazione riservata al Creator",
    });
  }

  // =========================
  // 5. LETTURA STATO
  // =========================

  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("push_settings")
      .select("enabled")
      .eq("id", "match_notifications")
      .maybeSingle();

    if (error) {
      console.error(
        "Errore lettura impostazioni notifiche:",
        error.message
      );

      return json(500, {
        error: "Errore lettura impostazioni notifiche",
      });
    }

    return json(200, {
      enabled: data?.enabled !== false,
    });
  }

  // =========================
  // 6. MODIFICA STATO
  // =========================

  if (event.httpMethod === "POST") {
    let body: any;

    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, {
        error: "Body JSON non valido",
      });
    }

    if (typeof body.enabled !== "boolean") {
      return json(400, {
        error: "Valore enabled non valido",
      });
    }

    const { data, error } = await supabase
      .from("push_settings")
      .update({
        enabled: body.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "match_notifications")
      .select("enabled")
      .single();

    if (error) {
      console.error(
        "Errore aggiornamento impostazioni notifiche:",
        error.message
      );

      return json(500, {
        error: "Errore aggiornamento impostazioni notifiche",
      });
    }

    return json(200, {
      success: true,
      enabled: data.enabled,
    });
  }

  // =========================
  // 7. METODO NON CONSENTITO
  // =========================

  return json(405, {
    error: "Metodo non consentito",
  });
};