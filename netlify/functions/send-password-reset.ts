// netlify/functions/send-password-reset.ts
// Reset password utente dal Pannello Amministratore
// Invio OTP recovery a 6 cifre
// Permessi: solo creator / admin

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

// =======================================
// SUPABASE - SERVICE ROLE
// =======================================

const supabase = createClient(
  process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =======================================
// SMTP
// =======================================

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

// =======================================
// HANDLER
// =======================================

export const handler: Handler = async (event) => {
  // =====================================
  // SOLO POST
  // =====================================

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Method Not Allowed",
      }),
    };
  }

  // =====================================
  // AUTENTICAZIONE ADMIN
  // =====================================

  const authHeader =
    event.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        error:
          "Missing or invalid authorization header",
      }),
    };
  }

  let requester: any;

  try {
    requester = jwt.verify(
      authHeader.slice(7),
      process.env.SUPABASE_JWT_SECRET!
    );
  } catch (error: any) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: "Invalid token",
        details: error.message,
      }),
    };
  }

  // =====================================
  // CONTROLLO RUOLO
  // =====================================

  const requesterRole =
    requester.app_metadata?.role ||
    requester.raw_app_meta_data?.role ||
    requester.user_metadata?.role;

  if (
    !["creator", "admin"].includes(
      requesterRole
    )
  ) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: "Access denied",
      }),
    };
  }

  // =====================================
  // LETTURA EMAIL
  // =====================================

  let body: {
    email?: string;
  };

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid JSON",
      }),
    };
  }

  const email =
    body.email?.trim().toLowerCase();

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing email",
      }),
    };
  }

  // =====================================
  // VERIFICA ESISTENZA UTENTE
  // =====================================

    let targetUser: any = null;
  let page = 1;
  const perPage = 100;

  while (!targetUser) {
    const {
      data: authData,
      error: listError,
    } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (listError) {
      console.error(
        "Errore ricerca utente:",
        listError
      );

      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            "Errore durante la ricerca dell'utente",
        }),
      };
    }

    const users = authData?.users || [];

    targetUser = users.find(
      (user) =>
        user.email?.trim().toLowerCase() === email
    );

    if (targetUser || users.length < perPage) {
      break;
    }

    page++;
  }

  if (!targetUser) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        error: "Utente non trovato",
      }),
    };
  }

  // =====================================
  // GENERA RECOVERY OTP
  // =====================================

  const {
    data: recoveryData,
    error: recoveryError,
  } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (recoveryError) {
    console.error(
      "Errore generazione recovery:",
      recoveryError
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Errore generazione codice di recupero",
        details: recoveryError.message,
      }),
    };
  }

  // Supabase restituisce l'OTP generato
  // nelle properties della risposta.

  const properties =
    (recoveryData as any)?.properties;

  const otp =
    properties?.email_otp ||
    (recoveryData as any)?.email_otp;

  if (!otp) {
    console.error(
      "OTP non presente nella risposta Supabase:",
      recoveryData
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Supabase non ha restituito il codice OTP",
      }),
    };
  }

  // =====================================
  // EMAIL
  // =====================================

    const resetPageUrl =
    "https://www.montecarlo2013.it/update-password";

  const mailOptions = {
    to: email,

    subject:
      "Montecarlo 2013 — Codice reset password",

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 500px;
        margin: auto;
      ">

        <h2>
          Montecarlo 2013
        </h2>

        <p>
          È stato richiesto il reset della password
          del tuo account.
        </p>

        <p>
          Utilizza questo codice:
        </p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          text-align: center;
          padding: 20px;
          margin: 20px 0;
          background: #f3f4f6;
          border-radius: 8px;
        ">
          ${otp}
        </div>

                <p>
          Premi il pulsante qui sotto per aprire la pagina
          di reimpostazione della password:
        </p>

        <div style="
          text-align: center;
          margin: 25px 0;
        ">
          <a
            href="${resetPageUrl}"
            style="
              display: inline-block;
              background: #dc2626;
              color: #ffffff;
              text-decoration: none;
              font-weight: bold;
              padding: 14px 24px;
              border-radius: 8px;
            "
          >
            Reimposta password
          </a>
        </div>

        <p>
          Nella pagina inserisci:
        </p>

        <p>
          <strong>1.</strong> Il tuo indirizzo email<br>
          <strong>2.</strong> Il codice OTP riportato sopra<br>
          <strong>3.</strong> La nuova password
        </p>

        <p style="
          font-size: 13px;
          color: #666;
        ">
          Se il pulsante non funziona, apri questo indirizzo:<br>
          <a href="${resetPageUrl}">
            ${resetPageUrl}
          </a>
        </p>

        <p style="
          margin-top: 30px;
          font-size: 13px;
          color: #666;
        ">
          Se non hai richiesto tu il reset,
          contatta un amministratore.
        </p>

      </div>
    `,
  };

  // =====================================
  // INVIO EMAIL
  // notifications@ → fallback support@
  // =====================================

  try {
    await transporterNotifications.sendMail({
      ...mailOptions,
      from: process.env.SMTP_FROM_NOTIF,
    });

    console.log(
      `OTP reset password inviato a ${email} tramite notifications@`
    );
  } catch (errNotif) {
    console.warn(
      "Errore notifications@, provo support@:",
      errNotif
    );

    try {
      await transporterSupport.sendMail({
        ...mailOptions,
        from: process.env.SMTP_FROM_SUPPORT,
      });

      console.log(
        `OTP reset password inviato a ${email} tramite support@`
      );
    } catch (errSupport) {
      console.error(
        "Errore invio OTP reset password:",
        errSupport
      );

      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            "Errore invio email di reset password",
        }),
      };
    }
  }

  // =====================================
  // OK
  // =====================================

  return {
    statusCode: 200,

    body: JSON.stringify({
      success: true,
      message:
        "Codice OTP di reset password inviato",
    }),
  };
};