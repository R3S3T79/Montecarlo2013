// netlify/functions/approve-user.ts
// Data: 21/08/2025 – Approvazione da Admin: crea l’utente in Auth, setta role+approved,
// e invia link di verifica email (signup) all'utente

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

  // 3) Crea l'utente in Auth solo se non esiste già
let authUser;
const { data: existingUser, error: fetchError } = await supabase.auth.admin.getUserByEmail(email);

if (fetchError) {
  console.error("Errore ricerca utente:", fetchError);
}

if (existingUser?.user) {
  console.log("Utente già esistente in Auth:", email);
  authUser = existingUser.user;
} else {
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

  authUser = create.data.user;
}

// 4) Genera link di verifica SOLO se l’utente è nuovo
let actionLink: string | null = null;
if (!existingUser?.user) {
  const gen = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
  });

  if (gen.error || !gen.data?.action_link) {
    console.error("Errore generateLink:", gen.error);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore generazione link conferma" }) };
  }

  actionLink = gen.data.action_link;
}

// 5) Invia mail di benvenuto
await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: email,
  subject: "Benvenuto in Montecarlo2013",
  html: `
    <p>Ciao ${pending.username || "utente"},</p>
    <p>Il tuo account è stato approvato con ruolo: <b>${role}</b>.</p>
    ${
      actionLink
        ? `<p>Per completare la registrazione, clicca qui: <a href="${actionLink}">Conferma account</a></p>`
        : `<p>Puoi accedere subito alla tua area: <a href="https://montecarlo2013.it/">Login</a></p>`
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
