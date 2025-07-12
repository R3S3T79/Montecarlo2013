// src/pages/Risultati.tsx

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
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
  const [partite, setPartite] = useState<PartitaWithTeams[]>([]);
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>("");
  const [tipoCompetizione, setTipoCompetizione] = useState<string>(""); 
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Recupera le stagioni
  const fetchStagioni = async () => {
    try {
      const { data, error } = await supabase
        .from("stagioni")
        .select("*")
        .order("data_inizio", { ascending: false });

      if (error) throw error;
      setStagioni(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento delle stagioni");
    }
  };

  // Recupera le partite giocate (senza filtro sulla data)
  const fetchPartite = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("partite")
        .select(`
          *,
          casa:squadra_casa_id(nome),
          ospite:squadra_ospite_id(nome)
        `)
        .eq("stato", "Giocata")
        .order("data_ora", { ascending: false });

      if (stagioneSelezionata) {
        query = query.eq("stagione_id", stagioneSelezionata);
      }
      if (tipoCompetizione) {
        query = query.eq("campionato_torneo", tipoCompetizione);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPartite(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento delle partite");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStagioni();
  }, []);

  useEffect(() => {
    fetchPartite();
  }, [stagioneSelezionata, tipoCompetizione]);

  // Formatta la data in italiano
  const formatData = (data: string) =>
    new Date(data).toLocaleDateString("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit"
    });

  // Applica la ricerca testuale su nomi squadre
  const filteredPartite = partite.filter(partita => {
    const searchLower = searchTerm.toLowerCase();
    return (
      partita.casa.nome.toLowerCase().includes(searchLower) ||
      partita.ospite.nome.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-6 flex flex-col items-center">
        {/* Header con titolo centrato e pulsante + a destra */}
        <div className="relative w-full max-w-lg mb-6">
          <div className="bg-white rounded-xl shadow-montecarlo p-6">
            <h1 className="text-2xl font-bold text-montecarlo-secondary text-center mb-4">Risultati</h1>
            <button
              onClick={() => navigate("/nuova-partita")}
              className="absolute right-2 top-2 w-10 h-10 bg-gradient-montecarlo text-white rounded-full flex items-center justify-center hover:shadow-montecarlo-lg transition-all duration-300 transform hover:scale-105"
              title="Aggiungi Partita"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
        
        {/* Filtri e ricerca */}
        <div className="w-full max-w-lg mb-6 space-y-4">
          {/* Barra di ricerca */}
          <div className="bg-white rounded-lg shadow-montecarlo p-4">
            <input
              type="text"
              placeholder="Cerca squadra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-2 border-montecarlo-gray-200 rounded-lg px-4 py-2 text-montecarlo-secondary focus:outline-none focus:border-montecarlo-secondary focus:ring-2 focus:ring-montecarlo-secondary/20 transition-colors"
            />
          </div>

          {/* Filtri Stagione e Tipo Competizione */}
          <div className="bg-white rounded-lg shadow-montecarlo p-4">
            <div className="flex gap-3">
              <select
                value={stagioneSelezionata}
                onChange={(e) => setStagioneSelezionata(e.target.value)}
                className="flex-1 border-2 border-montecarlo-gray-200 rounded-lg px-3 py-2 text-montecarlo-secondary bg-white focus:outline-none focus:border-montecarlo-secondary focus:ring-2 focus:ring-montecarlo-secondary/20 transition-colors"
              >
                <option value="">Tutte le stagioni</option>
                {stagioni.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
              <select
                value={tipoCompetizione}
                onChange={(e) => setTipoCompetizione(e.target.value)}
                className="flex-1 border-2 border-montecarlo-gray-200 rounded-lg px-3 py-2 text-montecarlo-secondary bg-white focus:outline-none focus:border-montecarlo-secondary focus:ring-2 focus:ring-montecarlo-secondary/20 transition-colors"
              >
                <option value="">Tutte</option>
                <option value="campionato">Campionato</option>
                <option value="torneo">Torneo</option>
                <option value="amichevole">Amichevole</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista dei risultati */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
            <div className="text-montecarlo-secondary">Caricamento...</div>
          </div>
        ) : error ? (
          <div className="bg-montecarlo-red-50 border border-montecarlo-red-200 rounded-lg p-4 text-montecarlo-red-800 text-center">
            {error}
          </div>
        ) : filteredPartite.length === 0 ? (
          <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
            <div className="text-montecarlo-neutral">
              {searchTerm ? "Nessuna partita trovata" : "Nessuna partita giocata"}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-lg space-y-3">
            {filteredPartite.map((partita, idx) => (
              <div
                key={partita.id}
                onClick={() => navigate(`/partita/${partita.id}`)}
                className={`
                  bg-white rounded-lg shadow-montecarlo hover:shadow-montecarlo-lg 
                  cursor-pointer transition-all duration-300 transform hover:scale-[1.02]
                  border-l-4 border-montecarlo-secondary
                  ${idx < filteredPartite.length - 1 ? "mb-3" : ""}
                `}
              >
                {/* Data in alto */}
                <div className="bg-gradient-montecarlo text-white px-4 py-2 rounded-t-lg">
                  <div className="text-sm font-medium text-center">
                    {formatData(partita.data_ora)}
                  </div>
                </div>

                {/* Contenuto partita */}
                <div className="p-4">
                  <div className="grid grid-cols-[2fr_auto_2fr] items-center gap-4">
                    <span className="text-montecarlo-secondary font-semibold text-right">
                      {partita.casa.nome}
                    </span>
                    <div className="bg-montecarlo-accent text-montecarlo-secondary px-3 py-1 rounded-lg font-bold text-lg shadow-gold">
                      {partita.goal_a} - {partita.goal_b}
                    </div>
                    <span className="text-montecarlo-secondary font-semibold text-left">
                      {partita.ospite.nome}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}