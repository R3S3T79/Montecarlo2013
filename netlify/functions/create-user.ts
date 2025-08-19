// netlify/functions/create-user.ts

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ usa SERVICE_ROLE
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, password, nome, cognome, username, role } = JSON.parse(event.body || "{}");

    if (!email || !password || !role) {
      return { statusCode: 400, body: "Dati mancanti" };
    }

    // 1. Creo utente direttamente
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, cognome, username },
      app_metadata: { role },
    });

    if (error) throw error;

    // 2. Salvo anche in pending_users per coerenza
    await supabase.from("pending_users").insert([
      { email, role, nome, cognome, username, confirmed: true },
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, user }),
    };
  } catch (err: any) {
    return { statusCode: 500, body: err.message };
  }
};
