// src/pages/UpdatePassword.tsx
// Data: 21/08/2025 - nuovo flusso OTP reset password con email precompilata

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function UpdatePassword(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  // se c’è state.email, la uso come default
  const emailFromState = (location.state as { email?: string })?.email || "";

  const [email, setEmail] = useState(emailFromState);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (emailFromState) {
      setEmail(emailFromState);
    }
  }, [emailFromState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !token || !password || !password2) {
      setError("Compila tutti i campi.");
      return;
    }
    if (password !== password2) {
      setError("Le password non coincidono.");
      return;
    }
    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }

    // 1. Verifica OTP
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });

    if (otpError) {
      setError("Codice non valido o scaduto.");
      return;
    }

    // 2. Aggiorna password
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError("Errore: " + updateError.message);
    } else {
      setSuccess("Password aggiornata con successo! Torno al login…");
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-8 rounded shadow"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Reset Password</h2>

        {error && <div className="mb-4 text-red-600">{error}</div>}
        {success && <div className="mb-4 text-green-600">{success}</div>}

        {/* Email */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            className="w-full border px-3 py-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly={!!emailFromState} // se arriva già dal login, non modificabile
          />
        </div>

        {/* OTP */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Codice OTP (6 cifre)</label>
          <input
            type="text"
            className="w-full border px-3 py-2 rounded"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Nuova password</label>
          <input
            type="password"
            className="w-full border px-3 py-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1 font-medium">Conferma password</label>
          <input
            type="password"
            className="w-full border px-3 py-2 rounded"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Salva nuova password
        </button>
      </form>
    </div>
  );
}
