// netlify/functions/approve-user.ts
// Data: 18/08/2025 – Approva (creator): set approved=true + assegna role + invia email con link di conferma.

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const authHeader = event.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { statusCode: 401, body: JSON.stringify({ error: "Missing or invalid authorization header" }) };
  }

  let decoded: any;
  try {
    decoded = jwt.verify(authHeader.replace("Bearer ", ""), process.env.SUPABASE_JWT_SECRET!);
  } catch (e: any) {
    return { statusCode: 401, body: JSON.stringify({ error: "Invalid token", details: e.message }) };
  }

  const requesterRole = decoded.app_metadata?.role || decoded.raw_app_meta_data?.role;
  if (requesterRole !== "creator") {
    return { statusCode: 403, body: JSON.stringify({ error: "Access denied: Creators only" }) };
  }

  let body: { email?: string; role?: "user" | "creator" | "admin" };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { email, role = "user" } = body;
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing email" }) };
  }

  // prendi pending_user
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("username, confirmation_token, approved, confirmed")
    .eq("email", email)
    .single();

  if (selErr || !pending) {
    return { statusCode: 404, body: JSON.stringify({ error: "Pending user not found" }) };
  }

  // marca approved=true e salva ruolo nella tabella pending_users
  await supabase
    .from("pending_users")
    .update({ approved: true, role })
    .eq("email", email);

  // aggiorna ruolo anche nei metadata di auth.users
  const { data: allUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    return { statusCode: 500, body: JSON.stringify({ error: "Error fetching auth users" }) };
  }

  const targetUser = allUsers?.users.find((u) => u.email === email);
  if (targetUser) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
      user_metadata: { ...targetUser.user_metadata, role },
    });
    if (updateError) {
      return { statusCode: 500, body: JSON.stringify({ error: "Error updating user metadata", details: updateError.message }) };
    }
  }

  // invia l’email di conferma
  const confirmUrl = `https://montecarlo2013.it/api/confirm?token=${pending.confirmation_token}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Conferma la tua email – Montecarlo 2013",
    html: `
      <p>Ciao ${pending.username},</p>
      <p>La tua registrazione è stata approvata. Conferma ora la tua email cliccando qui:</p>
      <p><a href="${confirmUrl}">${confirmUrl}</a></p>
      <p>Dopo la conferma potrai accedere all’app.</p>
    `,
  });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
