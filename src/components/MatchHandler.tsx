// src/components/MatchHandler.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import GestioneRisultatoPartita from "./GestioneRisultatoPartita";

interface SquadraMin {
  id: string;
  nome: string;
  logo_url?: string;
}

interface PartitaDaGestire {
  id: string;
  data_ora: string;
  stato: string;
  stagione_id: string;
  squadra_casa_id: string;
  squadra_ospite_id: string;
  campionato_torneo: string;
  luogo_torneo: string | null;
  goal_a: number;
  goal_b: number;
  // Eventuali altri campi
  casa: SquadraMin;
  ospite: SquadraMin;
}

export default function MatchHandler() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [partita, setPartita] = useState<PartitaDaGestire | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      // Se non ho un ID valido, torno indietro
      navigate("/partita");
      return;
    }

    const fetchPartita = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from<PartitaDaGestire>("partite")
          .select(`
            id,
            data_ora,
            stato,
            stagione_id,
            squadra_casa_id,
            squadra_ospite_id,
            campionato_torneo,
            luogo_torneo,
            goal_a,
            goal_b,
            casa:squadra_casa_id(nome, logo_url),
            ospite:squadra_ospite_id(nome, logo_url)
          `)
          .eq("id", id)
          .single();

        if (error) {
          console.error("Errore Supabase:", error.message);
          setPartita(null);
          // Se la partita non esiste o non è in stato "DaGiocare", torno a /partita
          navigate("/partita");
        } else if (data.stato !== "DaGiocare") {
          // Se lo stato non è più "DaGiocare", non dovrebbe restare qui
          setPartita(null);
          navigate("/partita");
        } else {
          setPartita(data);
        }
      } catch (err: any) {
        console.error("Errore imprevisto:", err.message);
        setPartita(null);
        navigate("/partita");
      } finally {
        setLoading(false);
      }
    };

    fetchPartita();
  }, [id, navigate]);

  if (loading) {
    return <div className="p-4 text-gray-500">Caricamento…</div>;
  }

  if (!partita) {
    return <div className="p-4 text-gray-500">Partita non trovata o già giocata.</div>;
  }

  return (
    <div className="p-4">
      <GestioneRisultatoPartita partita={partita} />
    </div>
  );
}
