// netlify/functions/sync-pending-confirm.ts
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const { email } = JSON.parse(event.body || "{}");

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing email" }) };
    }

    const { error } = await supabase
      .from("pending_users")
      .update({ confirmed: true })
      .eq("email", email);

    if (error) {
      console.error("Errore update pending_users:", error);
      return { statusCode: 500, body: JSON.stringify({ error: "Errore aggiornamento" }) };
    }

    console.log("✅ pending_users confermato per:", email);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err: any) {
    console.error("Errore sync-pending-confirm:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore interno" }) };
  }
};
