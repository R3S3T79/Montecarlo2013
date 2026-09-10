// netlify/functions/set-temporary-password.ts
// Imposta una password provvisoria dal Pannello Amministratore
// Permessi: solo creator / admin

import type { Handler } from "@netlify/functions";
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
  // Stesso sistema del reset password
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

// =====================================
// CONTROLLO RUOLO DA USER_PROFILES
// =====================================

const requesterId =
  requester.sub;

if (!requesterId) {
  return {
    statusCode: 401,
    body: JSON.stringify({
      error: "Utente non identificato",
    }),
  };
}

const {
  data: requesterProfile,
  error: profileError,
} = await supabase
  .from("user_profiles")
  .select("role")
  .eq("user_id", requesterId)
  .maybeSingle();

if (profileError) {
  console.error(
    "Errore lettura ruolo:",
    profileError
  );

  return {
    statusCode: 500,
    body: JSON.stringify({
      error:
        "Errore durante il controllo del ruolo",
    }),
  };
}

const requesterRole = String(
  requesterProfile?.role || ""
).toLowerCase();

if (
  requesterRole !== "creator" &&
  requesterRole !== "admin"
) {
  return {
    statusCode: 403,
    body: JSON.stringify({
      error: "Access denied",
    }),
  };
}

  // =====================================
  // DATI RICHIESTA
  // =====================================

  let body: {
    email?: string;
    password?: string;
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

  const temporaryPassword =
    body.password || "";

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Email obbligatoria",
      }),
    };
  }

  if (temporaryPassword.length < 8) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error:
          "La password provvisoria deve contenere almeno 8 caratteri",
      }),
    };
  }

  // =====================================
  // CERCA UTENTE AUTH
  // CON PAGINAZIONE
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
        "Errore ricerca utenti Auth:",
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

    if (
      targetUser ||
      users.length < perPage
    ) {
      break;
    }

    page++;
  }

  if (!targetUser) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        error: "Utente Auth non trovato",
      }),
    };
  }

  // =====================================
  // IMPOSTA PASSWORD PROVVISORIA
  // =====================================

  const {
    data: updatedUser,
    error: updateError,
  } = await supabase.auth.admin.updateUserById(
    targetUser.id,
    {
      password: temporaryPassword,
    }
  );

  if (updateError) {
    console.error(
      "Errore aggiornamento password:",
      updateError
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Errore durante l'impostazione della password provvisoria",
      }),
    };
  }

  

  // =====================================
  // EMAIL DI AVVISO
  // NON contiene la password
  // =====================================

  const loginUrl =
  "https://www.montecarlo2013.it/login";

  const mailOptions = {
    to: email,

    subject:
      "Montecarlo 2013 — Password provvisoria impostata",

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 500px;
        margin: auto;
      ">

        <h2>Montecarlo 2013</h2>

        <p>
          È stata impostata una
          <strong>password provvisoria</strong>
          per il tuo account Montecarlo 2013.
        </p>

        <div style="
          padding: 16px;
          margin: 20px 0;
          background: #f3f4f6;
          border-radius: 8px;
        ">
          <strong>
            Per motivi di sicurezza la password
            non viene comunicata tramite email.
          </strong>
        </div>

        <p>
          Contatta il
          <strong>Creator dell'app</strong>
          per conoscere la tua password provvisoria.
        </p>

        <p>
  Quando hai ricevuto la password provvisoria,
  premi il pulsante qui sotto per accedere:
</p>

<div style="
  text-align: center;
  margin: 25px 0;
">
  <a
    href="${loginUrl}"
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
    Accedi a Montecarlo 2013
  </a>
</div>

<p style="
  font-size: 13px;
  color: #666;
">
  Se il pulsante non funziona, apri questo indirizzo:<br>
  <a href="${loginUrl}">
    ${loginUrl}
  </a>
</p>

        <p style="
          margin-top: 30px;
          font-size: 13px;
          color: #666;
        ">
          Montecarlo 2013
        </p>

      </div>
    `,
  };

  let emailSent = true;

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
      `Avviso password provvisoria inviato a ${email} tramite notifications@`
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
        `Avviso password provvisoria inviato a ${email} tramite support@`
      );
    } catch (errSupport) {
      emailSent = false;

      console.error(
        "Password modificata, ma errore invio email:",
        errSupport
      );
    }
  }

  // =====================================
  // RISPOSTA
  // =====================================

  return {
    statusCode: 200,

    body: JSON.stringify({
      success: true,
      emailSent,
      email:
        updatedUser.user?.email || email,

      message: emailSent
        ? "Password provvisoria impostata e email di avviso inviata"
        : "Password provvisoria impostata, ma email di avviso non inviata",
    }),
  };
};