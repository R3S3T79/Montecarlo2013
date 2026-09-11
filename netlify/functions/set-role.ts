import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

type Role = "user" | "admin" | "creator";

const ALLOWED_ROLES: Role[] = ["user", "admin", "creator"];

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
  if (event.httpMethod !== "POST") {
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
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !caller) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Sessione non valida",
        }),
      };
    }

    // =========================================
    // 2. SOLO CREATOR PUÒ CAMBIARE I RUOLI
    // =========================================

    const {
      data: callerProfile,
      error: callerProfileError,
    } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (callerProfileError) {
      throw callerProfileError;
    }

    if (callerProfile?.role !== "creator") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error:
            "Solo un Creator può modificare i ruoli.",
        }),
      };
    }

    // =========================================
    // 3. DATI RICHIESTA
    // =========================================

    const { email, role } = JSON.parse(
      event.body || "{}"
    ) as {
      email?: string;
      role?: string;
    };

    const emailNorm =
      email?.trim().toLowerCase();

    const roleNorm =
      role?.trim().toLowerCase() as Role;

    if (!emailNorm || !roleNorm) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Email o ruolo mancanti",
        }),
      };
    }

    if (!ALLOWED_ROLES.includes(roleNorm)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Ruolo non valido",
        }),
      };
    }

    // =========================================
    // 4. TROVA UTENTE AUTH
    // =========================================

    let foundUser: any = null;
    let page = 1;
    const perPage = 1000;

    while (!foundUser) {
      const { data, error } =
        await supabase.auth.admin.listUsers({
          page,
          perPage,
        });

      if (error) {
        throw error;
      }

      foundUser = data.users.find(
        (u) =>
          u.email?.trim().toLowerCase() ===
          emailNorm
      );

      if (
        foundUser ||
        data.users.length < perPage
      ) {
        break;
      }

      page += 1;
    }

    if (!foundUser) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Utente Auth non trovato",
        }),
      };
    }

    const userId = foundUser.id;

    // =========================================
    // 5. AUTH METADATA
    // =========================================

    const { error: authUpdateError } =
      await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            ...foundUser.user_metadata,
            role: roleNorm,
          },
        }
      );

    if (authUpdateError) {
      throw authUpdateError;
    }

    // =========================================
    // 6. USER_PROFILES
    // FONTE UFFICIALE DEL RUOLO
    // =========================================

    const { error: profileError } =
      await supabase
        .from("user_profiles")
        .upsert(
          {
            user_id: userId,
            email: emailNorm,
            role: roleNorm,
          },
          {
            onConflict: "user_id",
          }
        );

    if (profileError) {
      throw profileError;
    }

    // =========================================
    // 7. PENDING_USERS
    // Manteniamo sincronizzato anche il dato
    // storico usato dal pannello
    // =========================================

    const { error: pendingError } =
      await supabase
        .from("pending_users")
        .update({
          role: roleNorm,
        })
        .ilike("email", emailNorm);

    if (pendingError) {
      console.warn(
        "[set-role] pending_users:",
        pendingError.message
      );
    }

    // =========================================
    // 8. RISPOSTA
    // =========================================

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        userId,
        email: emailNorm,
        role: roleNorm,
      }),
    };
  } catch (error: any) {
    console.error("[set-role]", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          error?.message ||
          "Errore durante il cambio ruolo",
      }),
    };
  }
};