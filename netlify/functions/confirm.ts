// netlify/functions/confirm.ts
// Data: 18/08/2025 – Conferma registrazione: sposta utente da pending a auth.users

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const token = event.queryStringParameters?.token;
  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing confirmation token" }) };
  }

  // cerca pending_user
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("email, username, role, confirmed")
    .eq("confirmation_token", token)
    .single();

  if (selErr || !pending) {
    return { statusCode: 404, body: JSON.stringify({ error: "Invalid or expired token" }) };
  }

  if (pending.confirmed) {
    return { statusCode: 400, body: JSON.stringify({ error: "User already confirmed" }) };
  }

  // marca come confirmed
  await supabase
    .from("pending_users")
    .update({ confirmed: true })
    .eq("email", pending.email);

  // aggiorna ruolo nei metadata di auth.users
  const { data: allUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    return { statusCode: 500, body: JSON.stringify({ error: "Error fetching auth users" }) };
  }

  const targetUser = allUsers?.users.find((u) => u.email === pending.email);
  if (targetUser) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
      user_metadata: { ...targetUser.user_metadata, role: pending.role || "user" },
    });
    if (updateError) {
      return { statusCode: 500, body: JSON.stringify({ error: "Error updating user metadata", details: updateError.message }) };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, message: "User confirmed" }),
  };
};
