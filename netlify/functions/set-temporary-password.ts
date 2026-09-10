import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Metodo non consentito",
      }),
    };
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Configurazione Supabase mancante",
      }),
    };
  }

  try {
    // =========================
    // TOKEN UTENTE ADMIN
    // =========================
    const authHeader =
      event.headers.authorization ||
      event.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Non autorizzato",
        }),
      };
    }

    const token = authHeader.substring(7);

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // =========================
    // VERIFICA UTENTE LOGGATO
    // =========================
    const {
      data: { user: requestingUser },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !requestingUser) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Sessione non valida",
        }),
      };
    }

    // =========================
    // VERIFICA RUOLO
    // =========================
    const { data: profile, error: profileError } =
      await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", requestingUser.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Errore controllo ruolo:",
        profileError
      );

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Errore durante il controllo del ruolo",
        }),
      };
    }

    const role = String(profile?.role || "").toLowerCase();

    if (role !== "admin" && role !== "creator") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Permessi insufficienti",
        }),
      };
    }

    // =========================
    // DATI RICHIESTA
    // =========================
    const body = JSON.parse(event.body || "{}");

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const temporaryPassword = String(
      body.password || ""
    );

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Email obbligatoria",
        }),
      };
    }

    if (temporaryPassword.length < 8) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "La password provvisoria deve contenere almeno 8 caratteri",
        }),
      };
    }

    // =========================
    // CERCA UTENTE AUTH
    // CON PAGINAZIONE
    // =========================
    let targetUser: any = null;

    let page = 1;
    const perPage = 100;

    while (!targetUser) {
      const {
        data: authData,
        error: listError,
      } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        console.error(
          "Errore ricerca utenti Auth:",
          listError
        );

        return {
          statusCode: 500,
          body: JSON.stringify({
            error:
              "Errore durante la ricerca dell'utente",
          }),
        };
      }

      const users = authData?.users || [];

      targetUser = users.find(
        (user) =>
          user.email?.trim().toLowerCase() === email
      );

      if (targetUser || users.length < perPage) {
        break;
      }

      page++;
    }

    if (!targetUser) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Utente Auth non trovato",
        }),
      };
    }

    // =========================
    // IMPOSTA PASSWORD
    // =========================
    const {
      data: updatedUser,
      error: updateError,
    } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      {
        password: temporaryPassword,
      }
    );

    if (updateError) {
      console.error(
        "Errore aggiornamento password:",
        updateError
      );

      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            "Errore durante l'impostazione della password provvisoria",
        }),
      };
    }

    // =========================
    // RISPOSTA
    // =========================
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        email: updatedUser.user?.email || email,
        message:
          "Password provvisoria impostata correttamente",
      }),
    };
  } catch (error) {
    console.error(
      "Errore set-temporary-password:",
      error
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore interno del server",
      }),
    };
  }
};