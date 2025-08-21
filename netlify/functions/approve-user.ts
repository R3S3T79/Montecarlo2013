// netlify/functions/approve-user.ts
// Data: 21/08/2025
// Scopo: approvazione da Admin → aggiorna pending_users (approved+role),
// crea l'utente in Auth SE non esiste già, genera un link (signup/invite/magiclink/recovery)
// e invia email all'utente. NON tocca pending_users.confirmed (diventa TRUE solo dopo conferma).

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// ================================
// Supabase (service role)
// ================================
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ================================
// SMTP mailer
// ================================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ================================
// Helper: genera link migliore
// ================================
async function generateBestLink(
  email: string,
  isNewUser: boolean,
  password?: string
): Promise<string | null> {
  const queue = isNewUser
    ? [
        { type: "signup" as const, withPassword: true },
        { type: "invite" as const, withPassword: false },
      ]
    : [
        { type: "invite" as const, withPassword: false },
        { type: "magiclink" as const, withPassword: false },
        { type: "recovery" as const, withPassword: false },
      ];

  for (const item of queue) {
    const res = await supabase.auth.admin.generateLink({
      // @ts-expect-error – supabase accetta queste stringhe
      type: item.type,
      email,
      ...(item.withPassword ? { password } : {}),
    });

    if (res?.data?.action_link) {
      return res.data.action_link;
    }
  }

  return null;
}

// ================================
// Handler principale
// ================================
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

  // 2) Aggiorna approved + role
  const { error: updErr } = await supabase
    .from("pending_users")
    .update({ approved: true, role, confirmed: false })
    .eq("email", email);

  if (updErr) {
    console.error("Errore update pending_users:", updErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore aggiornamento pending_users" }) };
  }

  // 3) Verifica se esiste già in Auth
  const list = await supabase.auth.admin.listUsers();
  const existing = list.data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let userExists = !!existing;

  // 4) Se non esiste → crealo
  if (!userExists) {
    const create = await supabase.auth.admin.createUser({
      email,
      password: pending.password || undefined,
      email_confirm: false,
      user_metadata: { role, username: pending.username || undefined },
    });

    if (create.error) {
      console.error("Errore createUser:", create.error);
      return { statusCode: 500, body: JSON.stringify({ error: "Errore creazione utente Auth" }) };
    }
  }

  // 5) Genera link di conferma
  const actionLink = await generateBestLink(
    email,
    !userExists,
    pending.password || undefined
  );

  // 6) Invia mail all’utente
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email, // 🔴 questa volta al nuovo utente
      subject: "Il tuo account Montecarlo 2013 è stato approvato",
      html: `
        <p>Ciao ${pending.username || "utente"},</p>
        <p>Il tuo account è stato <b>approvato</b> con ruolo <b>${role}</b>.</p>
        ${
          actionLink
            ? `
              <p>Per completare la conferma e accedere, clicca qui:</p>
              <p>
                <a href="${actionLink}"
                   style="display:inline-block;padding:10px 20px;
                          background:#004aad;color:#fff;
                          text-decoration:none;border-radius:5px;">
                  Conferma e Accedi
                </a>
              </p>
            `
            : `
              <p>⚠️ Non è stato possibile generare automaticamente il link di accesso.</p>
              <p>Prova ad accedere da: <a href="https://montecarlo2013.it/login">Login</a></p>
            `
        }
      `,
    });
  } catch (mailErr) {
    console.error("Errore invio mail utente:", mailErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore invio email utente" }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
