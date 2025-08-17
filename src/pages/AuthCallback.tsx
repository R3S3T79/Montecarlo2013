import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      // Estrae il token dall'URL e salva la sessione internamente
      const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
      if (error) {
        console.error("Errore conferma email:", error.message);
        navigate("/errore-verifica");
      } else {
        // Redirect alla home una volta autenticato
        navigate("/");
      }
    };

    handleAuth();
  }, [navigate]);

  return <p>Verifica in corso...</p>;
}
