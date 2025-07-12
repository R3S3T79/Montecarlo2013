// src/pages/ProssimaPartita.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Calendar, Clock, MapPin, Play, Plus, History } from "lucide-react";

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
      const adesso = new Date();
      const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate());
      const domani = new Date(oggi);
      domani.setDate(oggi.getDate() + 1);

      const todayMidnightIso = oggi.toISOString();
      const tomorrowMidnightIso = domani.toISOString();

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
          casa:squadra_casa_id (id, nome, logo_url),
          ospite:squadra_ospite_id (id, nome, logo_url)
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

      if (todayData && todayData.length > 0) {
        setPartita(todayData[0] as PartitaProssima);
        setHasPartitaOggi(true);
        setLoading(false);
        return;
      }

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
          casa:squadra_casa_id (id, nome, logo_url),
          ospite:squadra_ospite_id (id, nome, logo_url)
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

      if (!futureData || futureData.length === 0) {
        setPartita(null);
        setLoading(false);
        return;
      }

      const prossima = futureData[0] as PartitaProssima;
      setPartita(prossima);
      setHasPartitaOggi(false);

      const { data: prevData, error: prevError } = await supabase
        .from("partite")
        .select(`
          id,
          data_ora,
          goal_a,
          goal_b,
          casa:squadra_casa_id (nome),
          ospite:squadra_ospite_id (nome)
        `)
        .or(
          `and(squadra_casa_id.eq.${prossima.squadra_casa_id},squadra_ospite_id.eq.${prossima.squadra_ospite_id}),` +
          `and(squadra_casa_id.eq.${prossima.squadra_ospite_id},squadra_ospite_id.eq.${prossima.squadra_casa_id})`
        )
        .lt("data_ora", prossima.data_ora)
        .order("data_ora", { ascending: false })
        .limit(5);

      setPrecedenti(prevError ? [] : (prevData as ScontroPrecedente[]));
      setLoading(false);
    };

    fetchPartita();
  }, []);

  const handleGestisciPartita = () => {
    if (partita) navigate(`/match-handler/${partita.id}`);
  };

  const formatData = (data: string) =>
    new Date(data).toLocaleDateString("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const formatOra = (data: string) =>
    new Date(data).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-montecarlo-light flex justify-center items-center">
        <div className="bg-white rounded-lg shadow-montecarlo p-8">
          <div className="text-montecarlo-secondary">Caricamento…</div>
        </div>
      </div>
    );
  }

  if (!partita) {
    return (
      <div className="min-h-screen bg-gradient-montecarlo-light">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-montecarlo p-8 text-center">
              <Calendar className="mx-auto text-montecarlo-neutral mb-4" size={48} />
              <h2 className="text-xl font-bold text-montecarlo-secondary mb-4">
                Nessuna partita programmata
              </h2>
              <p className="text-montecarlo-neutral mb-6">
                Non ci sono partite in programma al momento.
              </p>
              <button
                onClick={() => navigate("/nuova-partita")}
                className="bg-gradient-montecarlo text-white px-6 py-3 rounded-lg font-medium hover:shadow-montecarlo-lg transition-all duration-300 transform hover:scale-105 flex items-center mx-auto"
              >
                <Plus className="mr-2" size={20} />
                Crea Nuova Partita
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      {/* Header */}
      <div className="bg-gradient-montecarlo text-white p-6 shadow-montecarlo-lg">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center mb-2">
            {hasPartitaOggi ? (
              <Play className="text-montecarlo-accent mr-3" size={28} />
            ) : (
              <Calendar className="text-montecarlo-accent mr-3" size={28} />
            )}
            <h1 className="text-2xl font-bold">
              {hasPartitaOggi ? "Partita di Oggi" : "Prossima Partita"}
            </h1>
          </div>
          {hasPartitaOggi && (
            <p className="text-white/80">È il momento di giocare!</p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Card principale partita */}
          <div className="bg-white rounded-xl shadow-montecarlo overflow-hidden">
            {/* Data e ora */}
            <div className="bg-montecarlo-red-50 p-4 border-l-4 border-montecarlo-secondary">
              <div className="flex items-center justify-center space-x-4 text-montecarlo-secondary">
                <div className="flex items-center">
                  <Calendar className="mr-2" size={18} />
                  <span className="font-semibold">
                    {formatData(partita.data_ora)}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-2" size={18} />
                  <span className="font-semibold">
                    {formatOra(partita.data_ora)}
                  </span>
                </div>
              </div>
              <div className="text-center mt-2">
                <span className="bg-montecarlo-accent text-montecarlo-secondary px-3 py-1 rounded-full text-sm font-medium shadow-gold">
                  {partita.campionato_torneo.charAt(0).toUpperCase() + partita.campionato_torneo.slice(1)}
                </span>
              </div>
            </div>

            {/* Squadre */}
            <div className="p-6 space-y-6">
              {/* Squadra Casa */}
              <div className="flex items-center justify-center p-4 bg-montecarlo-red-50 rounded-lg border-2 border-montecarlo-red-200">
                <div className="flex items-center space-x-4">
                  {partita.casa.logo_url && (
                    <img
                      src={partita.casa.logo_url}
                      alt={`${partita.casa.nome} logo`}
                      className="w-12 h-12 object-contain rounded-full border-2 border-montecarlo-accent"
                    />
                  )}
                  <span className="text-lg font-bold text-montecarlo-secondary">
                    {partita.casa.nome}
                  </span>
                </div>
              </div>

              {/* VS */}
              <div className="text-center">
                <div className="bg-gradient-montecarlo text-white px-6 py-2 rounded-full font-bold text-lg shadow-montecarlo inline-block">
                  VS
                </div>
              </div>

              {/* Squadra Ospite */}
              <div className="flex items-center justify-center p-4 bg-montecarlo-gray-50 rounded-lg border-2 border-montecarlo-gray-200">
                <div className="flex items-center space-x-4">
                  {partita.ospite.logo_url && (
                    <img
                      src={partita.ospite.logo_url}
                      alt={`${partita.ospite.nome} logo`}
                      className="w-12 h-12 object-contain rounded-full border-2 border-montecarlo-accent"
                    />
                  )}
                  <span className="text-lg font-bold text-montecarlo-secondary">
                    {partita.ospite.nome}
                  </span>
                </div>
              </div>

              {/* Luogo */}
              {partita.luogo_torneo && (
                <div className="flex items-center justify-center text-montecarlo-neutral">
                  <MapPin className="mr-2" size={16} />
                  <span className="text-sm">{partita.luogo_torneo}</span>
                </div>
              )}
            </div>

            {/* Pulsante gestisci se è oggi */}
            {hasPartitaOggi && (
              <div className="p-6 pt-0">
                <button
                  onClick={handleGestisciPartita}
                  className="w-full bg-gradient-montecarlo text-white py-4 px-6 rounded-lg font-bold text-lg hover:shadow-montecarlo-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                >
                  <Play className="mr-2" size={20} />
                  Gestisci Risultato
                </button>
              </div>
            )}
          </div>

          {/* Scontri precedenti */}
          {precedenti.length > 0 && (
            <div className="bg-white rounded-xl shadow-montecarlo overflow-hidden">
              <div className="bg-gradient-montecarlo text-white p-4">
                <div className="flex items-center">
                  <History className="mr-2" size={20} />
                  <h2 className="font-semibold">Scontri Precedenti</h2>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {precedenti.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/partita/${item.id}`)}
                    className="cursor-pointer hover:bg-montecarlo-red-50 p-3 rounded-lg transition-colors border border-montecarlo-red-100"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-montecarlo-neutral">
                        {new Date(item.data_ora).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <div className="text-sm font-medium text-montecarlo-secondary">
                        <span className="bg-montecarlo-accent text-montecarlo-secondary px-2 py-1 rounded shadow-gold">
                          {item.casa.nome} {item.goal_a} - {item.goal_b} {item.ospite.nome}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}