// netlify/functions/create-user.ts

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // serve la service key qui
);

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { email, password, username, role } = JSON.parse(event.body || "{}");

    if (!email || !password || !username || !role) {
      return { statusCode: 400, body: "Missing fields" };
    }

        const { data: existingUsername, error: usernameCheckError } = await supabase
      .from("pending_users")
      .select("id")
      .ilike("username", username.trim())
      .limit(1);

    if (usernameCheckError) {
      console.error("Username check error:", usernameCheckError);
      return { statusCode: 500, body: "Errore controllo username" };
    }

    if (existingUsername && existingUsername.length > 0) {
      return {
        statusCode: 409,
        body: "Username già utilizzato. Scegline un altro."
      };
    }

    // 1. Crea l’utente in auth.users
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role },
      app_metadata: { role }
    });

    if (createError || !newUser.user) {
      console.error("Auth createUser error:", createError);
      return { statusCode: 500, body: "Errore creazione utente" };
    }

    // 2. Inserisci in pending_users
    const token = uuidv4();

    const { error: insertError } = await supabase.from("pending_users").insert({
      id: newUser.user.id,
      email,
      username,
      role,
      confirmed: true,      // già confermato
      approved: true,       // già approvato
      confirmation_token: token
    });

    if (insertError) {
      console.error("Insert pending_users error:", insertError);
      return { statusCode: 500, body: "Errore inserimento pending_users" };
    }

        const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        must_change_password: true
      })
      .eq("user_id", newUser.user.id);

    if (profileError) {
      console.error("Set must_change_password error:", profileError);
      return { statusCode: 500, body: "Errore impostazione cambio password" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Utente creato correttamente", email })
    };
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return { statusCode: 500, body: "Errore interno server" };
  }
};

export { handler };
