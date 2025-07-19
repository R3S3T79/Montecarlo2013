// netlify/functions/set-role.ts
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let body: { email?: string; role?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }
  const { email, role } = body;
  if (!email || !role) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing email or role" }) };
  }

  // 1) Recupera il pending_user confermato
  const { data: pending, error: pErr } = await supabaseAdmin
    .from("pending_users")
    .select("username, password, confirmed")
    .eq("email", email)
    .single();

  if (pErr || !pending) {
    return { statusCode: 404, body: JSON.stringify({ error: "Pending user not found" }) };
  }
  if (!pending.confirmed) {
    return { statusCode: 400, body: JSON.stringify({ error: "Email not yet confirmed" }) };
  }

  // 2) Verifica se esiste già su auth.users
  const { data: authUser, error: uErr } = await supabaseAdmin
    .from("auth.users")
    .select("id, raw_app_meta_data")
    .eq("email", email)
    .single();

  if (uErr || !authUser) {
    // 2a) se non esiste, lo creo
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pending.password,
      user_metadata: { username: pending.username, role },
      email_confirm: true,
    });
    if (createErr) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error creating user", details: createErr.message }),
      };
    }
  } else {
    // 2b) se esiste, aggiorno solo il role
    const updatedMeta = {
      ...(authUser.raw_app_meta_data || {}),
      role,
    };
    const { error: upErr } = await supabaseAdmin
      .from("auth.users")
      .update({ raw_app_meta_data: updatedMeta })
      .eq("id", authUser.id);
    if (upErr) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error updating role", details: upErr.message }),
      };
    }
  }

  // 3) (Opzionale) Pulisci la password da pending_users
  await supabaseAdmin
    .from("pending_users")
    .update({ password: null })
    .eq("email", email);

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
