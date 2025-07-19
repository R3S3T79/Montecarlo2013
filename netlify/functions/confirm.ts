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
  port: parseInt(process.env.SMTP_PORT!),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const { email } = JSON.parse(event.body || "{}");
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing email" }) };
  }

  // Trovo il user in pending_users
  const { data: pending, error } = await supabase
    .from("pending_users")
    .select("username, confirmation_token")
    .eq("email", email)
    .single();

  if (error || !pending) {
    return { statusCode: 404, body: JSON.stringify({ error: "User not found" }) };
  }

  const confirmUrl = `https://montecarlo2013.it/api/confirm?token=${pending.confirmation_token}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Reinvia link di conferma – Montecarlo 2013",
    html: `
      <p>Ciao ${pending.username},</p>
      <p>Hai richiesto di reinviare il link di conferma:</p>
      <p><a href="${confirmUrl}">${confirmUrl}</a></p>
      <p>Il link scade in 24 ore dalla registrazione.</p>
    `,
  });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
