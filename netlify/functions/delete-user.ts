// netlify/functions/delete-user.ts
// Elimina l'utente sia da auth.users sia da pending_users
// Permessi: solo requester con role "creator" o "admin"

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const authHeader = event.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { statusCode: 401, body: JSON.stringify({ error: "Missing or invalid authorization header" }) };
  }

  let requester: any;
  try {
    requester = jwt.verify(authHeader.slice(7), process.env.SUPABASE_JWT_SECRET!);
  } catch (e: any) {
    return { statusCode: 401, body: JSON.stringify({ error: "Invalid token", details: e.message }) };
  }

  const requesterRole =
    requester.app_metadata?.role ||
    requester.raw_app_meta_data?.role ||
    requester.user_metadata?.role;

  if (!["creator", "admin"].includes(requesterRole)) {
    return { statusCode: 403, body: JSON.stringify({ error: "Access denied" }) };
  }

  let body: { email?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }
  const { email } = body;
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing email" }) };
  }

  // 1) Se esiste in Auth → cancellalo
  const { data: listRes, error: listErr } = await supabase.auth.admin.listUsers({ filter: `email=eq.${email}` });
  if (listErr) {
    return { statusCode: 500, body: JSON.stringify({ error: "Error listing users", details: listErr.message }) };
  }

  if (listRes?.users?.length) {
    const userId = listRes.users[0].id;
    const { error: delAuthErr } = await supabase.auth.admin.deleteUser(userId);
    if (delAuthErr) {
      return { statusCode: 500, body: JSON.stringify({ error: "Error deleting auth user", details: delAuthErr.message }) };
    }
  }

  // 2) Elimina comunque da pending_users
  const { error: delPendingErr } = await supabase.from("pending_users").delete().eq("email", email);
  if (delPendingErr) {
    return { statusCode: 500, body: JSON.stringify({ error: "Error deleting pending user", details: delPendingErr.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
