// netlify/functions/confirm.ts

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  // 1) Metodo
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // 2) Token
  const token = event.queryStringParameters?.token;
  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Token mancante o non valido" }),
    };
  }

  try {
    // 3) Cerco il pending_user
    const { data, error: fetchError } = await supabase
      .from("pending_users")
      .select("id, confirmed, expires_at")
      .eq("confirmation_token", token)
      .single();

    if (fetchError || !data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Token non valido o già confermato" }),
      };
    }

    // 4) Se già confermato
    if (data.confirmed) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Utente già confermato" }),
      };
    }

    // 5) Controllo scadenza
    if (new Date() > new Date(data.expires_at)) {
      return {
        statusCode: 410,
        body: JSON.stringify({ error: "Link scaduto" }),
      };
    }

    // 6) Aggiorno la conferma
    const { error: updateError } = await supabase
      .from("pending_users")
      .update({ confirmed: true })
      .eq("id", data.id);

    if (updateError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Errore durante la conferma" }),
      };
    }

    // 7) Redirect al welcome
    return {
      statusCode: 302,
      headers: { Location: "/welcome" },
      body: "",
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore interno", details: err.message }),
    };
  }
};
