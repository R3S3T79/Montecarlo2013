// netlify/functions/confirm.ts
// Data: 21/08/2025 (rev: dual-SMTP fallback notifications → support)
// Conferma registrazione: sposta utente da pending a auth.users con password

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =========================
// SMTP Transporters
// =========================
const transporterNotifications = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER_NOTIF,
    pass: process.env.SMTP_PASS_NOTIF,
  },
});

const transporterSupport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER_SUPPORT,
    pass: process.env.SMTP_PASS_SUPPORT,
  },
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const token = event.queryStringParameters?.token;
  console.log("Confirmation token:", token);
  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing confirmation token" }) };
  }

  // 1. cerca utente pending
  const { data: pending, error: selErr } = await supabase
    .from("pending_users")
    .select("email, username, role, password, confirmed")
    .eq("confirmation_token", token)
    .single();

  if (selErr || !pending) {
    return { statusCode: 404, body: JSON.stringify({ error: "Invalid or expired token" }) };
  }

  if (pending.confirmed) {
    return { statusCode: 400, body: JSON.stringify({ error: "User already confirmed" }) };
  }

  // 2. crea l'utente in Supabase Auth con password
  const { error: createErr } = await supabase.auth.admin.createUser({
    email: pending.email,
    password: pending.password, // <-- fondamentale
    email_confirm: true,
    user_metadata: {
      role: pending.role || "user",
      username: pending.username || pending.email,
    },
  });

  if (createErr) {
    console.error("Errore creazione utente in auth:", createErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore creazione utente in auth", details: createErr.message }),
    };
  }

  // 3. marca come confirmed in pending_users (via email)
  const { error: updatePendingError } = await supabase
    .from("pending_users")
    .update({ confirmed: true })
    .eq("email", pending.email);

  if (updatePendingError) {
    console.error("Errore aggiornamento pending_users in confirm:", updatePendingError);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore aggiornamento pending_users" }) };
  }

  // 4. notifica admin via email (con fallback)
  const mailOptions = {
    to: "marcomiressi@gmail.com", // 🔴 ADMIN
    subject: "Utente confermato",
    html: `
      <p>L'utente <b>${pending.username || pending.email}</b> (${pending.email}) ha completato la conferma della registrazione.</p>
      <p>Ruolo: <b>${pending.role || "user"}</b></p>
    `,
  };

  try {
    await transporterNotifications.sendMail({
      ...mailOptions,
      from: process.env.SMTP_FROM_NOTIF,
    });
    console.log("Email conferma inviata con notifications@");
  } catch (errNotif) {
    console.warn("Errore con notifications@, retry con support@ :", errNotif);
    try {
      await transporterSupport.sendMail({
        ...mailOptions,
        from: process.env.SMTP_FROM_SUPPORT,
      });
      console.log("Email conferma inviata con support@");
    } catch (errSupport) {
      console.error("Errore invio mail admin (notif+support):", errSupport);
      return { statusCode: 500, body: JSON.stringify({ error: "Errore invio mail admin (notif+support)" }) };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, message: "User confirmed and created in auth" }),
  };
};
