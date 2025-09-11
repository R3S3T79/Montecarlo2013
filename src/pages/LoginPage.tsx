// src/pages/Login.tsx
// Data: 21/08/2025 (rev: scritta Montecarlo 2013 bianca con ombra sopra container)

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  // === Login ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        navigate("/");
      } else {
        setErrorMsg("Login riuscito, ma sessione non trovata");
      }
    }

    setLoading(false);
  };

  // === Reset password ===
  const handlePasswordReset = async () => {
    setErrorMsg(null);
    setResetMsg(null);

    if (!email) {
      setErrorMsg("Inserisci prima l'email per reimpostare la password");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/update-password`,
        }
      );

      if (error) throw error;

      setResetMsg("Email di reset inviata! Controlla la tua casella di posta.");
      navigate("/update-password", { state: { email } });
    } catch (err: any) {
      console.error("Errore reset password:", err);
      setErrorMsg("Errore durante l'invio dell'email di reset");
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4"
      style={{
        backgroundImage: `url("/src/assets/sfondo.jpg")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Scritta sopra */}
      <h1
        className="text-3xl font-bold text-white mb-6"
        style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.7)" }}
      >
        Montecarlo 2013
      </h1>

      {/* Box login */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-8 rounded shadow"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.9)",
        }}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Accedi</h2>

        {errorMsg && <div className="mb-4 text-red-600 text-sm">{errorMsg}</div>}
        {resetMsg && (
          <div className="mb-4 text-green-600 text-sm">{resetMsg}</div>
        )}

        {/* Email */}
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

        {/* Password */}
        <div className="mb-6">
          <label className="block mb-1 font-medium" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring pr-20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 px-2 py-1"
            >
              {showPassword ? "Nascondi" : "Mostra"}
            </button>
          </div>
        </div>

        {/* Pulsante login */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Caricamento..." : "Login"}
        </button>

        {/* Reset password */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={handlePasswordReset}
            className="text-sm text-blue-600 hover:underline"
          >
            Password dimenticata?
          </button>
        </div>

        {/* Registrazione */}
        <p className="mt-4 text-center text-sm">
          Non hai un account?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Registrati
          </Link>
        </p>
      </form>
    </div>
  );
}
