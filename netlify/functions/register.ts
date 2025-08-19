// netlify/functions/register.ts
// Data: 18/08/2025 – Registrazione utente: crea pending_user e invia email di conferma

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
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

  let body: { email?: string; password?: string; username?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { email, password, username } = body;
  if (!email || !password || !username) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  // crea utente in Supabase Auth (di default con ruolo user nei metadata)
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { role: "user", username },
  });

  if (authErr || !authUser.user) {
    return { statusCode: 500, body: JSON.stringify({ error: "Error creating auth user", details: authErr?.message }) };
  }

  // crea pending_user con token di conferma
  const token = crypto.randomUUID();
  await supabase.from("pending_users").insert([
    {
      email,
      username,
      confirmation_token: token,
      approved: false,
      confirmed: false,
      role: "user",
    },
  ]);

  // invia email di conferma
  const confirmUrl = `https://montecarlo2013.it/api/confirm?token=${token}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Conferma registrazione – Montecarlo 2013",
    html: `
      <p>Ciao ${username},</p>
      <p>Grazie per esserti registrato. Conferma ora la tua email cliccando qui:</p>
      <p><a href="${confirmUrl}">${confirmUrl}</a></p>
    `,
  });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
