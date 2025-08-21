// netlify/functions/register.ts
// Data: 21/08/2025 – Registrazione utente: inserisce in pending_users e avvisa l'admin
// L'utente NON riceve alcuna email a questo stadio

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
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
  if (!email || !username) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  // 1) Token per conferma (verrà usato dopo)
  const token = crypto.randomUUID();

  // 2) Inserimento in pending_users
  const { error: insertErr } = await supabase.from("pending_users").insert([
    {
      email,
      username,
      password: password || null,
      confirmation_token: token,
      approved: false,
      confirmed: false,
      role: null,
    },
  ]);

  if (insertErr) {
    console.error("Errore inserimento pending_users:", insertErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore registrazione utente" }) };
  }

  // 3) Email all'Admin con pulsante verso admin-panel
  const adminEmail = "marcomiressi@gmail.com";
  const adminPanelLink = "https://montecarlo2013.it/admin-panel";

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: adminEmail,
      subject: "Nuovo utente in attesa di approvazione",
      html: `
        <p>Ciao Admin,</p>
        <p>Un nuovo utente si è registrato ed è in attesa di approvazione:</p>
        <ul>
          <li><b>Email:</b> ${email}</li>
          <li><b>Username:</b> ${username}</li>
        </ul>
        <p>
          <a href="${adminPanelLink}"
             style="display:inline-block;padding:10px 20px;
                    background:#004aad;color:#fff;
                    text-decoration:none;border-radius:5px;">
            Vai al Pannello Admin
          </a>
        </p>
      `,
    });
  } catch (mailErr) {
    console.error("Errore invio mail admin:", mailErr);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: "Registrazione completata. L'amministratore riceverà la notifica di approvazione.",
    }),
  };
};
