// netlify/functions/approve-user.ts
// Data: 21/08/2025 – Approvazione da Admin: setta role+approved, crea utente Auth se serve,
// e invia link di VERIFICA EMAIL Supabase all'utente (qui NON si tocca pending_users.confirmed)

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
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

  // 1) Recupera pending_user
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (selErr || !pending) {
    console.error("Utente pending non trovato:", selErr);
    return { statusCode: 404, body: JSON.stringify({ error: "Pending user not found" }) };
  }

  // 2) Aggiorna approved + role (NON confirmed!)
  const { error: updErr } = await supabase
    .from("pending_users")
    .update({ approved: true, role, confirmed: false })
    .eq("email", email);

  if (updErr) {
    console.error("Errore update pending_users:", updErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore aggiornamento pending_users" }) };
  }

  // 3) Crea (o recupera) utente in Auth con email non confermata
  //    Se l'utente esiste già, NON forzare conferma qui.
  //    Proviamo a creare: se c'è conflitto, proseguo.
  const tryCreate = await supabase.auth.admin.createUser({
    email,
    password: pending.password || undefined,
    email_confirm: false,
    user_metadata: { role, username: pending.username || undefined },
  });

  if (tryCreate.error && tryCreate.error.message && !tryCreate.error.message.includes("User already registered")) {
    console.error("Errore createUser:", tryCreate.error);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore creazione utente Auth" }) };
  }

  // 4) Genera link di VERIFICA EMAIL (Supabase gestisce la conferma)
  //    NB: type: 'signup' è adatto a inviare la mail di conferma.
  const gen = await supabase.auth.admin.generateLink({
    type: "signup",
    email,
    password: pending.password || undefined,
  });

  if (gen.error || !gen.data?.action_link) {
    console.error("Errore generateLink:", gen.error);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore generazione link conferma" }) };
  }

  const actionLink = gen.data.action_link;

  // 5) Invia email all’utente con il link di verifica (NON /api/confirm)
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Verifica il tuo indirizzo email – Montecarlo 2013",
      html: `
        <p>Ciao ${pending.username || ""},</p>
        <p>Sei stato approvato dall'amministratore. Verifica il tuo indirizzo email cliccando qui:</p>
        <p><a href="${actionLink}" target="_blank">${actionLink}</a></p>
        <p>Dopo la verifica verrai reindirizzato al sito.</p>
      `,
    });
  } catch (mailErr) {
    console.error("Errore invio mail all'utente:", mailErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore invio email all'utente" }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
