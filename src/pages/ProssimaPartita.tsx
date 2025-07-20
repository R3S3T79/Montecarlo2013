// src/pages/ProssimaPartita.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Calendar, Clock, Play, History } from "lucide-react";

interface SquadraInfo {
  id: string;
  nome: string;
  logo_url?: string;
}

interface PartitaProssima {
  id: string;
  data_ora: string;
  stato: string;
  stagione_id: string;
  squadra_casa_id: string;
  squadra_ospite_id: string;
  campionato_torneo: string;
  luogo_torneo: string | null;
  casa: SquadraInfo;
  ospite: SquadraInfo;
}

interface ScontroPrecedente {
  id: string;
  data_ora: string;
  goal_a: number;
  goal_b: number;
  casa: { nome: string };
  ospite: { nome: string };
}

export default function ProssimaPartita() {
  const [partita, setPartita] = useState<PartitaProssima | null>(null);
  const [precedenti, setPrecedenti] = useState<ScontroPrecedente[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPartitaOggi, setHasPartitaOggi] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPartita = async () => {
      setLoading(true);

      // Calcolo intervallo “oggi” in locale
      const adesso = new Date();
      const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate());
      const domani = new Date(oggi);
      domani.setDate(oggi.getDate() + 1);

      const todayMidnightIso = oggi.toISOString();
      const tomorrowMidnightIso = domani.toISOString();

      // Log dei dati temporali
      console.log("fetchPartita() • ora attuale:", adesso);
      console.log("fetchPartita() • inizio oggi (ISO):", todayMidnightIso);
      console.log("fetchPartita() • inizio domani (ISO):", tomorrowMidnightIso);

      // Provo prima con le partite “oggi”
      const { data: todayData, error: todayError } = await supabase
        .from("partite")
        .select(`
          id,
          data_ora,
          stato,
          stagione_id,
          squadra_casa_id,
          squadra_ospite_id,
          campionato_torneo,
          luogo_torneo,
          casa:squadra_casa_id(id, nome, logo_url),
          ospite:squadra_ospite_id(id, nome, logo_url)
        `)
        .eq("stato", "DaGiocare")
        .gte("data_ora", todayMidnightIso)
        .lt("data_ora", tomorrowMidnightIso)
        .order("data_ora", { ascending: true })
        .limit(1);

      if (todayError) {
        console.error("Errore recuperando le partite di oggi:", todayError);
        setLoading(false);
        return;
      }

      // Log del risultato “oggi”
      console.log("fetchPartita() • risultati query oggi:", todayData);

      if (todayData && todayData.length > 0) {
        setPartita(todayData[0] as PartitaProssima);
        setHasPartitaOggi(true);
        setLoading(false);
        return;
      }

      // Se non c’è nulla “oggi”, cerco le future
      const { data: futureData, error: futureError } = await supabase
        .from("partite")
        .select(`
          id,
          data_ora,
          stato,
          stagione_id,
          squadra_casa_id,
          squadra_ospite_id,
          campionato_torneo,
          luogo_torneo,
          casa:squadra_casa_id(id, nome, logo_url),
          ospite:squadra_ospite_id(id, nome, logo_url)
        `)
        .eq("stato", "DaGiocare")
        .gte("data_ora", tomorrowMidnightIso)
        .order("data_ora", { ascending: true })
        .limit(1);

      if (futureError) {
        console.error("Errore recuperando le partite future:", futureError);
        setPartita(null);
        setLoading(false);
        return;
      }

      // Log del risultato “future”
      console.log("fetchPartita() • risultati query future:", futureData);

      if (!futureData || futureData.length === 0) {
        setPartita(null);
        setLoading(false);
        return;
      }

      setPartita(futureData[0] as PartitaProssima);
      setHasPartitaOggi(false);
      setLoading(false);
    };

    fetchPartita();
  }, []);

  useEffect(() => {
    if (!partita) return;
    (async () => {
      const { data: prevData, error: prevError } = await supabase
        .from("partite")
        .select(`
          id,
          data_ora,
          goal_a,
          goal_b,
          casa:squadra_casa_id(nome),
          ospite:squadra_ospite_id(nome)
        `)
        .or(
          `and(squadra_casa_id.eq.${partita.casa.id},squadra_ospite_id.eq.${partita.ospite.id}),` +
          `and(squadra_casa_id.eq.${partita.ospite.id},squadra_ospite_id.eq.${partita.casa.id})`
        )
        .lt("data_ora", partita.data_ora)
        .order("data_ora", { ascending: false })
        .limit(5);

      setPrecedenti(prevError ? [] : (prevData as ScontroPrecedente[]));
    })();
  }, [partita]);

  const formatData = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  const formatOra = (d: string) =>
    new Date(d).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-montecarlo-light flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-montecarlo p-4">
          <span className="text-montecarlo-secondary">Caricamento…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-6">
        {/* Header uniforme */}
        <div className="relative mt-4 mb-4">
          <div className="bg-white rounded-xl shadow-montecarlo p-2">
            <h2 className="text-lg font-bold text-montecarlo-secondary text-center">
              {hasPartitaOggi ? "Partita di Oggi" : "Prossima Partita"}
            </h2>
          </div>
        </div>

        {!partita ? (
          <div className="bg-white rounded-xl shadow-montecarlo p-8 text-center">
            <span className="text-montecarlo-secondary">
              Nessuna partita programmata
            </span>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-montecarlo overflow-hidden space-y-6">
            {/* Data, ora e tipo */}
            <div className="p-4 text-center">
              <div className="flex justify-center items-center space-x-4 mb-2 text-montecarlo-secondary">
                <div className="flex items-center">
                  <Calendar className="mr-2" size={18} />
                  <span className="font-semibold">{formatData(partita.data_ora)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-2" size={18} />
                  <span className="font-semibold">{formatOra(partita.data_ora)}</span>
                </div>
              </div>
              <div>
                <span className="text-montecarlo-secondary font-medium">
                  {partita.campionato_torneo.charAt(0).toUpperCase() +
                    partita.campionato_torneo.slice(1)}
                </span>
              </div>
            </div>

            {/* Squadre */}
            <div className="grid grid-cols-1 gap-4 px-4 pb-6">
              <div className="flex justify-start items-center bg-white rounded-lg p-4">
                {partita.casa.logo_url && (
                  <img
                    src={partita.casa.logo_url}
                    alt={partita.casa.nome}
                    className="w-12 h-12 object-contain rounded-full mr-3"
                  />
                )}
                <span className="font-bold text-montecarlo-secondary">
                  {partita.casa.nome}
                </span>
              </div>
              <div className="text-center">
                <div className="bg-gradient-montecarlo text-white px-6 py-2 rounded-full font-bold text-lg shadow-montecarlo inline-block">
                  VS
                </div>
              </div>
              <div className="flex justify-end items-center bg-white rounded-lg p-4">
                <span className="font-bold text-montecarlo-secondary mr-3">
                  {partita.ospite.nome}
                </span>
                {partita.ospite.logo_url && (
                  <img
                    src={partita.ospite.logo_url}
                    alt={partita.ospite.nome}
                    className="w-12 h-12 object-contain rounded-full"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scontri precedenti */}
        {precedenti.length > 0 && (
          <div className="bg-white rounded-xl shadow-montecarlo overflow-hidden mt-6">
            <div className="bg-gradient-montecarlo text-white p-4">
              <div className="flex items-center">
                <History className="mr-2" size={20} />
                <h3 className="font-semibold">Scontri precedenti</h3>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {precedenti.map((sc) => (
                <div
                  key={sc.id}
                  onClick={() => navigate(`/partita/${sc.id}`)}
                  className="cursor-pointer hover:bg-montecarlo-gray-50 p-3 rounded-lg transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-montecarlo-neutral">
                      {new Date(sc.data_ora).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </span>
                    <span className="text-montecarlo-secondary font-medium">
                      {sc.casa.nome} {sc.goal_a}-{sc.goal_b} {sc.ospite.nome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
