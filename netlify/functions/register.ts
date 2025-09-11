// netlify/functions/register.ts
// Data: 27/08/2025 (rev: flusso semplificato → niente più link, solo notifica admin)
// Scopo: Registrazione utente → salva in pending_users e manda mail all'admin

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// =========================
// Supabase client (service)
// =========================
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =========================
// SMTP Transporters
// =========================
const transporterNotifications = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER_NOTIF,
    pass: process.env.SMTP_PASS_NOTIF,
  },
});

const transporterSupport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER_SUPPORT,
    pass: process.env.SMTP_PASS_SUPPORT,
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
  const { error: insertErr } = await supabase.from("pending_users").insert([
    {
      email,
      username,
      password,
      approved: false,
      confirmed: false,
    },
  ]);

  if (insertErr) {
    console.error("Errore insert pending_users:", insertErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore salvataggio utente" }) };
  }

  // =========================
  // Email di notifica ADMIN con fallback
  // =========================
  const mailOptions = {
    to: "marcomiressi@gmail.com", // 🔴 ADMIN
    subject: "Nuovo utente in attesa di approvazione",
    html: `
      <p>Nuova registrazione ricevuta:</p>
      <ul>
        <li>Email: <b>${email}</b></li>
        <li>Username: <b>${username || "-"}</b></li>
        <li>Ruolo richiesto: <b>${role || "user"}</b></li>
      </ul>
      <p>Puoi approvare l'utente dal <a href="https://montecarlo2013.it/admin-panel">Pannello Admin</a></p>
    `,
  };

  try {
    await transporterNotifications.sendMail({
      ...mailOptions,
      from: process.env.SMTP_FROM_NOTIF,
    });
    console.log("Email admin inviata con notifications@");
  } catch (errNotif) {
    console.warn("Errore con notifications@, retry con support@ :", errNotif);
    try {
      await transporterSupport.sendMail({
        ...mailOptions,
        from: process.env.SMTP_FROM_SUPPORT,
      });
      console.log("Email admin inviata con support@");
    } catch (errSupport) {
      console.error("Errore invio mail admin anche con support@:", errSupport);
      return { statusCode: 500, body: JSON.stringify({ error: "Errore invio mail admin (notif+support)" }) };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
