import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

type TargetType = "all" | "admin" | "creator" | "users";

type RequestBody = {
  title?: string;
  message?: string;
  url?: string;
  target?: TargetType;
  userIds?: string[];
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Method Not Allowed",
      }),
    };
  }

  try {
    // =======================================
    // 1. AUTENTICAZIONE
    // =======================================

    const authHeader =
      event.headers.authorization || event.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Non autenticato",
        }),
      };
    }

    const accessToken = authHeader.substring(7);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Sessione non valida",
        }),
      };
    }

    // =======================================
    // 2. CONTROLLO CREATOR
    // =======================================

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Profilo utente non trovato",
        }),
      };
    }

    const role = String(profile.role || "").toLowerCase();

    if (role !== "creator") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Solo un Creator può inviare notifiche manuali",
        }),
      };
    }

    // =======================================
    // 3. LETTURA DATI
    // =======================================

    let body: RequestBody;

    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Dati della richiesta non validi",
        }),
      };
    }

    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    const target = body.target;
    const userIds = Array.isArray(body.userIds)
      ? [...new Set(body.userIds.filter(Boolean))]
      : [];

    // =======================================
    // 4. VALIDAZIONE
    // =======================================

    if (!title) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Inserisci il titolo della notifica",
        }),
      };
    }

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Inserisci il messaggio della notifica",
        }),
      };
    }

    if (
      target !== "all" &&
      target !== "admin" &&
      target !== "creator" &&
      target !== "users"
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Destinatari non validi",
        }),
      };
    }

    if (target === "users" && userIds.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Seleziona almeno un utente",
        }),
      };
    }

    // =======================================
    // 5. URL INTERNA SICURA
    // =======================================

    let notificationUrl = String(body.url || "/").trim();

    if (
      !notificationUrl.startsWith("/") ||
      notificationUrl.startsWith("//")
    ) {
      notificationUrl = "/";
    }

    // =======================================
    // 6. TROVA GLI UTENTI DESTINATARI
    // =======================================

    let recipientUserIds: string[] = [];

    if (target === "all") {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id");

      if (error) {
        throw error;
      }

      recipientUserIds = (data || []).map((row) => row.user_id);
    }

    if (target === "admin" || target === "creator") {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("role", target);

      if (error) {
        throw error;
      }

      recipientUserIds = (data || []).map((row) => row.user_id);
    }

    if (target === "users") {
      // Accettiamo solamente ID che esistono realmente in user_profiles.
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id")
        .in("user_id", userIds);

      if (error) {
        throw error;
      }

      recipientUserIds = (data || []).map((row) => row.user_id);
    }

    recipientUserIds = [...new Set(recipientUserIds)];

    if (recipientUserIds.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          recipients: 0,
          devices: 0,
          sent: 0,
          failed: 0,
          message: "Nessun destinatario trovato.",
        }),
      };
    }

    // =======================================
    // 7. TROVA I DISPOSITIVI
    // =======================================

    const { data: subscriptions, error: subscriptionsError } =
      await supabase
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth")
        .in("user_id", recipientUserIds);

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          recipients: recipientUserIds.length,
          devices: 0,
          sent: 0,
          failed: 0,
          message:
            "I destinatari selezionati non hanno ancora dispositivi registrati.",
        }),
      };
    }

    // =======================================
    // 8. PREPARA NOTIFICA
    // =======================================

    const payload = JSON.stringify({
      title,
      body: message,
      url: notificationUrl,

      // Tag unico per evitare che una notifica di test
      // o precedente venga semplicemente sostituita.
      tag: `manual-${Date.now()}`,
    });

    // =======================================
    // 9. INVIO
    // =======================================

    let sent = 0;
    let failed = 0;

    for (const row of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          payload
        );

        sent++;
      } catch (error: any) {
        failed++;

        console.error(
          "Errore invio push:",
          error?.statusCode,
          error?.body || error?.message
        );

        // Sottoscrizione non più valida:
        // la eliminiamo automaticamente.
        if (
          error?.statusCode === 404 ||
          error?.statusCode === 410
        ) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", row.id);
        }
      }
    }

    // =======================================
    // 10. RISPOSTA
    // =======================================

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        recipients: recipientUserIds.length,
        devices: subscriptions.length,
        sent,
        failed,
      }),
    };
  } catch (error: any) {
    console.error(
      "Errore send-push:",
      error?.message || error
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore durante l'invio delle notifiche",
      }),
    };
  }
};