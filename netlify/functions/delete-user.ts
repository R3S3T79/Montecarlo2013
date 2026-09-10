// netlify/functions/delete-user.ts
// Eliminazione completa utente Montecarlo 2013
// Permessi: solo creator / admin

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL!,
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
  // CONTROLLO RUOLO
  // =====================================

  const requesterRole =
    requester.app_metadata?.role ||
    requester.raw_app_meta_data?.role ||
    requester.user_metadata?.role;

  if (
    !["creator", "admin"].includes(
      requesterRole
    )
  ) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: "Access denied",
      }),
    };
  }

  // =====================================
  // EMAIL
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
  //
  // Cerchiamo gli UUID sia in Auth sia
  // in user_profiles.
  //
  // In questo modo possiamo eliminare
  // anche eventuali residui di vecchie
  // registrazioni.
  // =====================================

  const userIds = new Set<string>();

  // =====================================
  // CERCA IN AUTH
  // =====================================

  const {
    data: authData,
    error: authListError,
  } = await supabase.auth.admin.listUsers();

  if (authListError) {
    return errorResponse(
      "auth_lookup",
      "Errore durante la ricerca dell'utente in Auth",
      authListError.message
    );
  }

  const authUsers =
    authData?.users?.filter(
      (user) =>
        user.email?.toLowerCase() === email
    ) || [];

  authUsers.forEach((user) => {
    userIds.add(user.id);
  });

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

  // Pulizia aggiuntiva per email.
  // Serve nel caso esista un profilo
  // senza UUID Auth valido.

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
  //
  // Auth viene eliminato per ultimo.
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