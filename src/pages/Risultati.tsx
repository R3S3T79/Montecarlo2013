// src/pages/Risultati.tsx
// Data creazione chat: 2025-08-01 (rev: layout testata 2 righe + giorno maiuscolo + sticky filtro + scroll restore fix + anchor restore)

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Partita } from "../types/database";

interface PartitaWithTeams extends Partita {
  casa: { nome: string };
  ospite: { nome: string };
  nome_torneo: string | null;
  rigori_a: number | null;
  rigori_b: number | null;
}

interface Stagione {
  id: string;
  nome: string;
}

export default function Risultati() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [partite, setPartite] = useState<PartitaWithTeams[]>([]);
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [stagioneSelezionata, setStagioneSelezionata] = useState<string>("");
  const [tipoCompetizione, setTipoCompetizione] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

 
 

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

  // ✅ Ripristina posizione: prima prova con ancora (card), altrimenti con scrollY — solo dopo caricamento partite
  useEffect(() => {
    if (!loadingData) {
      const anchor = sessionStorage.getItem("risultati-anchor");
      if (anchor) {
        // aspetta il paint per sicurezza
        requestAnimationFrame(() => {
          const el = document.getElementById(`p-${anchor}`);
          if (el) {
            el.scrollIntoView({ block: "start" });
          }
        });
      } else {
        const savedScroll = sessionStorage.getItem("risultati-scroll");
        if (savedScroll) {
          window.scrollTo(0, parseInt(savedScroll, 10));
        }
      }
    }
  }, [loadingData]);

  // ✅ Salva scroll quando si lascia la pagina
  useEffect(() => {
    return () => {
      sessionStorage.setItem("risultati-scroll", window.scrollY.toString());
    };
  }, [location]);

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
      <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b]">
        <div className="container mx-auto px-3 py-8">
          <span className="font-semibold text-red-500">Caricamento…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#343434] via-[#404040] to-[#2b2b2b]">
      <div className="container mx-auto px-2 pb-8">

        {/* 1. Box filtro sticky */}
        <div className="sticky top-0 z-10 mb-5 pt-2">
          <div className="space-y-2 rounded-2xl border border-white/10 bg-[#202020]/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md">

            {/* Input di ricerca */}
            <input
              type="text"
              placeholder="Cerca Nome Squadra"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-600 bg-[#2b2b2b] px-3 py-2.5 text-sm font-medium text-white placeholder:text-gray-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-600/30"
            />

            {/* Dropdown Stagione e Competizioni */}
            <div className="flex gap-2">
              <select
                value={stagioneSelezionata}
                onChange={(e) => setStagioneSelezionata(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-gray-600 bg-[#2b2b2b] px-2 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-600/30"
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
                className="min-w-0 flex-1 rounded-xl border border-gray-600 bg-[#2b2b2b] px-2 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-600/30"
              >
                <option value="">Tutti</option>
                <option value="Campionato">Campionato</option>
                <option value="Torneo">Torneo</option>
                <option value="Amichevole">Amichevole</option>
                <option value="Allenamento">Allenamento</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Messaggi di stato */}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/50 p-4 text-red-200 shadow-lg">
            {error}
          </div>
        )}

        {!error && filteredPartite.length === 0 && (
          <div className="rounded-2xl border border-gray-200/80 bg-gradient-to-r from-white via-[#f8f8f8] to-[#ededed] p-8 text-center font-semibold text-gray-700 shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
            {searchTerm ? "Nessuna partita trovata" : "Nessuna partita giocata"}
          </div>
        )}

        {/* 3. Elenco risultati */}
        {!error && filteredPartite.length > 0 && (
          <div className="space-y-4">
            {filteredPartite.map((p) => (
              <div
                key={p.id}
                id={`p-${p.id}`}
                style={{ scrollMarginTop: "100px" }}
                onClick={() => {
                  sessionStorage.setItem("risultati-anchor", p.id as string);
                  navigate(`/partita/${p.id}`);
                }}
                className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-r from-white via-[#f8f8f8] to-[#ededed] shadow-[0_6px_18px_rgba(0,0,0,0.38)] cursor-pointer transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_9px_24px_rgba(0,0,0,0.48)]"
              >
                <div className="absolute left-0 top-0 z-10 h-full w-[4px] bg-red-600" />

                {/* Testata: 2 righe, sx giorno+data, dx competizione+nome_torneo */}
                <div className="border-b border-white/10 bg-gradient-to-r from-[#171717] via-[#242424] to-[#303030] px-4 py-3 text-white">
                  <div className="flex justify-between gap-4">

                    {/* Colonna sinistra */}
                    <div className="flex flex-col text-left">
                      <span className="text-[14px] font-extrabold tracking-wide text-white">
                        {formatGiorno(p.data_ora)}
                      </span>
                      <span className="mt-0.5 text-[12px] font-semibold tracking-wide text-gray-300">
                        {formatData(p.data_ora)}
                      </span>
                    </div>

                    {/* Colonna destra */}
                    <div className="flex min-w-0 flex-col text-right">
                      <span className="text-[14px] font-extrabold uppercase tracking-wide text-red-500">
                        {p.campionato_torneo}
                      </span>
                      <span className="mt-0.5 truncate text-[12px] font-semibold text-gray-300">
                        {p.nome_torneo || ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corpo: squadre e risultato */}
                <div className="grid min-h-[88px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">

                  <span className="text-right text-[14px] font-extrabold uppercase leading-tight text-[#222222]">
                    {p.casa.nome}
                  </span>

                  <div className="flex min-w-[72px] flex-col items-center justify-center">
                    <div className="rounded-lg bg-[#1d1d1d] px-3 py-1.5 shadow-md">
                      <span className="whitespace-nowrap text-xl font-extrabold tracking-wide text-white">
                        {p.goal_a} <span className="text-red-500">-</span> {p.goal_b}
                      </span>
                    </div>

                    {((p.rigori_a ?? 0) > 0 || (p.rigori_b ?? 0) > 0) && (
                      <span className="mt-1.5 whitespace-nowrap text-[11px] font-bold text-red-600">
                        ({p.rigori_a ?? 0} - {p.rigori_b ?? 0} d.c.r.)
                      </span>
                    )}
                  </div>

                  <span className="text-left text-[14px] font-extrabold uppercase leading-tight text-[#222222]">
                    {p.ospite.nome}
                  </span>
                </div>

                <div className="h-[3px] w-full bg-gradient-to-r from-red-700 via-red-500 to-transparent" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}