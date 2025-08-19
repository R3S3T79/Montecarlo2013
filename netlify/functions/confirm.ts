// netlify/functions/confirm.ts
// Data: 19/08/2025 – Alla conferma: crea l’utente in auth.users e reindirizza al login (senza auto-login)

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = event.queryStringParameters?.token;
  if (!token) {
    return {
      statusCode: 302,
      headers: { Location: "https://montecarlo2013.it/#/login?error=missing_token" },
      body: "",
    };
  }

  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("email, username, password, role, approved, confirmed, expires_at")
    .eq("confirmation_token", token)
    .single();

  if (selErr || !pending) {
    return {
      statusCode: 302,
      headers: { Location: "https://montecarlo2013.it/#/login?error=invalid" },
      body: "",
    };
  }

  if (!pending.approved) {
    return {
      statusCode: 302,
      headers: { Location: "https://montecarlo2013.it/#/login?error=not_approved" },
      body: "",
    };
  }

  if (pending.confirmed) {
    return {
      statusCode: 302,
      headers: { Location: "https://montecarlo2013.it/#/login?info=already_confirmed" },
      body: "",
    };
  }

  if (pending.expires_at && new Date(pending.expires_at) < new Date()) {
    return {
      statusCode: 302,
      headers: { Location: "https://montecarlo2013.it/#/login?error=expired" },
      body: "",
    };
  }

  if (!pending.password) {
    return {
      statusCode: 302,
      headers: { Location: "https://montecarlo2013.it/#/login?error=no_password" },
      body: "",
    };
  }

  // CREA UTENTE IN AUTH ORA — aggiunge anche role in app_metadata
  const { error: createErr } = await supabase.auth.admin.createUser({
    email: pending.email,
    password: pending.password,
    app_metadata: { role: pending.role || "user" },
    user_metadata: {
      username: pending.username,
      role: pending.role || "user",
    },
    email_confirm: true,
  });

  if (createErr) {
    return {
      statusCode: 302,
      headers: { Location: "https://montecarlo2013.it/#/login?error=create_failed" },
      body: "",
    };
  }

  // marca come confermato e rimuove la password
  await supabase
    .from("pending_users")
    .update({ confirmed: true, password: null })
    .eq("confirmation_token", token);

  // ✅ reindirizza SEMPRE alla pagina di login (senza auto-login)
  return {
    statusCode: 302,
    headers: {
      Location: "https://montecarlo2013.it/#/login?info=confirmed",
      "Cache-Control": "no-cache",
    },
    body: "",
  };
};
