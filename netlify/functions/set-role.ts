// netlify/functions/set-role.ts

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role, non anon key
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, role } = JSON.parse(event.body || "{}");

    if (!email || !role) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing email or role" }) };
    }

    // 1. Recupera user da auth.users
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = users?.users.find((u) => u.email === email);
    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: "User not found in auth" }) };
    }

    // 2. Aggiorna ruolo in auth.users (metadata + ruolo principale)
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, role },
      role, // campo principale
    });

    if (updateError) throw updateError;

    // 3. Aggiorna tabella pending_users (per allineare)
    const { error: dbError } = await supabase
      .from("pending_users")
      .update({ role })
      .eq("email", email);

    if (dbError) throw dbError;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Role updated to ${role} for ${email}` }),
    };
  } catch (err: any) {
    console.error("set-role error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
};
