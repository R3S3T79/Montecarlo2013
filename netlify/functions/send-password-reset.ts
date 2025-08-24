// netlify/functions/send-password-reset.ts
// Data: 21/08/2025 (rev: dual-SMTP fallback notifications → support)
// Scopo: genera e invia un link di "recovery" (reset password) per un'email esistente.

// ==============================
// 1) Import
// ==============================
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// ==============================
// 2) Supabase (service role)
// ==============================
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ==============================
// 3) Nodemailer (SMTP) - doppio transporter
// ==============================
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

// ==============================
// 4) Redirect dopo il reset
//    Priorità: SUPABASE_RECOVERY_REDIRECT_TO → APP_URL/SITE_URL + "/reset-password"
// ==============================
const RESET_PATH = "/reset-password";
const computedRedirect =
  process.env.SUPABASE_RECOVERY_REDIRECT_TO ||
  (process.env.APP_URL ? `${process.env.APP_URL}${RESET_PATH}` : undefined) ||
  (process.env.SITE_URL ? `${process.env.SITE_URL}${RESET_PATH}` : undefined);

// ==============================
// 5) Handler
// ==============================
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  // Permetto sia GET con query ?email=... sia POST con body { email }
  let email = event.queryStringParameters?.email || "";
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      if (body?.email) email = body.email;
    } catch {
      // body non JSON: ignora, gestiamo sotto se manca email
    }
  }

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing email" }) };
  }

  // 5.1 Genera link di recovery
  const gen = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: computedRedirect ? { redirectTo: computedRedirect } : (undefined as any),
  });

  const actionLink =
    (gen.data as any)?.action_link ||
    (gen.data as any)?.properties?.action_link;

  if (gen.error || !actionLink) {
    console.error("Errore generateLink (recovery):", gen.error, "Data:", gen.data);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore generazione link di reset password" }) };
  }

  // 5.2 Invia mail con link di reset password (fallback: notifications → support)
  const mailOptions = {
    to: email,
    subject: "Montecarlo 2013 — Reset password",
    html: `
      <p>Ciao,</p>
      <p>Per impostare (o reimpostare) la tua password, clicca qui:</p>
      <p>
        <a href="${actionLink}"
           style="display:inline-block;padding:10px 20px;
                  background:#004aad;color:#fff;
                  text-decoration:none;border-radius:5px;">
          Reimposta password
        </a>
      </p>
    `,
  };

  try {
    // Prova con notifications@
    await transporterNotifications.sendMail({
      ...mailOptions,
      from: process.env.SMTP_FROM_NOTIF,
    });
    console.log("Reset password inviato con notifications@");
  } catch (errNotif) {
    console.warn("Errore con notifications@, retry con support@ :", errNotif);
    try {
      await transporterSupport.sendMail({
        ...mailOptions,
        from: process.env.SMTP_FROM_SUPPORT,
      });
      console.log("Reset password inviato con support@");
    } catch (errSupport) {
      console.error("Errore invio mail reset (notif+support):", errSupport);
      return { statusCode: 500, body: JSON.stringify({ error: "Errore invio email di reset (notif+support)" }) };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
