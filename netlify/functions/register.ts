// src/functions/register.ts
// Data creazione: 20/08/2025 (rev: nuovo flusso approvazione → email solo admin)

import { Handler } from "@netlify/functions";
import { supabase } from "../lib/supabaseClient";
import crypto from "crypto";
import { sendEmail } from "./send-email"; // tua utility già presente

const handler: Handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: "Missing body" };
    }

    const { email, username, password } = JSON.parse(event.body);

    if (!email || !username) {
      return { statusCode: 400, body: "Email e username obbligatori" };
    }

    // 1. Genera token di conferma
    const confirmationToken = crypto.randomUUID();

    // 2. Inserisci in pending_users
    const { error: insertError } = await supabase
      .from("pending_users")
      .insert([
        {
          email,
          username,
          password: password || null,
          confirmation_token: confirmationToken,
          confirmed: false,
          approved: false,
          role: null,
        },
      ]);

    if (insertError) {
      console.error("Errore inserimento pending_users:", insertError);
      return { statusCode: 500, body: "Errore registrazione utente" };
    }

    // 3. Invia mail all'ADMIN (non all'utente)
    const adminEmail = "marcomiressi@gmail.com";
    const adminLink = `${process.env.SITE_URL}/admin`; // link pannello admin

    await sendEmail({
      to: adminEmail,
      subject: "Nuova registrazione in attesa di approvazione",
      html: `
        <p>Ciao Admin,</p>
        <p>Un nuovo utente si è registrato ed è in attesa di approvazione:</p>
        <ul>
          <li><b>Email:</b> ${email}</li>
          <li><b>Username:</b> ${username}</li>
        </ul>
        <p>Puoi approvare l'utente dal pannello admin:</p>
        <p><a href="${adminLink}" target="_blank">Vai al pannello</a></p>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Registrazione completata. L'amministratore valuterà la richiesta.",
      }),
    };
  } catch (err) {
    console.error("Errore generale register.ts:", err);
    return { statusCode: 500, body: "Errore interno server" };
  }
};

export { handler };
