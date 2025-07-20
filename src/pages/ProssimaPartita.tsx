// src/pages/ProssimaPartita.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Calendar, Clock, History } from "lucide-react";

interface SquadraInfo {
  id: string;
  nome: string;
  logo_url?: string;
}

interface PartitaProssima {
  id: string;
  data_ora: string;
  campionato_torneo: string;
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

export default function ProssimaPartita(): JSX.Element {
  const [partita, setPartita] = useState<PartitaProssima | null>(null);
  const [precedenti, setPrecedenti] = useState<ScontroPrecedente[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPartita = async () => {
      setLoading(true);
      const oggi = new Date();
      const inizioOggi = new Date(
        oggi.getFullYear(),
        oggi.getMonth(),
        oggi.getDate()
      ).toISOString();
      const { data } = await supabase
        .from("partite")
        .select(
          `
            id,
            data_ora,
            campionato_torneo,
            casa:squadra_casa_id(id, nome, logo_url),
            ospite:squadra_ospite_id(id, nome, logo_url)
          `
        )
        .eq("stato", "DaGiocare")
        .gte("data_ora", inizioOggi)
        .order("data_ora", { ascending: true })
        .limit(1);
      if (data && data.length) setPartita(data[0]);
      setLoading(false);
    };
    fetchPartita();
  }, []);

  useEffect(() => {
    if (!partita) return;
    const fetchPrecedenti = async () => {
      const { data } = await supabase
        .from("partite")
        .select(
          `
            id,
            data_ora,
            goal_a,
            goal_b,
            casa:squadra_casa_id(nome),
            ospite:squadra_ospite_id(nome)
          `
        )
        .or(
          `and(squadra_casa_id.eq.${partita.casa.id},squadra_ospite_id.eq.${partita.ospite.id}),` +
          `and(squadra_casa_id.eq.${partita.ospite.id},squadra_ospite_id.eq.${partita.casa.id})`
        )
        .lt("data_ora", partita.data_ora)
        .order("data_ora", { ascending: false })
        .limit(5);
      setPrecedenti(data || []);
    };
    fetchPrecedenti();
  }, [partita]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-montecarlo-light flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-montecarlo p-6">
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
              Prossima Partita
            </h2>
          </div>
        </div>

        {!partita ? (
          <div className="bg-white rounded-xl shadow-montecarlo p-6 text-center">
            <span className="text-montecarlo-secondary">
              Nessuna partita programmata
            </span>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-montecarlo overflow-hidden">
            {/* Data e ora */}
            <div className="px-4 py-2 flex justify-center items-center space-x-6 text-montecarlo-secondary">
              <Calendar size={18} />
              <span className="font-semibold">{formatDate(partita.data_ora)}</span>
              <Clock size={18} />
              <span className="font-semibold">{formatTime(partita.data_ora)}</span>
            </div>

            {/* Tipo incontro */}
            <div className="text-center text-montecarlo-secondary mb-4">
              <span className="font-medium">
                {partita.campionato_torneo.charAt(0).toUpperCase() +
                  partita.campionato_torneo.slice(1)}
              </span>
            </div>

            {/* Squadre posizionate */}
            <div className="grid grid-cols-1 gap-4 px-4 pb-6">
              <div className="bg-white p-4 flex justify-start items-center">
                {partita.casa.logo_url && (
                  <img
                    src={partita.casa.logo_url}
                    alt={partita.casa.nome}
                    className="w-12 h-12 object-contain rounded-full mr-3"
                  />
                )}
                <span className="text-montecarlo-secondary font-bold">
                  {partita.casa.nome}
                </span>
              </div>
              <div className="text-center">
                <span className="bg-gradient-montecarlo text-white px-6 py-2 rounded-full inline-block shadow-montecarlo font-bold">
                  VS
                </span>
              </div>
              <div className="bg-white p-4 flex justify-end items-center">
                <span className="text-montecarlo-secondary font-bold mr-3">
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

            {/* Scontri precedenti */}
            {precedenti.length > 0 && (
              <div className="bg-white rounded-xl shadow-montecarlo mt-6">
                <div className="bg-gradient-montecarlo text-white p-3 flex items-center">
                  <History size={20} className="mr-2" />
                  <h3 className="font-semibold">Scontri precedenti</h3>
                </div>
                <div className="p-3 space-y-2">
                  {precedenti.map((sc) => (
                    <div
                      key={sc.id}
                      onClick={() => navigate(`/partita/${sc.id}`)}
                      className="cursor-pointer hover:bg-montecarlo-gray-50 p-2 rounded transition"
                    >
                      <div className="flex justify-between items-center text-sm text-montecarlo-secondary">
                        <span>
                          {new Date(sc.data_ora).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="font-medium">
                          {sc.casa.nome} {sc.goal_a} - {sc.goal_b} {sc.ospite.nome}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
