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
  // 1) Prendo il token dalla query string
  const token = event.queryStringParameters?.token;
  if (!token) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: `
        <html>
          <head><title>Errore conferma</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:2rem;">
            <h1>Token mancante</h1>
            <p>Il link di conferma non è valido.</p>
          </body>
        </html>
      `,
    };
  }

  // 2) Trovo il pending_user
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("email, username, created_at, expires_at")
    .eq("confirmation_token", token)
    .single();

  if (selErr || !pending) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html" },
      body: `
        <html>
          <head><title>Link non valido</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:2rem;">
            <h1>Link non valido o già utilizzato</h1>
            <p>Il link di conferma non esiste o è già stato usato.</p>
          </body>
        </html>
      `,
    };
  }

  // 3) Controllo scadenza
  if (new Date(pending.expires_at) < new Date()) {
    return {
      statusCode: 410,
      headers: { "Content-Type": "text/html" },
      body: `
        <html>
          <head><title>Link scaduto</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:2rem;">
            <h1>Link scaduto</h1>
            <p>Il link di conferma è scaduto. Registrati di nuovo.</p>
          </body>
        </html>
      `,
    };
  }

  // 4) Marco come confermato
  await supabase
    .from("pending_users")
    .update({ confirmed: true, confirmation_token: null })
    .eq("confirmation_token", token);

  // 5) Notifica via email all'admin
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: "marcomiressi@gmail.com",
    subject: "Nuova registrazione in attesa di approvazione",
    html: `
      <p>Ciao Admin,</p>
      <p>Un nuovo utente ha confermato la propria email e attende la tua approvazione.</p>
      <ul>
        <li><strong>Username:</strong> ${pending.username}</li>
        <li><strong>Email:</strong> ${pending.email}</li>
        <li><strong>Registrato il:</strong> ${new Date(pending.created_at).toLocaleString('it-IT')}</li>
      </ul>
      <p>Vai al <a href="https://montecarlo2013.it/#/admin-panel">Pannello Admin</a> per approvarlo.</p>
    `,
  });

  // 6) Risposta HTML carina
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email Confermata</title>
          <style>
            body { font-family: sans-serif; text-align: center; background: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 400px; margin: 5rem auto; background: white; padding: 2rem; border-radius: 8px; }
            h1 { color: #2a9d8f; }
            a { display: inline-block; margin-top: 1.5rem; text-decoration: none; color: white; background: #264653; padding: 0.75rem 1.5rem; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Email Confermata!</h1>
            <p>Grazie, la tua email è stata confermata con successo.</p>
            <p>Attendi l'approvazione dell'amministratore.</p>
            <a href="https://montecarlo2013.it/#/login">Vai al Login</a>
          </div>
        </body>
      </html>
    `,
  };
};
