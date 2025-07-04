// src/pages/auth/Register.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import bcrypt from "bcryptjs";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<"user"|"admin"|"creator">("user");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      // 1) Hash della password
      const password_hash = await bcrypt.hash(password, 10);

      // 2) Creo il pending_user via RPC
      const { data: pendingId, error: rpcError } = await supabase
        .rpc("create_pending_user", {
          p_email:          email,
          p_password_hash:  password_hash,
          p_requested_role: role,
        });

      if (rpcError) throw rpcError;

      // 3) Recupero il confirmation_token
      const { data: pending, error: fetchError } = await supabase
        .from("pending_users")
        .select("confirmation_token")
        .eq("id", pendingId as string)
        .single();

      if (fetchError) throw fetchError;
      const token = pending!.confirmation_token;

      // 4) Invio mail di conferma via Function (es. Netlify/AWS Lambda)
      await fetch("/.netlify/functions/send-confirm-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          confirm_link: `https://tuo-dominio/confirm?token=${token}`,
        }),
      });

      // 5) Mostro messaggio all’utente
      setInfoMsg(
        "Registrazione inviata! Controlla la tua email per confermare il link."
      );
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-8 rounded shadow"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          Registrati
        </h2>
        {errorMsg && (
          <div className="mb-4 text-red-600 text-sm">{errorMsg}</div>
        )}
        {infoMsg && (
          <div className="mb-4 text-green-600 text-sm">{infoMsg}</div>
        )}

        <div className="mb-4">
          <label className="block mb-1 font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1 font-medium" htmlFor="role">
            Ruolo richiesto
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "user"|"admin"|"creator")
            }
            className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="creator">Creator</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Caricamento..." : "Registrati"}
        </button>

        <p className="mt-4 text-center text-sm">
          Hai già un account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Accedi
          </Link>
        </p>
      </form>
    </div>
  );
}
