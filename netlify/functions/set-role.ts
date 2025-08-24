// netlify/functions/set-role.ts
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVICE ROLE
);

type Role = "user" | "creator" | "admin";
const ALLOWED: Role[] = ["user", "creator", "admin"];

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, role } = JSON.parse(event.body || "{}") as {
      email?: string;
      role?: string;
    };

    if (!email || !role) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing email or role" }) };
    }

    const roleNorm = role.toLowerCase() as Role;
    if (!ALLOWED.includes(roleNorm)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid role value" }) };
    }

    // 1) Trova l'utente Auth per email (scorri pagine se necessario)
    let foundUser: any = null;
    let page = 1;
    const perPage = 1000; // alza se hai molti utenti
    while (!foundUser) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      foundUser = data.users.find((u) => u.email === email);
      if (data.users.length < perPage) break; // fine utenti
      page += 1;
    }
    if (!foundUser) {
      return { statusCode: 404, body: JSON.stringify({ error: "User not found in auth" }) };
    }

    const userId = foundUser.id;

    // 2) Aggiorna ruolo in auth (user_metadata; valuta app_metadata se preferisci claim non modificabili)
    {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { ...foundUser.user_metadata, role: roleNorm },
      });
      if (error) throw error;
    }

    // 3) Aggiorna pending_users (se esiste riga per email). Se fallisce (RLS), non blocco.
    {
      const { data: pendRow, error: pendCheckErr } = await supabase
        .from("pending_users")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      if (!pendCheckErr && pendRow?.email) {
        const { error: pendErr } = await supabase
          .from("pending_users")
          .update({ role: roleNorm })
          .eq("email", email);
        if (pendErr) {
          // Non blocco: pending è “di servizio”
          console.warn("[set-role] pending_users update skipped:", pendErr.message);
        }
      }
    }

    // 4) Aggiorna/crea in user_profiles (FONTE di verità per le policy)
    {
      const { error: upErr } = await supabase
        .from("user_profiles")
        .upsert(
          {
            user_id: userId,
            role: roleNorm, // enum user_role in user_profiles
            email,          // utile tenerla allineata
          },
          { onConflict: "user_id" }
        );
      if (upErr) throw upErr;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Role updated to ${roleNorm} for ${email}` }),
    };
  } catch (err: any) {
    console.error("set-role error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || "Server error" }),
    };
  }
};
