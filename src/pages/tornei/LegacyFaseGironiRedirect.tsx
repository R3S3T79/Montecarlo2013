import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function LegacyFaseGironiRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (!id) return;
      // recupero il torneo a cui appartiene il match di fase-gironi
      const { data, error } = await supabase
        .from("tornei_fasegironi")
        .select("torneo_id")
        .eq("id", id)
        .single();

      if (error || !data) {
        // se non trovo nulla, torno ai risultati (o dove preferisci)
        navigate("/risultati", { replace: true });
        return;
        }

      navigate(`/tornei/nuovo/step6-fasegironi/${data.torneo_id}/partita/${id}/edit`, {
        replace: true,
      });
    })();
  }, [id, navigate]);

  return null; // niente UI, è solo un redirect
}
