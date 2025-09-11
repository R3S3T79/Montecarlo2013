// netlify/functions/resend-welcome.ts
// Data: 27/08/2025
// Scopo: reinvia la mail di benvenuto a un utente già approvato/creato

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
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

  // Recupera utente pending (già approvato)
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("username, role, approved, confirmed")
    .eq("email", email)
    .maybeSingle();

  if (selErr || !pending) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "User not found in pending_users" }),
    };
  }

  if (!pending.approved || !pending.confirmed) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "User not yet approved/confirmed" }),
    };
  }

  // Prepara mail di benvenuto
  const mailOptions = {
    to: email,
    subject: "Benvenuto in Montecarlo 2013",
    html: `
      <p>Ciao ${pending.username || "utente"},</p>
      <p>Il tuo account è stato <b>approvato</b> con ruolo <b>${pending.role}</b>.</p>
      <p>Ora puoi accedere alla piattaforma Montecarlo 2013 con la tua email e password.</p>
      <p>
        <a href="https://montecarlo2013.it/login"
           style="display:inline-block;padding:10px 20px;
                  background:#004aad;color:#fff;
                  text-decoration:none;border-radius:5px;">
          Accedi ora
        </a>
      </p>
    `,
  };

  try {
    await transporterNotifications.sendMail({
      ...mailOptions,
      from: process.env.SMTP_FROM_NOTIF,
    });
    console.log(`Mail di benvenuto reinviata a ${email} con notifications@`);
  } catch (errNotif) {
    console.warn("Errore con notifications@, retry con support@:", errNotif);
    try {
      await transporterSupport.sendMail({
        ...mailOptions,
        from: process.env.SMTP_FROM_SUPPORT,
      });
      console.log(`Mail di benvenuto reinviata a ${email} con support@`);
    } catch (errSupport) {
      console.error("Errore reinvio mail benvenuto (notif+support):", errSupport);
      return { statusCode: 500, body: JSON.stringify({ error: "Errore reinvio mail" }) };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
