// netlify/functions/set-role.ts
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  // Accetta solo POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parsifica body
  let body: { email?: string; role?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }
  const { email, role } = body;
  if (!email || !role) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing email or role" }),
    };
  }

  // Recupera l'utente in auth.users
  const { data: user, error: selErr } = await supabaseAdmin
    .from("auth.users")
    .select("id, raw_app_meta_data")
    .eq("email", email)
    .single();
  if (selErr || !user) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "User not found" }),
    };
  }

  // Costruisci il nuovo raw_app_meta_data
  const newMeta = { ...(user.raw_app_meta_data || {}), role };

  // Aggiorna il ruolo
  const { error: upErr } = await supabaseAdmin
    .from("auth.users")
    .update({ raw_app_meta_data: newMeta })
    .eq("id", user.id);
  if (upErr) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error updating role", details: upErr.message }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
