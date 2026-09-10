// netlify/functions/delete-user.ts
// Eliminazione completa utente Montecarlo 2013
// Permessi: solo creator / admin

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =======================================
// RISPOSTA ERRORE
// =======================================

const errorResponse = (
  step: string,
  message: string,
  details?: string
) => {
  console.error(
    `delete-user - ${step}:`,
    details || message
  );

  return {
    statusCode: 500,
    body: JSON.stringify({
      success: false,
      step,
      error: message,
      details,
    }),
  };
};

// =======================================
// HANDLER
// =======================================

export const handler: Handler = async (event) => {
  // =====================================
  // SOLO POST
  // =====================================

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Method Not Allowed",
      }),
    };
  }

  // =====================================
  // AUTENTICAZIONE
  // =====================================

  const authHeader =
    event.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        error:
          "Missing or invalid authorization header",
      }),
    };
  }

  let requester: any;

  try {
    requester = jwt.verify(
      authHeader.slice(7),
      process.env.SUPABASE_JWT_SECRET!
    );
  } catch (error: any) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: "Invalid token",
        details: error.message,
      }),
    };
  }

  // =====================================
  // CONTROLLO RUOLO DA USER_PROFILES
  // =====================================

  const requesterId = requester.sub;

  if (!requesterId) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: "Utente non identificato",
      }),
    };
  }

  const {
    data: requesterProfile,
    error: profileRoleError,
  } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", requesterId)
    .maybeSingle();

  if (profileRoleError) {
    console.error(
      "Errore lettura ruolo:",
      profileRoleError
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Errore durante il controllo del ruolo",
      }),
    };
  }

  const requesterRole = String(
    requesterProfile?.role || ""
  ).toLowerCase();

  if (
    requesterRole !== "creator" &&
    requesterRole !== "admin"
  ) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: "Access denied",
      }),
    };
  }

  // =====================================
  // EMAIL UTENTE DA ELIMINARE
  // =====================================

  let body: {
    email?: string;
  };

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid JSON",
      }),
    };
  }

  const email =
    body.email?.trim().toLowerCase();

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing email",
      }),
    };
  }

  // =====================================
  // RACCOLTA USER ID
  // =====================================

  const userIds = new Set<string>();

  // =====================================
  // CERCA IN AUTH CON PAGINAZIONE
  // =====================================

  const authUsers: any[] = [];

  let page = 1;
  const perPage = 100;

  while (true) {
    const {
      data: authData,
      error: authListError,
    } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (authListError) {
      return errorResponse(
        "auth_lookup",
        "Errore durante la ricerca dell'utente in Auth",
        authListError.message
      );
    }

    const users = authData?.users || [];

    const matches = users.filter(
      (user) =>
        user.email?.trim().toLowerCase() === email
    );

    for (const user of matches) {
      authUsers.push(user);
      userIds.add(user.id);
    }

    if (users.length < perPage) {
      break;
    }

    page++;
  }

  // =====================================
  // CERCA EVENTUALI PROFILI RESIDUI
  // =====================================

  const {
    data: profiles,
    error: profileLookupError,
  } = await supabase
    .from("user_profiles")
    .select("user_id")
    .ilike("email", email);

  if (profileLookupError) {
    return errorResponse(
      "user_profiles_lookup",
      "Errore durante la ricerca dei profili utente",
      profileLookupError.message
    );
  }

  (profiles || []).forEach((profile: any) => {
    if (profile.user_id) {
      userIds.add(profile.user_id);
    }
  });

  const ids = Array.from(userIds);

  console.log(
    `delete-user: ${email} - UUID trovati:`,
    ids
  );

  // =====================================
  // 1. VOTI GIOCATORI
  // =====================================

  if (ids.length > 0) {
    const { error } = await supabase
      .from("voti_giocatori")
      .delete()
      .in("user_id", ids);

    if (error) {
      return errorResponse(
        "voti_giocatori",
        "Errore eliminazione voti utente",
        error.message
      );
    }
  }

  // =====================================
  // 2. SESSION COUNTS
  // =====================================

  if (ids.length > 0) {
    const { error } = await supabase
      .from("session_counts")
      .delete()
      .in("user_id", ids);

    if (error) {
      return errorResponse(
        "session_counts",
        "Errore eliminazione sessioni utente",
        error.message
      );
    }
  }

  // =====================================
  // 3. USER PROFILES
  // =====================================

  if (ids.length > 0) {
    const { error } = await supabase
      .from("user_profiles")
      .delete()
      .in("user_id", ids);

    if (error) {
      return errorResponse(
        "user_profiles_by_id",
        "Errore eliminazione profilo utente",
        error.message
      );
    }
  }

  // Pulizia aggiuntiva tramite email

  const {
    error: profileEmailDeleteError,
  } = await supabase
    .from("user_profiles")
    .delete()
    .ilike("email", email);

  if (profileEmailDeleteError) {
    return errorResponse(
      "user_profiles_by_email",
      "Errore pulizia profilo tramite email",
      profileEmailDeleteError.message
    );
  }

  // =====================================
  // 4. PENDING USERS
  // =====================================

  const {
    error: pendingDeleteError,
  } = await supabase
    .from("pending_users")
    .delete()
    .ilike("email", email);

  if (pendingDeleteError) {
    return errorResponse(
      "pending_users",
      "Errore eliminazione registrazione utente",
      pendingDeleteError.message
    );
  }

  // =====================================
  // 5. AUTH USERS
  // Auth viene eliminato per ultimo
  // =====================================

  for (const authUser of authUsers) {
    const { error } =
      await supabase.auth.admin.deleteUser(
        authUser.id
      );

    if (error) {
      return errorResponse(
        "auth_delete",
        `Errore eliminazione utente Auth ${authUser.id}`,
        error.message
      );
    }
  }

  // =====================================
  // COMPLETATO
  // =====================================

  console.log(
    `delete-user completato: ${email}`
  );

  return {
    statusCode: 200,

    body: JSON.stringify({
      success: true,
      email,
      deletedUserIds: ids,
      authUsersDeleted: authUsers.length,
      message:
        "Utente eliminato completamente",
    }),
  };
};