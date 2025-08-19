// netlify/functions/create-user.ts
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // serve la service role key
);

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, password, username, role } = JSON.parse(event.body || "{}");

    if (!email || !password || !username || !role) {
      return { statusCode: 400, body: "Missing required fields" };
    }

    // 1. Crea l'utente in auth.users
    const { data: userData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, role },
        app_metadata: { role },
      });

    if (createError || !userData.user) {
      console.error("Errore creazione utente:", createError);
      return { statusCode: 400, body: "Errore creazione utente auth" };
    }

    const newUser = userData.user;

    // 2. Inserisce anche in pending_users (conferma immediata)
    const { error: insertError } = await supabase
      .from("pending_users")
      .insert({
        id: newUser.id,         // stesso id di auth.users
        email,
        username,
        role,
        confirmed: true,        // perché è già attivo
      });

    if (insertError) {
      console.error("Errore inserimento in pending_users:", insertError);
      return {
        statusCode: 500,
        body: "Utente creato in auth, ma errore in pending_users",
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Utente creato con successo" }),
    };
  } catch (err: any) {
    console.error("Errore generale:", err);
    return { statusCode: 500, body: "Errore server interno" };
  }
};

export { handler };
