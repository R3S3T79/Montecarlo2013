// netlify/functions/register.ts
// Scopo: nuova registrazione → pending_users + email a admin
// Nessuna email all’utente qui.

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// SMTP → invio email admin
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
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body: { email?: string; username?: string; password?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { email, username, password } = body;
  if (!email) {
    return { statusCode: 400, body: "Email obbligatoria" };
  }

  // Inserisce utente pending
  const { error: insErr } = await supabase.from("pending_users").insert([
    {
      email,
      username: username || "",
      password: password || null,
      confirmed: false,
      approved: false,
    },
  ]);

  if (insErr) {
    console.error("Errore insert pending_users:", insErr);
    return { statusCode: 500, body: "Errore salvataggio pending user" };
  }

  // Invia mail a te admin
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "marcomiressi@gmail.com",
      subject: "Nuovo utente in attesa di approvazione",
      html: `
        <p>Ciao Marco,</p>
        <p>È stata effettuata una nuova registrazione con email: <b>${email}</b></p>
        <p>Per approvare o rifiutare l'utente, accedi al pannello Admin:</p>
        <p>
          <a href="https://montecarlo2013.it/admin-panel"
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
    return { statusCode: 500, body: "Errore invio email admin" };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
