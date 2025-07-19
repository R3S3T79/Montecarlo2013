// netlify/functions/confirm.ts
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
  // 1) Solo GET
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "text/html" },
      body: `<h1>405 Method Not Allowed</h1>`,
    };
  }

  // 2) Leggi token
  const token = event.queryStringParameters?.token;
  if (!token) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: `<h1>Token mancante</h1><p>Link non valido.</p>`,
    };
  }

  // 3) Recupera pending_user
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("email, username, created_at, expires_at, confirmed")
    .eq("confirmation_token", token)
    .single();

  if (selErr || !pending) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html" },
      body: `<h1>Link non valido o già utilizzato</h1>`,
    };
  }

  // 4) Se già confermato, mostra pagina “già confermato”
  if (pending.confirmed) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `
        <html><head><meta charset="utf-8"><title>Già confermato</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:2rem">
          <h1 style="color:#2a9d8f">Email già confermata!</h1>
          <p>Hai già completato la conferma.</p>
          <a href="https://montecarlo2013.it/#/login"
             style="display:inline-block;margin-top:1rem;
                    padding:0.75rem 1.5rem;background:#264653;
                    color:#fff;text-decoration:none;border-radius:4px">
            Vai al Login
          </a>
        </body></html>
      `,
    };
  }

  // 5) Controlla scadenza
  if (new Date(pending.expires_at) < new Date()) {
    return {
      statusCode: 410,
      headers: { "Content-Type": "text/html" },
      body: `<h1>Link scaduto</h1><p>Registrati di nuovo.</p>`,
    };
  }

  // 6) Marca come confermato
  const { error: upErr } = await supabase
    .from("pending_users")
    .update({ confirmed: true })
    .eq("confirmation_token", token);

  if (upErr) {
    console.error("Errore UPDATE confirmed:", upErr);
  }

  // 7) Notifica admin
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: "marcomiressi@gmail.com",
    subject: "Nuova registrazione in attesa di approvazione",
    html: `
      <p>Ciao Admin,</p>
      <p>L'utente <strong>${pending.username}</strong> 
      (<a href="mailto:${pending.email}">${pending.email}</a>) 
      ha confermato l'email.</p>
      <p>Vai al <a href="https://montecarlo2013.it/#/admin-panel">Pannello Admin</a>.</p>
    `,
  });

  // 8) Mostra pagina di conferma
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `
      <html>
        <head><meta charset="utf-8"><title>Email Confermata</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:2rem">
          <h1 style="color:#2a9d8f">Email Confermata!</h1>
          <p>Grazie, la tua email è stata confermata.</p>
          <p>Attendi l'approvazione dell'amministratore.</p>
          <a href="https://montecarlo2013.it/#/login"
             style="display:inline-block;margin-top:1rem;
                    padding:0.75rem 1.5rem;background:#264653;
                    color:#fff;text-decoration:none;border-radius:4px">
            Vai al Login
          </a>
        </body>
      </html>
    `,
  };
};
