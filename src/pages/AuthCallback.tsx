import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const verifyLogin = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) {
        console.error("Errore conferma email:", error.message)
        navigate("/errore-verifica")
      } else {
        navigate("/") // oppure dove vuoi portare l'utente dopo verifica
      }
    }

    verifyLogin()
  }, [navigate])

  return <p>Verifica in corso...</p>
}
