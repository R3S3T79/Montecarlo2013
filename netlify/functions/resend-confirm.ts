// netlify/functions/resend-confirm.ts
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
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

  // Recupera il pending_user non ancora confermato
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("username, confirmation_token, expires_at")
    .eq("email", email)
    .eq("confirmed", false)
    .single();

  if (selErr || !pending) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Pending user not found or already confirmed" }),
    };
  }

  // (Opzionale) Estendi la scadenza di un giorno
  await supabase
    .from("pending_users")
    .update({ expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) })
    .eq("email", email);

  const confirmUrl = `https://montecarlo2013.it/api/confirm?token=${pending.confirmation_token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Reinvia link di conferma – Montecarlo 2013",
    html: `
      <p>Ciao ${pending.username},</p>
      <p>Ti invio di nuovo il link per confermare la tua registrazione:</p>
      <p><a href="${confirmUrl}">${confirmUrl}</a></p>
      <p>Il link scadrà tra 24 ore.</p>
    `,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
