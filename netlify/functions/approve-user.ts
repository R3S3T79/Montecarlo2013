// netlify/functions/approve-user.ts
// Data: 27/08/2025 (rev: flusso semplificato → approvazione = conferma + mail benvenuto)

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

  let body: { email?: string; role?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { email, role } = body;
  if (!email || !role) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  // 1) Recupera l'utente pending
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("email, username, role, password, approved, confirmed")
    .eq("email", email)
    .maybeSingle();

  if (selErr || !pending) {
    console.error("Utente pending non trovato:", selErr);
    return { statusCode: 404, body: JSON.stringify({ error: "Pending user not found" }) };
  }

  // 2) Aggiorna pending_users (approved + confirmed + ruolo)
  const { error: updErr } = await supabase
    .from("pending_users")
    .update({ approved: true, confirmed: true, role })
    .eq("email", email);

  if (updErr) {
    console.error("Errore update pending_users:", updErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore aggiornamento pending_users" }) };
  }

  // 3) Se non esiste in Auth, crealo con password
  const list = await supabase.auth.admin.listUsers();
  const existing = list.data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!existing) {
    const create = await supabase.auth.admin.createUser({
      email,
      password: pending.password,
      email_confirm: true, // lo marchiamo già come confermato
      user_metadata: { role, username: pending.username || undefined },
    });
    if (create.error) {
      console.error("Errore createUser:", create.error);
      return { statusCode: 500, body: JSON.stringify({ error: "Errore creazione utente Auth" }) };
    }
  }

  // 4) Invia mail di benvenuto
  const mailOptions = {
    to: email,
    subject: "Benvenuto in Montecarlo 2013",
    html: `
      <p>Ciao ${pending.username || "utente"},</p>
      <p>Il tuo account è stato <b>approvato</b> con ruolo <b>${role}</b>.</p>
      <p>Ora puoi accedere alla piattaforma Montecarlo 2013 con la tua email e password.</p>
      <p>
        <a href="${process.env.APP_URL || process.env.SITE_URL}/login"
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
    console.log("Email benvenuto inviata con notifications@");
  } catch (errNotif) {
    console.warn("Errore con notifications@, retry con support@ :", errNotif);
    try {
      await transporterSupport.sendMail({
        ...mailOptions,
        from: process.env.SMTP_FROM_SUPPORT,
      });
      console.log("Email benvenuto inviata con support@");
    } catch (errSupport) {
      console.error("Errore invio mail benvenuto (notif+support):", errSupport);
      return { statusCode: 500, body: JSON.stringify({ error: "Errore invio mail benvenuto" }) };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
// netlify/functions/approve-user.ts
// Data: 27/08/2025 (rev: flusso semplificato → approvazione = conferma + mail benvenuto)

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

  let body: { email?: string; role?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { email, role } = body;
  if (!email || !role) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  // 1) Recupera l'utente pending
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("email, username, role, password, approved, confirmed")
    .eq("email", email)
    .maybeSingle();

  if (selErr || !pending) {
    console.error("Utente pending non trovato:", selErr);
    return { statusCode: 404, body: JSON.stringify({ error: "Pending user not found" }) };
  }

  // 2) Aggiorna pending_users (approved + confirmed + ruolo)
  const { error: updErr } = await supabase
    .from("pending_users")
    .update({ approved: true, confirmed: true, role })
    .eq("email", email);

  if (updErr) {
    console.error("Errore update pending_users:", updErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore aggiornamento pending_users" }) };
  }

  // 3) Se non esiste in Auth, crealo con password
  const list = await supabase.auth.admin.listUsers();
  const existing = list.data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!existing) {
    const create = await supabase.auth.admin.createUser({
      email,
      password: pending.password,
      email_confirm: true, // lo marchiamo già come confermato
      user_metadata: { role, username: pending.username || undefined },
    });
    if (create.error) {
      console.error("Errore createUser:", create.error);
      return { statusCode: 500, body: JSON.stringify({ error: "Errore creazione utente Auth" }) };
    }
  }

  // 4) Invia mail di benvenuto
  const mailOptions = {
    to: email,
    subject: "Benvenuto in Montecarlo 2013",
    html: `
      <p>Ciao ${pending.username || "utente"},</p>
      <p>Il tuo account è stato <b>approvato</b> con ruolo <b>${role}</b>.</p>
      <p>Ora puoi accedere alla piattaforma Montecarlo 2013 con la tua email e password.</p>
      <p>
        <a href="${process.env.APP_URL || process.env.SITE_URL}/login"
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
    console.log("Email benvenuto inviata con notifications@");
  } catch (errNotif) {
    console.warn("Errore con notifications@, retry con support@ :", errNotif);
    try {
      await transporterSupport.sendMail({
        ...mailOptions,
        from: process.env.SMTP_FROM_SUPPORT,
      });
      console.log("Email benvenuto inviata con support@");
    } catch (errSupport) {
      console.error("Errore invio mail benvenuto (notif+support):", errSupport);
      return { statusCode: 500, body: JSON.stringify({ error: "Errore invio mail benvenuto" }) };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
