// netlify/functions/approve-user.ts
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const handler: Handler = async (event) => {
  console.log("=== Approve User Function Start ===");

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  // 🔐 Controllo token admin
  const authHeader = event.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { statusCode: 401, body: JSON.stringify({ error: "Missing or invalid authorization header" }) };
  }
  const token = authHeader.replace("Bearer ", "");

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);
  } catch (e: any) {
    console.error("JWT error:", e.message);
    return { statusCode: 401, body: JSON.stringify({ error: "Invalid token", details: e.message }) };
  }

  const userRole = decoded.app_metadata?.role || decoded.raw_app_meta_data?.role;
  console.log("Decoded role =", userRole);
  if (userRole !== "creator") {
    return { statusCode: 403, body: JSON.stringify({ error: "Access denied: Creators only" }) };
  }

  // 📩 Input body
  let body: { email?: string; role?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }
  const { email, role = "user" } = body;
  console.log("Approve request for email =", email, "role =", role);

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing email" }) };
  }

  // 🔎 Recupera pending_user
  const { data: pendingUser, error: selectError } = await supabase
    .from("pending_users")
    .select("username, password")
    .eq("email", email)
    .eq("confirmed", true)
    .single();

  if (selectError || !pendingUser) {
    console.error("Pending user error:", selectError);
    return { statusCode: 404, body: JSON.stringify({ error: "Pending user not found or not confirmed" }) };
  }
  console.log("Pending user trovato:", pendingUser);

  const { username, password } = pendingUser;
  if (!password) {
    console.error("ERRORE: password mancante per", email);
    return { statusCode: 500, body: JSON.stringify({ error: "Password mancante nel pending_users" }) };
  }

  // 👤 Creazione utente in Supabase Auth
  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { username, role },
    email_confirm: true,
  });

  if (createError) {
    console.error("Errore createUser:", createError.message);
    return { statusCode: 500, body: JSON.stringify({ error: "Error creating user", details: createError.message }) };
  }
  console.log("Utente creato in Auth:", createdUser);

  // 🔄 Aggiorna pending_users
  await supabase.from("pending_users").update({ password: null, role }).eq("email", email);

  // 📧 Email di benvenuto
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Benvenuto su Montecarlo 2013",
      html: `
        <p>Ciao ${username},</p>
        <p>La tua registrazione è stata approvata. Ora puoi accedere con email e password.</p>
        <p><a href="https://montecarlo2013.it/login">Accedi</a></p>
      `,
    });
    console.log("Email inviata a", email);
  } catch (e: any) {
    console.error("Errore invio email:", e.message);
  }

  console.log("=== Approve User Function END ===");

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
