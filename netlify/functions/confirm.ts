// netlify/functions/confirm.ts
// Data: 18/08/2025 – Alla conferma: crea l’utente in auth.users e completa la registrazione.

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: { "Content-Type": "text/html" }, body: `<h1>405</h1>` };
  }

  const token = event.queryStringParameters?.token;
  if (!token) {
    return { statusCode: 400, headers: { "Content-Type": "text/html" }, body: `<h1>Token mancante</h1>` };
  }

  // prendo pending_user con approved=true
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("email, username, password, role, approved, confirmed, expires_at")
    .eq("confirmation_token", token)
    .single();

  if (selErr || !pending) {
    return { statusCode: 404, headers: { "Content-Type": "text/html" }, body: `<h1>Link non valido</h1>` };
  }

  if (!pending.approved) {
    return { statusCode: 403, headers: { "Content-Type": "text/html" }, body: `<h1>Registrazione non ancora approvata</h1>` };
  }

  if (pending.confirmed) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `
        <h1>Email già confermata</h1>
        <a href="https://montecarlo2013.it/#/login">Vai al Login</a>
      `,
    };
  }

  if (new Date(pending.expires_at) < new Date()) {
    return { statusCode: 410, headers: { "Content-Type": "text/html" }, body: `<h1>Link scaduto</h1>` };
  }

  if (!pending.password) {
    return { statusCode: 500, headers: { "Content-Type": "text/html" }, body: `<h1>Errore: password mancante</h1>` };
  }

  // CREA UTENTE IN AUTH ORA
  const { error: createErr } = await supabase.auth.admin.createUser({
    email: pending.email,
    password: pending.password,
    user_metadata: {
      username: pending.username,
      role: pending.role || "user",
    },
    email_confirm: true, // confermiamo noi
  });

  if (createErr) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html" },
      body: `<h1>Errore creazione account</h1><p>${createErr.message}</p>`,
    };
  }

  // marca confirmed=true e pulisce la password
  await supabase
    .from("pending_users")
    .update({ confirmed: true, password: null })
    .eq("confirmation_token", token);

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `
      <h1>Email confermata!</h1>
      <p>Ora puoi accedere con le tue credenziali.</p>
      <a href="https://montecarlo2013.it/#/login">Vai al Login</a>
    `,
  };
};
