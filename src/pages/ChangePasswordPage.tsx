import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Save,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function ChangePasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg(
        "La nuova password deve contenere almeno 8 caratteri."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(
        "Le due password non coincidono."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Sessione utente non valida."
        );
      }

      // Cambia la password in Supabase Auth
      const { error: passwordError } =
        await supabase.auth.updateUser({
          password,
        });

      if (passwordError) {
        throw passwordError;
      }

      // Rimuove l'obbligo di cambio password
      const { error: profileError } =
        await supabase
          .from("user_profiles")
          .update({
            must_change_password: false,
          })
          .eq("user_id", user.id);

      if (profileError) {
        console.error(
          "Errore aggiornamento profilo:",
          profileError
        );

        throw new Error(
          "Password modificata, ma non è stato possibile completare l'operazione."
        );
      }

      navigate("/", {
        replace: true,
      });
    } catch (error: any) {
      console.error(
        "Errore cambio password:",
        error
      );

      setErrorMsg(
        error?.message ||
          "Errore durante il cambio della password."
      );
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
        flex items-center justify-center
        px-4 py-8
      "
    >
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-950 to-black" />

      <div
        className="
          absolute inset-0 opacity-[0.08]
          bg-[radial-gradient(circle_at_50%_20%,white,transparent_45%)]
        "
      />

      <main
        className="
          relative z-10
          w-full max-w-xl
          rounded-2xl
          border border-white/15
          bg-neutral-950/80
          backdrop-blur-xl
          shadow-2xl
          p-6 sm:p-8
        "
      >
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
            Crea la tua password
          </h1>

          <p className="mt-3 text-sm sm:text-base text-neutral-400">
            Hai effettuato l'accesso con una password
            provvisoria.
            <br />
            Per continuare devi scegliere una nuova
            password personale.
          </p>
        </div>

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

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block mb-2 text-sm font-semibold"
            >
              Nuova password
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
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Minimo 8 caratteri"
                className={inputClass}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((v) => !v)
                }
                className="
                  absolute right-4 top-1/2
                  -translate-y-1/2
                  text-neutral-400
                  hover:text-white
                "
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          <div className="mb-7">
            <label
              htmlFor="confirmPassword"
              className="block mb-2 text-sm font-semibold"
            >
              Conferma password
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
                id="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Ripeti la nuova password"
                className={inputClass}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (v) => !v
                  )
                }
                className="
                  absolute right-4 top-1/2
                  -translate-y-1/2
                  text-neutral-400
                  hover:text-white
                "
              >
                {showConfirmPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="
              w-full h-12
              rounded-xl
              bg-red-600
              text-white font-bold
              flex items-center justify-center gap-2
              hover:bg-red-500
              transition
              disabled:opacity-60
              disabled:cursor-not-allowed
            "
          >
            {loading ? (
              "Salvataggio..."
            ) : (
              <>
                <Save size={18} />
                Salva nuova password
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Montecarlo 2013
        </p>
      </main>
    </div>
  );
}