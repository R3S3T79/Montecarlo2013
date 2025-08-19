// netlify/functions/register.ts
// Data: 18/08/2025 – Flusso nuovo: NESSUNA email all’utente al momento della registrazione.
// Solo insert in pending_users e notifica al creator.

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

  let body: { email?: string; username?: string; password?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { email, username, password } = body;
  if (!email || !username || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  try {
    const confirmation_token = crypto.randomBytes(32).toString("hex");

    const { error: insertError } = await supabase
      .from("pending_users")
      .insert({
        email,
        username,
        password,                 // <-- la teniamo fino alla conferma
        confirmation_token,
        approved: false,          // <-- nuovo flusso
        confirmed: false,
      });

    if (insertError) {
      return { statusCode: 400, body: JSON.stringify({ error: insertError.message }) };
    }

    // NOTIFICA SOLO AL CREATOR (niente email all’utente)
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "marcomiressi@gmail.com",
      subject: "Nuova registrazione in attesa di approvazione",
      html: `
        <p>Nuova richiesta di registrazione.</p>
        <p><b>Utente:</b> ${username} &lt;${email}&gt;</p>
        <p>Apri il <a href="https://montecarlo2013.it/#/admin-panel">Pannello Admin</a> per approvare.</p>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err: any) {
    console.error("Register error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal server error", details: err.message }) };
  }
};
