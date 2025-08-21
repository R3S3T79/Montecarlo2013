// netlify/functions/approve-user.ts
// Scopo: Admin approva → aggiorna pending_users, crea utente in Auth, invia mail all’utente

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

async function generateLink(email: string, password?: string): Promise<string | null> {
  // Prova signup/invite/magiclink/recovery
  const tries = [
    { type: "signup" as const, withPassword: true },
    { type: "invite" as const, withPassword: false },
    { type: "magiclink" as const, withPassword: false },
    { type: "recovery" as const, withPassword: false },
  ];

  for (const t of tries) {
    const res = await supabase.auth.admin.generateLink({
      // @ts-expect-error type literal
      type: t.type,
      email,
      ...(t.withPassword && password ? { password } : {}),
    });
    if (res.data?.action_link) return res.data.action_link;
  }
  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body: { email?: string; role?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { email, role } = body;
  if (!email || !role) {
    return { statusCode: 400, body: "Email e ruolo obbligatori" };
  }

  // Prende pending_user
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (selErr || !pending) {
    return { statusCode: 404, body: "Pending user non trovato" };
  }

  // Aggiorna approved + role
  const { error: updErr } = await supabase
    .from("pending_users")
    .update({ approved: true, role })
    .eq("email", email);

  if (updErr) {
    console.error("Errore update pending_users:", updErr);
    return { statusCode: 500, body: "Errore update pending_users" };
  }

  // Controlla se esiste già in Auth
  const list = await supabase.auth.admin.listUsers();
  const exists = list.data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!exists) {
    const create = await supabase.auth.admin.createUser({
      email,
      password: pending.password || undefined,
      email_confirm: false,
      user_metadata: { role, username: pending.username || "" },
    });
    if (create.error) {
      console.error("Errore createUser:", create.error);
      return { statusCode: 500, body: "Errore creazione utente Auth" };
    }
  }

  // Genera link
  const actionLink = await generateLink(email, pending.password || undefined);

  // Invia mail all’utente
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Il tuo account Montecarlo 2013 è stato approvato",
      html: `
        <p>Ciao ${pending.username || "utente"},</p>
        <p>Il tuo account è stato approvato con ruolo <b>${role}</b>.</p>
        ${
          actionLink
            ? `<p><a href="${actionLink}" 
                     style="display:inline-block;padding:10px 20px;
                            background:#004aad;color:#fff;
                            text-decoration:none;border-radius:5px;">
                   Procedi all'accesso
                 </a></p>`
            : `<p>Puoi accedere manualmente da <a href="https://montecarlo2013.it/login">Login</a></p>`
        }
      `,
    });
  } catch (mailErr) {
    console.error("Errore invio mail utente:", mailErr);
    return { statusCode: 500, body: "Errore invio email utente" };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
