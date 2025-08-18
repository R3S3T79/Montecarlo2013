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

  // 1. Recupera pending_user
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

  // 2. Controlla se esiste in Auth
  const { data: listRes, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    filter: `email=eq.${email}`,
  });
  if (listErr) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error listing users", details: listErr.message }),
    };
  }

  let userId: string;
  if (listRes.users.length === 0) {
    // Non esiste → crea
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pending.password!,
      user_metadata: { username: pending.username, role },
      email_confirm: true,
    });
    if (createErr) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error creating user", details: createErr.message }),
      };
    }
    userId = newUser.id;
  } else {
    // Esiste → aggiorna role
    const existing = listRes.users[0];
    userId = existing.id;
    const existingMeta = existing.user_metadata || {};
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...existingMeta, role },
    });
    if (updateErr) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error updating role", details: updateErr.message }),
      };
    }
  }

  // 3. Aggiorna pending_users (pulisci password + salva ruolo)
  await supabaseAdmin
    .from("pending_users")
    .update({ password: null, role })
    .eq("email", email);

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
