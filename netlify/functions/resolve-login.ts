// netlify/functions/resolve-login.ts
// Data creazione: 10/10/2026

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// =========================
// 1. CLIENT SUPABASE
// =========================
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =========================
// 2. RISOLUZIONE LOGIN
// =========================
const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { username } = JSON.parse(event.body || "{}");

    if (!username) {
      return { statusCode: 400, body: "Username mancante" };
    }

    const { data: pendingUser, error } = await supabase
      .from("pending_users")
      .select("email")
      .ilike("username", username.trim())
      .maybeSingle();

    if (error) {
      console.error("Resolve username error:", error);
      return { statusCode: 500, body: "Errore ricerca username" };
    }

    if (!pendingUser?.email) {
      return { statusCode: 404, body: "Username non trovato" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ email: pendingUser.email }),
    };
  } catch (err) {
    console.error("Unexpected resolve-login error:", err);
    return { statusCode: 500, body: "Errore interno server" };
  }
};

export { handler };