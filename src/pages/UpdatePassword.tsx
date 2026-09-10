// src/pages/UpdatePassword.tsx
// Reset password OTP - grafica Montecarlo 2013

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function UpdatePassword(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const emailFromState =
    (location.state as { email?: string })?.email || "";

  const [email, setEmail] = useState(emailFromState);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (emailFromState) {
      setEmail(emailFromState);
    }
  }, [emailFromState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanEmail || !cleanToken || !password || !password2) {
      setError("Compila tutti i campi.");
      return;
    }

    if (!/^\d{6}$/.test(cleanToken)) {
      setError("Il codice OTP deve essere composto da 6 cifre.");
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

    setLoading(true);

    try {
      // 1. Verifica OTP recovery
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "recovery",
      });

      if (otpError) {
        setError("Codice OTP non valido o scaduto.");
        return;
      }

      // 2. Aggiorna password
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        setError(
          "Errore durante l'aggiornamento della password: " +
            updateError.message
        );
        return;
      }

      setSuccess(
        "Password aggiornata con successo. Verrai reindirizzato al login…"
      );

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("Errore reset password:", err);
      setError("Si è verificato un errore imprevisto.");
    } finally {
      setLoading(false);
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

      {/* Fasce rosse decorative */}
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
          px-5 py-6
          flex items-center justify-between
        "
      >
        <div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight">
            Montecarlo 2013
          </div>

          <div className="mt-2 space-y-1">
            <div className="h-1 w-36 rounded-full bg-red-600" />
            <div className="h-1 w-36 rounded-full bg-red-600" />
            <div className="h-1 w-36 rounded-full bg-red-600" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="
            flex items-center gap-2
            text-sm font-medium text-neutral-300
            hover:text-white transition
          "
        >
          <ArrowLeft size={17} />
          <span className="hidden sm:inline">Torna al login</span>
        </button>
      </header>

      {/* Contenuto */}
      <main
        className="
          relative z-10 flex-1
          flex items-center justify-center
          px-4 py-6
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
              Reset Password
            </h1>

            <p className="mt-2 text-sm sm:text-base text-neutral-400">
              Inserisci i dati richiesti per reimpostare la tua
              password con il codice OTP ricevuto via email.
            </p>
          </div>

          {/* Errore */}
          {error && (
            <div
              className="
                mb-5 rounded-xl
                border border-red-500/30
                bg-red-500/10
                px-4 py-3
                text-sm text-red-300
              "
            >
              {error}
            </div>
          )}

          {/* Successo */}
          {success && (
            <div
              className="
                mb-5 rounded-xl
                border border-green-500/30
                bg-green-500/10
                px-4 py-3
                text-sm text-green-300
              "
            >
              {success}
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold">
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
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.it"
                autoComplete="email"
                required
                readOnly={!!emailFromState}
              />
            </div>
          </div>

          {/* OTP */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold">
              Codice OTP (6 cifre)
            </label>

            <div className="relative">
              <ShieldCheck
                size={19}
                className="
                  absolute left-4 top-1/2
                  -translate-y-1/2
                  text-neutral-400
                "
              />

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className={inputClass}
                value={token}
                onChange={(e) =>
                  setToken(
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                placeholder="Inserisci il codice a 6 cifre"
                required
              />
            </div>
          </div>

          {/* Nuova password */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold">
              Nuova password
            </label>

            <div className="relative">
              <KeyRound
                size={19}
                className="
                  absolute left-4 top-1/2
                  -translate-y-1/2
                  text-neutral-400
                "
              />

              <input
                type={showPassword ? "text" : "password"}
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la nuova password"
                autoComplete="new-password"
                required
                minLength={8}
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="
                  absolute right-4 top-1/2
                  -translate-y-1/2
                  text-neutral-400 hover:text-white
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

          {/* Conferma password */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-semibold">
              Conferma password
            </label>

            <div className="relative">
              <KeyRound
                size={19}
                className="
                  absolute left-4 top-1/2
                  -translate-y-1/2
                  text-neutral-400
                "
              />

              <input
                type={showPassword2 ? "text" : "password"}
                className={inputClass}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Conferma la nuova password"
                autoComplete="new-password"
                required
                minLength={8}
              />

              <button
                type="button"
                onClick={() => setShowPassword2((value) => !value)}
                className="
                  absolute right-4 top-1/2
                  -translate-y-1/2
                  text-neutral-400 hover:text-white
                  transition
                "
                aria-label={
                  showPassword2
                    ? "Nascondi password"
                    : "Mostra password"
                }
              >
                {showPassword2 ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          {/* Salva */}
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
              "Salvataggio..."
            ) : (
              <>
                Salva nuova password
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Footer card */}
          <div
            className="
              mt-6 pt-5
              border-t border-white/10
              text-center
            "
          >
            <p className="text-xs sm:text-sm text-neutral-500">
              Se non hai richiesto tu il reset della password,
              contatta un amministratore.
            </p>
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