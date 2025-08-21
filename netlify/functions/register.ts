// netlify/functions/register.ts
// Data: 21/08/2025
// Scopo: registra nuovo utente → inserisce in pending_users con confirmation_token
// Invia email all’amministratore per approvazione.

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import crypto from "crypto";

/* ================================
 * 1) Setup Supabase (service role)
 * ================================ */
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ==================================
 * 2) Setup mailer (SMTP del progetto)
 * ================================== */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* =========================================
 * 3) Handler principale
 * ========================================= */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  let body: { email?: string; password?: string; username?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { email, password, username } = body;
  if (!email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  /* ------------------------------
   * 3.1) Genera token conferma
   * ------------------------------ */
  const confirmation_token = crypto.randomUUID();

  /* ------------------------------
   * 3.2) Inserisci utente in pending_users
   * ------------------------------ */
  const { error: insErr } = await supabase
    .from("pending_users")
    .insert([
      {
        email,
        username: username || null,
        password,
        confirmation_token,
        confirmed: false,
        approved: false,
      },
    ]);

  if (insErr) {
    console.error("Errore insert pending_users:", insErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore salvataggio pending_users" }),
    };
  }

  /* ------------------------------
   * 3.3) Invia email all’amministratore
   * ------------------------------ */
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.ADMIN_EMAIL, // riceve la notifica l’admin
      subject: "Nuovo utente in attesa di approvazione",
      html: `
        <p>Nuovo utente registrato:</p>
        <ul>
          <li>Email: ${email}</li>
          <li>Username: ${username || "-"}</li>
        </ul>
        <p>Accedi al <a href="https://montecarlo2013.it/admin">Pannello Admin</a> per approvarlo.</p>
      `,
    });
  } catch (mailErr) {
    console.error("Errore invio mail admin:", mailErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore invio email admin" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
