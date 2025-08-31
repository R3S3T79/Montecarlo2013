// src/pages/Risultati.tsx
// Data creazione chat: 2025-08-01 (rev: layout testata 2 righe + giorno maiuscolo)

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Partita } from "../types/database";

interface PartitaWithTeams extends Partita {
  casa: { nome: string };
  ospite: { nome: string };
}

interface Stagione {
  id: string;
  nome: string;
}

export default function Risultati() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [partite, setPartite] = useState<PartitaWithTeams[]>([]);
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>("");
  const [tipoCompetizione, setTipoCompetizione] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role =
    (user?.user_metadata?.role as string) ||
    (user?.app_metadata?.role as string) ||
    null;
  const canAddPartita = role === "admin" || role === "creator";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user) {
      (async () => {
        const { data: stagData, error: stagErr } = await supabase
          .from("stagioni")
          .select("*")
          .order("data_inizio", { ascending: false });
        if (stagErr) {
          setError(stagErr.message);
        } else {
          setStagioni(stagData || []);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (user) fetchPartite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagioneSelezionata, tipoCompetizione]);

  const fetchPartite = async () => {
    try {
      setLoadingData(true);
      let q = supabase
        .from("partite")
        .select(
          `
          *,
          casa:squadra_casa_id(nome),
          ospite:squadra_ospite_id(nome),
          nome_torneo
        `
        )
        .eq("stato", "Giocata")
        .order("data_ora", { ascending: false });

      if (stagioneSelezionata) {
        q = q.eq("stagione_id", stagioneSelezionata);
      }
      if (tipoCompetizione) {
        q = q.eq("campionato_torneo", tipoCompetizione);
      }

      const { data, error } = await q;
      if (error) throw error;
      setPartite(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore caricamento partite"
      );
    } finally {
      setLoadingData(false);
    }
  };

  // giorno con iniziale maiuscola
  const formatGiorno = (d: string) => {
    const giorno = new Date(d).toLocaleDateString("it-IT", { weekday: "long" });
    return giorno.charAt(0).toUpperCase() + giorno.slice(1);
  };

  const formatData = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

  const filteredPartite = partite.filter(({ casa, ospite }) => {
    const s = searchTerm.toLowerCase();
    return (
      casa.nome.toLowerCase().includes(s) ||
      ospite.nome.toLowerCase().includes(s)
    );
  });

  if (loading || loadingData) {
    return (
      <div className="container mx-auto px-2">
        <span>Caricamento…</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2">
      <div className="relative mb-4 mt-2">
        <div className="bg-white rounded-xl shadow-montecarlo p-2 space-y-2 bg-white/90 rounded-lg">
          {/* Input di ricerca */}
          <input
            type="text"
            placeholder="Cerca Nome Squadra"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-2 border-montecarlo-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-montecarlo-secondary focus:ring-2 focus:ring-montecarlo-secondary/20"
          />

          {/* Dropdown Stagione e Competizioni */}
          <div className="flex gap-2">
            <select
              value={stagioneSelezionata}
              onChange={(e) => setStagioneSelezionata(e.target.value)}
              className="flex-1 border-2 border-montecarlo-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-montecarlo-secondary focus:ring-2 focus:ring-montecarlo-secondary/20"
            >
              <option value="">Stagione</option>
              {stagioni.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>

            <select
              value={tipoCompetizione}
              onChange={(e) => setTipoCompetizione(e.target.value)}
              className="flex-1 border-2 border-montecarlo-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-montecarlo-secondary focus:ring-2 focus:ring-montecarlo-secondary/20"
            >
              <option value="">Tutti</option>
              <option value="Campionato">Campionato</option>
              <option value="Torneo">Torneo</option>
              <option value="Amichevole">Amichevole</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-montecarlo-red-50 border-montecarlo-red-200 rounded-lg p-4 text-montecarlo-red-800">
          {error}
        </div>
      )}

      {!error && filteredPartite.length === 0 && (
        <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
          {searchTerm ? "Nessuna partita trovata" : "Nessuna partita giocata"}
        </div>
      )}

      {!error && filteredPartite.length > 0 && (
        <div className="space-y-3">
          {filteredPartite.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/partita/${p.id}`)}
              className="bg-white/90 rounded-lg shadow-montecarlo hover:shadow-montecarlo-lg cursor-pointer transition-transform hover:scale-[1.02] border-l-4 border-montecarlo-secondary"
            >
              {/* Testata: 2 righe, sx giorno+data, dx competizione+nome_torneo */}
              <div className="bg-gradient-montecarlo text-white px-4 py-2 rounded-t-lg">
                <div className="flex justify-between">
                  {/* Colonna sinistra */}
                  <div className="flex flex-col text-left">
                    <span className="text-sm sm:text-base font-bold">
                      {formatGiorno(p.data_ora)}
                    </span>
                    <span className="text-sm sm:text-base font-semibold">
                      {formatData(p.data_ora)}
                    </span>
                  </div>

                  {/* Colonna destra */}
                  <div className="flex flex-col text-right">
                    <span className="text-sm sm:text-base font-bold">
                      {p.campionato_torneo}
                    </span>
                    <span className="text-sm sm:text-base font-semibold">
                      {p.nome_torneo || ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Corpo: squadre e risultato */}
              <div className="p-4 grid grid-cols-[2fr_auto_2fr] items-center gap-4">
                <span className="text-montecarlo-secondary font-semibold text-right">
                  {p.casa.nome}
                </span>
                <span className="text-montecarlo-secondary font-bold text-lg">
                  {p.goal_a} - {p.goal_b}
                </span>
                <span className="text-montecarlo-secondary font-semibold">
                  {p.ospite.nome}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
