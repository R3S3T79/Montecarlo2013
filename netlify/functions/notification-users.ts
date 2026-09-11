import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Variabili Supabase mancanti.");
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Method Not Allowed",
      }),
    };
  }

  try {
    // =========================================
    // 1. AUTENTICAZIONE
    // =========================================

    const authHeader =
      event.headers.authorization ||
      event.headers.Authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Non autenticato",
        }),
      };
    }

    const accessToken =
      authHeader.substring("Bearer ".length);

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

    // =========================================
    // 2. SOLO CREATOR
    // =========================================

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile?.role !== "creator") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error:
            "Solo un Creator può visualizzare i destinatari delle notifiche.",
        }),
      };
    }

    // =========================================
    // 3. CARICA UTENTI
    // =========================================

    const {
      data: users,
      error: usersError,
    } = await supabase
      .from("user_profiles")
      .select(
        "user_id, email, username, role"
      )
      .order("username", {
        ascending: true,
      });

    if (usersError) {
      throw usersError;
    }

    // =========================================
    // 4. CARICA DISPOSITIVI PUSH
    // =========================================

    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await supabase
      .from("push_subscriptions")
      .select("user_id");

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    // =========================================
    // 5. CONTA DISPOSITIVI PER UTENTE
    // =========================================

    const deviceCount = new Map<
      string,
      number
    >();

    for (const subscription of
      subscriptions || []) {
      if (!subscription.user_id) {
        continue;
      }

      deviceCount.set(
        subscription.user_id,
        (deviceCount.get(
          subscription.user_id
        ) || 0) + 1
      );
    }

    // =========================================
    // 6. RISULTATO
    // =========================================

    const result = (users || []).map(
      (utente) => ({
        user_id: utente.user_id,
        email: utente.email,
        username: utente.username,
        role: utente.role,
        devices:
          deviceCount.get(
            utente.user_id
          ) || 0,
      })
    );

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        users: result,
      }),
    };
  } catch (error: any) {
    console.error(
      "[notification-users]",
      error
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          error?.message ||
          "Errore caricamento destinatari",
      }),
    };
  }
};