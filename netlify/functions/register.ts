// netlify/functions/register.ts
// Data: 21/08/2025
// Scopo: registrazione iniziale → inserisce l'utente in pending_users
// con token di conferma e invia email di conferma.
// NON salva password (l'utente la imposta solo dopo approvazione tramite link).

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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let body: { email?: string; username?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { email, username } = body;
  if (!email || !username) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  /* ------------------------------
   * 2.1) Genera token di conferma
   * ------------------------------ */
  const token = crypto.randomUUID();

  /* ------------------------------
   * 2.2) Inserisci in pending_users
   * ------------------------------ */
  const { error: insErr } = await supabase.from("pending_users").insert({
    email,
    username,
    confirmation_token: token,
    confirmed: false,
    approved: false,
    role: null,
  });

  if (insErr) {
    console.error("Errore insert pending_users:", insErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore inserimento pending_users" }) };
  }

  /* ------------------------------
   * 2.3) Prepara link di conferma
   * ------------------------------ */
  const confirmUrl = `https://montecarlo2013.it/conferma?token=${token}`;

  /* ------------------------------
   * 2.4) Invia email all'utente
   * ------------------------------ */
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Conferma registrazione Montecarlo 2013",
      html: `
        <p>Ciao ${username},</p>
        <p>Abbiamo ricevuto la tua richiesta di registrazione.</p>
        <p>Per confermare il tuo indirizzo email clicca sul link qui sotto:</p>
        <p>
          <a href="${confirmUrl}"
             style="display:inline-block;padding:10px 20px;
                    background:#004aad;color:#fff;
                    text-decoration:none;border-radius:5px;">
            Conferma la registrazione
          </a>
        </p>
        <p>Il tuo account sarà poi <b>approvato da un amministratore</b> prima di poter accedere.</p>
      `,
    });
  } catch (mailErr) {
    console.error("Errore invio email di conferma:", mailErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore invio email di conferma" }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
