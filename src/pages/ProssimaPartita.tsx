// src/pages/ProssimaPartita.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Calendar, Clock, MapPin, Plus, History } from "lucide-react";

interface SquadraInfo {
  id: string;
  nome: string;
  logo_url?: string;
}

interface PartitaProssima {
  id: string;
  data_ora: string;
  stato: string;
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPartita = async () => {
      setLoading(true);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const todayIso = today.toISOString();
      const tomorrowIso = tomorrow.toISOString();

      // Prova match di oggi
      let { data, error } = await supabase
        .from("partite")
        .select(`
          id,
          data_ora,
          stato,
          squadra_casa_id,
          squadra_ospite_id,
          campionato_torneo,
          luogo_torneo,
          casa:squadra_casa_id (id, nome, logo_url),
          ospite:squadra_ospite_id (id, nome, logo_url)
        `)
        .eq("stato", "DaGiocare")
        .gte("data_ora", todayIso)
        .lt("data_ora", tomorrowIso)
        .order("data_ora", { ascending: true })
        .limit(1);

      if (data?.length) {
        setPartita(data[0]);
        setLoading(false);
        return;
      }

      // Se non, prossimo futuro
      ({ data, error } = await supabase
        .from("partite")
        .select(`
          id,
          data_ora,
          stato,
          squadra_casa_id,
          squadra_ospite_id,
          campionato_torneo,
          luogo_torneo,
          casa:squadra_casa_id (id, nome, logo_url),
          ospite:squadra_ospite_id (id, nome, logo_url)
        `)
        .eq("stato", "DaGiocare")
        .gte("data_ora", tomorrowIso)
        .order("data_ora", { ascending: true })
        .limit(1));

      if (data?.length) {
        const next = data[0];
        setPartita(next);

        // Precedenti
        const { data: prevData, error: prevErr } = await supabase
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
            `and(squadra_casa_id.eq.${next.squadra_casa_id},squadra_ospite_id.eq.${next.squadra_ospite_id}),` +
            `and(squadra_casa_id.eq.${next.squadra_ospite_id},squadra_ospite_id.eq.${next.squadra_casa_id})`
          )
          .lt("data_ora", next.data_ora)
          .order("data_ora", { ascending: false })
          .limit(5);

        setPrecedenti(prevErr ? [] : prevData);
      }

      setLoading(false);
    };

    fetchPartita();
  }, []);

  const handleCrea = () => navigate("/nuova-partita");
  const handleVaiAlMatch = () =>
    partita && navigate(`/match-handler/${partita.id}`);

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
        <div className="bg-white p-8 rounded-lg shadow-montecarlo">
          <div className="text-montecarlo-secondary">Caricamento…</div>
        </div>
      </div>
    );
  }

  if (!partita) {
    return (
      <div className="min-h-screen bg-gradient-montecarlo-light flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-montecarlo text-center">
          <Calendar className="mx-auto text-montecarlo-neutral mb-4" size={48} />
          <h2 className="text-xl font-bold text-montecarlo-secondary mb-4">
            Nessuna partita programmata
          </h2>
          <p className="text-montecarlo-neutral mb-6">
            Non ci sono partite in programma al momento.
          </p>
          <button
            onClick={handleCrea}
            className="bg-gradient-montecarlo text-white px-6 py-3 rounded-lg flex items-center mx-auto hover:scale-105 transition"
          >
            <Plus className="mr-2" size={20} />
            Crea Nuova Partita
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-8">
        {/* Titolo centrato e allineato al card, con margine-top per non sovrapporsi */}
        <div className="max-w-md mx-auto mt-16 bg-white rounded-xl shadow-montecarlo text-center py-6 mb-8">
          <h1 className="text-2xl font-bold text-montecarlo-secondary">
            Prossima partita
          </h1>
        </div>

        {/* Card principale */}
        <div className="max-w-md mx-auto space-y-6">
          <div className="bg-white rounded-xl shadow-montecarlo overflow-hidden">
            <div className="bg-montecarlo-red-50 p-4 border-l-4 border-montecarlo-secondary">
              <div className="flex justify-center space-x-4 text-montecarlo-secondary">
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
                  {partita.campionato_torneo}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-center p-4 bg-montecarlo-red-50 rounded-lg border border-montecarlo-red-200">
                <div className="flex items-center space-x-4">
                  {partita.casa.logo_url && (
                    <img
                      src={partita.casa.logo_url}
                      alt={`${partita.casa.nome} logo`}
                      className="w-12 h-12 rounded-full border-2 border-montecarlo-accent"
                    />
                  )}
                  <span className="text-lg font-bold text-montecarlo-secondary">
                    {partita.casa.nome}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-gradient-montecarlo text-white px-6 py-2 rounded-full font-bold text-lg shadow-montecarlo inline-block">
                  VS
                </div>
              </div>

              <div className="flex justify-center p-4 bg-montecarlo-gray-50 rounded-lg border border-montecarlo-gray-200">
                <div className="flex items-center space-x-4">
                  {partita.ospite.logo_url && (
                    <img
                      src={partita.ospite.logo_url}
                      alt={`${partita.ospite.nome} logo`}
                      className="w-12 h-12 rounded-full border-2 border-montecarlo-accent"
                    />
                  )}
                  <span className="text-lg font-bold text-montecarlo-secondary">
                    {partita.ospite.nome}
                  </span>
                </div>
              </div>

              {partita.luogo_torneo && (
                <div className="flex justify-center items-center text-montecarlo-neutral">
                  <MapPin className="mr-2" size={16} />
                  <span className="text-sm">{partita.luogo_torneo}</span>
                </div>
              )}
            </div>

            <div className="p-6 pt-0">
              <button
                onClick={handleVaiAlMatch}
                className="w-full bg-gradient-montecarlo text-white py-4 rounded-lg font-bold hover:scale-105 transition"
              >
                Gestisci Risultato
              </button>
            </div>
          </div>

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
                    className="cursor-pointer hover:bg-montecarlo-red-50 p-3 rounded-lg border border-montecarlo-red-100 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-montecarlo-neutral">
                        {new Date(item.data_ora).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-sm font-medium text-montecarlo-secondary">
                        {item.casa.nome} {item.goal_a} - {item.goal_b}{" "}
                        {item.ospite.nome}
                      </span>
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
