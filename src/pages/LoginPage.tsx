// src/pages/Login.tsx
// Login - grafica Montecarlo 2013

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // =========================
  // LOGIN
  // =========================
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
  const { data: profile, error: profileError } =
    await supabase
      .from("user_profiles")
      .select("must_change_password")
      .eq("user_id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error(
      "Errore controllo cambio password:",
      profileError
    );

    setErrorMsg(
      "Errore durante il controllo del profilo utente"
    );
  } else if (profile?.must_change_password) {
    navigate("/change-password");
  } else {
    navigate("/");
  }
} else {
  setErrorMsg("Login riuscito, ma sessione non trovata");
}
    }

    setLoading(false);
  };

  // =========================
  // RESET PASSWORD
  // =========================
  const handlePasswordReset = async () => {
    setErrorMsg(null);
    setResetMsg(null);

    if (!email) {
      setErrorMsg(
        "Inserisci prima l'email per reimpostare la password"
      );
      return;
    }

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo: `${window.location.origin}/update-password`,
          }
        );

      if (error) {
        throw error;
      }

      setResetMsg(
        "Email di reset inviata! Controlla la tua casella di posta."
      );

      navigate("/update-password", {
        state: { email },
      });
    } catch (err) {
      console.error("Errore reset password:", err);

      setErrorMsg(
        "Errore durante l'invio dell'email di reset"
      );
    }
  };

  const inputClass =
    "w-full h-12 rounded-xl border border-white/10 bg-white/[0.06] " +
    "pl-11 pr-11 text-white placeholder:text-neutral-500 " +
    "outline-none transition focus:border-red-500/70 " +
    "focus:ring-2 focus:ring-red-500/10";

  return (
    <div
      className="
        relative min-h-screen overflow-hidden
        bg-neutral-950 text-white
        flex flex-col
      "
    >
      {/* Sfondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-950 to-black" />

      <div
        className="
          absolute inset-0 opacity-[0.08]
          bg-[radial-gradient(circle_at_50%_20%,white,transparent_45%)]
        "
      />

      {/* Fasce rosse */}
      <div
        className="
          absolute -left-24 top-[-10%]
          h-[120%] w-24
          rotate-[-22deg]
          bg-red-700/45
        "
      />

      <div
        className="
          absolute left-4 top-[-10%]
          h-[120%] w-12
          rotate-[-22deg]
          bg-red-950/50
        "
      />

      {/* Header */}
      <header
        className="
          relative z-10
          w-full max-w-6xl mx-auto
          px-5 pt-7 pb-3
          flex justify-center
        "
      >
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight">
            Montecarlo 2013
          </div>

          <div className="mt-2 space-y-1">
            <div className="h-1 w-44 rounded-full bg-red-600" />
            <div className="h-1 w-44 rounded-full bg-red-600" />
            <div className="h-1 w-44 rounded-full bg-red-600" />
          </div>

          <div className="mt-3 text-sm text-neutral-400">
            Passione • Squadra • Territorio
          </div>
        </div>
      </header>

      {/* Contenuto */}
      <main
        className="
          relative z-10 flex-1
          flex items-center justify-center
          px-4 py-5
        "
      >
        <form
          onSubmit={handleSubmit}
          className="
            w-full max-w-xl
            rounded-2xl
            border border-white/15
            bg-neutral-950/80
            backdrop-blur-xl
            shadow-2xl
            p-6 sm:p-8
          "
        >
          {/* Titolo */}
          <div className="text-center mb-7">
            <div
              className="
                mx-auto mb-4
                flex h-14 w-14
                items-center justify-center
                rounded-2xl
                bg-red-600/15
                text-red-500
                border border-red-500/15
              "
            >
              <LockKeyhole size={28} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold">
              Accedi
            </h1>

            <p className="mt-2 text-sm sm:text-base text-neutral-400">
              Inserisci le tue credenziali per accedere
              all'app Montecarlo 2013.
            </p>
          </div>

          {/* Errori */}
          {errorMsg && (
            <div
              className="
                mb-5 rounded-xl
                border border-red-500/30
                bg-red-500/10
                px-4 py-3
                text-sm text-red-300
              "
            >
              {errorMsg}
            </div>
          )}

          {resetMsg && (
            <div
              className="
                mb-5 rounded-xl
                border border-green-500/30
                bg-green-500/10
                px-4 py-3
                text-sm text-green-300
              "
            >
              {resetMsg}
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block mb-2 text-sm font-semibold"
            >
              Email
            </label>

            <div className="relative">
              <Mail
                size={19}
                className="
                  absolute left-4 top-1/2
                  -translate-y-1/2
                  text-neutral-400
                "
              />

              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.it"
                className={inputClass}
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-3">
            <label
              htmlFor="password"
              className="block mb-2 text-sm font-semibold"
            >
              Password
            </label>

            <div className="relative">
              <LockKeyhole
                size={19}
                className="
                  absolute left-4 top-1/2
                  -translate-y-1/2
                  text-neutral-400
                "
              />

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la password"
                className={inputClass}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((value) => !value)
                }
                onMouseDown={(e) => e.preventDefault()}
                className="
                  absolute right-4 top-1/2
                  -translate-y-1/2
                  text-neutral-400
                  hover:text-white
                  transition
                "
                aria-label={
                  showPassword
                    ? "Nascondi password"
                    : "Mostra password"
                }
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          {/* Password dimenticata */}
          <div className="mb-6 text-right">
            <button
              type="button"
              onClick={handlePasswordReset}
              className="
                text-sm font-medium
                text-red-400
                hover:text-red-300
                hover:underline
                transition
              "
            >
              Password dimenticata?
            </button>
          </div>

          {/* Login */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full h-12
              rounded-xl
              bg-red-600
              text-white font-bold
              flex items-center justify-center gap-2
              transition
              hover:bg-red-500
              disabled:opacity-60
              disabled:cursor-not-allowed
              shadow-lg shadow-red-950/30
            "
          >
            {loading ? (
              "Accesso..."
            ) : (
              <>
                Accedi
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Registrazione */}
          <div
            className="
              mt-7 pt-6
              border-t border-white/10
              text-center
            "
          >
            <p className="text-sm text-neutral-400 mb-3">
              Non hai ancora un account?
            </p>

            <Link
              to="/register"
              className="
                w-full h-12
                rounded-xl
                border border-white/25
                flex items-center justify-center
                font-semibold text-white
                hover:bg-white/[0.06]
                hover:border-white/40
                transition
              "
            >
              Richiedi l'accesso
            </Link>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer
        className="
          relative z-10
          pb-5 text-center
          text-xs text-neutral-500
        "
      >
        <div className="font-semibold text-neutral-400">
          Montecarlo 2013
        </div>

        <div className="mt-1">
          Passione • Squadra • Territorio
        </div>

        <div className="mx-auto mt-2 h-0.5 w-8 bg-red-600" />
      </footer>
    </div>
  );
}