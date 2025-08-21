// netlify/functions/approve-user.ts
// Data: 21/08/2025
// Scopo: approvazione da Admin → aggiorna pending_users (approved+role),
// crea l'utente in Auth SE non esiste già, genera un link (signup/invite/magiclink/recovery)
// e invia email all'utente. NON tocca pending_users.confirmed (diventa TRUE solo dopo conferma).

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

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

/* ==========================================================
 * 3) Helper: prova più tipi di link finché ne otteniamo uno
 * ========================================================== */
async function generateBestLink(
  email: string,
  isNewUser: boolean
): Promise<string | null> {
  const typesNew = ["signup", "invite"] as const;
  const typesExisting = ["invite", "magiclink", "recovery"] as const;

  const queue = isNewUser ? typesNew : typesExisting;

  for (const type of queue) {
    const gen = await supabase.auth.admin.generateLink({
      // @ts-expect-error – tipo accetta stringhe letterali
      type,
      email,
    });

    if (gen?.data?.action_link) {
      return gen.data.action_link;
    }
  }

  return null;
}

/* =========================================
 * 4) Handler principale Netlify Function
 * ========================================= */
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

  /* ------------------------------
   * 4.1) Recupero pending_user
   * ------------------------------ */
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (selErr || !pending) {
    console.error("Utente pending non trovato:", selErr);
    return { statusCode: 404, body: JSON.stringify({ error: "Pending user not found" }) };
  }

  /* ------------------------------------------------------
   * 4.2) Aggiorna approved + role (NON confirmed qui!)
   * ------------------------------------------------------ */
  const { error: updErr } = await supabase
    .from("pending_users")
    .update({ approved: true, role, confirmed: false })
    .eq("email", email);

  if (updErr) {
    console.error("Errore update pending_users:", updErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore aggiornamento pending_users" }) };
  }

  /* ---------------------------------------------------------
   * 4.3) Verifica se l'utente esiste già in Auth
   * --------------------------------------------------------- */
  let userExists = false;

  const list = await supabase.auth.admin.listUsers();
  const existing = list.data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (existing) {
    userExists = true;
    console.info("Utente già esistente in Auth:", email);
  }

  /* ---------------------------------------------------------
   * 4.4) Se NON esiste, crealo adesso in Auth (senza password)
   * --------------------------------------------------------- */
  if (!userExists) {
    const create = await supabase.auth.admin.createUser({
      email,
      email_confirm: false, // diventerà true dopo che clicca il link
      user_metadata: { role, username: pending.username || undefined },
    });

    if (create.error) {
      console.error("Errore createUser:", create.error);
      return { statusCode: 500, body: JSON.stringify({ error: "Errore creazione utente Auth" }) };
    }
  }

  /* ----------------------------------------------------------------
   * 4.5) Genera link migliore disponibile
   * ---------------------------------------------------------------- */
  const actionLink = await generateBestLink(email, !userExists);

  if (!actionLink) {
    console.error("Errore generateLink: null");
  }

  /* ---------------------------------------------
   * 4.6) Invia email all'utente
   * --------------------------------------------- */
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Accesso al portale Montecarlo 2013",
      html: `
        <p>Ciao ${pending.username || "utente"},</p>
        <p>il tuo account è stato <b>approvato</b> con ruolo <b>${role}</b>.</p>
        ${
          actionLink
            ? `
              <p>Per completare l'accesso e scegliere la tua password, clicca qui sotto:</p>
              <p>
                <a href="${actionLink}"
                   style="display:inline-block;padding:10px 20px;
                          background:#004aad;color:#fff;
                          text-decoration:none;border-radius:5px;">
                  Completa registrazione
                </a>
              </p>
            `
            : `
              <p>Non è stato possibile generare automaticamente il link di accesso.</p>
              <p>Puoi comunque entrare dal sito: <a href="https://montecarlo2013.it/login">https://montecarlo2013.it/login</a></p>
            `
        }
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
