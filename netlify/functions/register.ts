// netlify/functions/register.ts
// Data: 21/08/2025
// Scopo: Registrazione utente → salva in pending_users e manda mail all'admin (NON all'utente)

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import crypto from "crypto";

// =========================
// Supabase client (service)
// =========================
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =========================
// Nodemailer (SMTP)
// =========================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// =========================
// Handler
// =========================
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let body: { email?: string; username?: string; password?: string; role?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { email, username, password, role } = body;
  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  // =========================
  // Inserimento in pending_users
  // =========================
  const confirmationToken = crypto.randomUUID();

  const { error: insertErr } = await supabase.from("pending_users").insert([
    {
      email,
      username,
      password,
      role: role || "user",
      approved: false,
      confirmed: false,
      confirmation_token: confirmationToken,
    },
  ]);

  if (insertErr) {
    console.error("Errore insert pending_users:", insertErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore salvataggio utente" }) };
  }

  // =========================
  // Email di notifica ADMIN
  // =========================
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "marcomiressi@gmail.com", // 🔴 ADMIN
      subject: "Nuovo utente in attesa di approvazione",
      html: `
        <p>Nuova registrazione ricevuta:</p>
        <ul>
          <li>Email: <b>${email}</b></li>
          <li>Username: <b>${username || "-"}</b></li>
          <li>Ruolo richiesto: <b>${role || "user"}</b></li>
        </ul>
        <p>Puoi approvare l'utente dal <a href="https://montecarlo2013.it/admin">Pannello Admin</a></p>
      `,
    });
  } catch (mailErr) {
    console.error("Errore invio mail admin:", mailErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore invio mail admin" }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
