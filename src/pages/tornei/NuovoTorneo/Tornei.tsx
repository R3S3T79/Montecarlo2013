// src/pages/Tornei.tsx
// Data creazione chat: 2025-08-01 (rev: margini uniformi 2 + distanza dalla navbar)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import { X } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { UserRole } from "../../../lib/roles";

interface TorneoMeta {
  id: string;
  nome: string;
  luogo: string | null;
  stagioneNome: string;
  formato: "Eliminazione" | "Girone_Unico" | "Fase_Gironi" | string;
  dataInizio: string | null;
}

export default function Tornei() {
  const [listaTornei, setListaTornei] = useState<TorneoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();
const [role, setRole] = useState<UserRole>(UserRole.Authenticated);

useEffect(() => {
  const caricaRuolo = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data?.role) {
      setRole(data.role as UserRole);
    }
  };

  caricaRuolo();
}, [user?.id]);

const canAdd = role === UserRole.Admin || role === UserRole.Creator;

  useEffect(() => {
    fetchListaTornei();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchListaTornei() {
    setLoading(true);
    try {
      const { data: tornei, error: errT } = await supabase
  .from("tornei")
  .select("id, nome_torneo, luogo, stagioni, formato_torneo")
  .order("created_at", { ascending: false });

      if (errT || !tornei) {
        alert("Errore caricamento tornei: " + errT?.message);
        return;
      }

      const stagIds = Array.from(new Set(tornei.map((t) => t.stagioni)));
     const { data: st, error: errSt } = await supabase
  .from("stagioni")
  .select("id, nome")
  .in("id", stagIds);

      if (errSt || !st) {
        alert("Errore caricamento stagioni: " + errSt?.message);
        return;
      }

      const mappaStag: Record<string, string> = {};
      st.forEach((s) => (mappaStag[s.id] = s.nome));

      const tableByFormato: Record<string, string> = {
        Eliminazione: "tornei_eliminazione",
        Fase_Gironi: "tornei_fasegironi",
        Girone_Unico: "tornei_gironeunico",
      };
      const colData = "data_match";

      const arr: TorneoMeta[] = await Promise.all(
        tornei.map(async (t) => {
          let dataInizio: string | null = null;
          const table = tableByFormato[t.formato_torneo] ?? null;
          if (table) {
            const { data, error } = await supabase
  .from(table)
  .select(colData)
  .eq("torneo_id", t.id)
  .order(colData, { ascending: true })
  .limit(1)
  .single();
            if (!error && data && data[colData]) {
              dataInizio = data[colData];
            }
          }
          return {
            id: t.id,
            nome: t.nome_torneo,
            luogo: t.luogo,
            stagioneNome: mappaStag[t.stagioni] || "–",
            formato: t.formato_torneo,
            dataInizio,
          };
        })
      );

      setListaTornei(arr);
    } catch (e) {
      console.error(e);
      alert("Errore imprevisto durante il caricamento");
    } finally {
      setLoading(false);
    }
  }

  const apriTorneo = (id: string, formato: string) => {
  const routes: Record<string, string> = {
    Eliminazione: `/tornei/nuovo/step6-eliminazione/${id}`,
    Fase_Gironi: `/tornei/nuovo/step6-fasegironi/${id}`,
    Girone_Unico: `/tornei/nuovo/step6-gironeunico/${id}`,
  };

  const route = routes[formato];
  navigate(route ?? `/tornei/nuovo/step1/${id}`);
};

  const eliminaTorneo = async (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string
  ) => {
    e.stopPropagation();
    if (!window.confirm("Sei sicuro di voler eliminare questo torneo?")) return;
    await supabase.from("tornei_eliminazione").delete().eq("torneo_id", id);
    await supabase.from("tornei_fasegironi").delete().eq("torneo_id", id);
    await supabase.from("tornei_gironeunico").delete().eq("torneo_id", id);
    const { error } = await supabase.from("tornei").delete().eq("id", id);
    if (error) alert("Errore eliminazione torneo: " + error.message);
    else fetchListaTornei();
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "–";
    const d = new Date(iso);
    const gg = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const aa = String(d.getFullYear()).slice(-2);
    return `${gg}/${mm}/${aa}`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl px-6 py-4 shadow-montecarlo">
          <div className="text-montecarlo-secondary text-base font-semibold">
            Caricamento…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-5xl mx-auto">

        <div className="mb-4 rounded-xl border border-red-100 bg-white/80 backdrop-blur-sm shadow-sm px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 rounded-full bg-montecarlo-secondary" />

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Tornei
              </h1>

              <p className="text-sm text-gray-500">
                Competizioni e tornei della squadra
              </p>
            </div>
          </div>
        </div>

        <div className="w-full">
          {/* wrapper trasparente: lo sfondo si vede tra tornei */}
          <div className="rounded-xl bg-transparent">

            {listaTornei.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm px-4 py-10 text-center shadow-sm">
                <div className="text-4xl mb-3">🏆</div>

                <p className="font-semibold text-gray-700">
                  Nessun torneo disponibile
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Al momento non sono presenti tornei.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {listaTornei.map((t) => (
                  <li
                    key={t.id}
                    onClick={() => apriTorneo(t.id, t.formato)}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-montecarlo"
                  >
                    <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

                    <div className="px-4 py-4">

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="truncate text-lg font-bold text-gray-900">
                              {t.nome}
                            </h3>

                            <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                              {t.formato.replace("_", " ")}
                            </span>

                          </div>
                        </div>

                        {canAdd && (
                          <button
                            onClick={(e) => eliminaTorneo(e, t.id)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 hover:text-red-700"
                            title="Elimina torneo"
                          >
                            <X size={18} />
                          </button>
                        )}

                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">

                        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                            📍
                          </div>

                          <div className="min-w-0">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                              Luogo
                            </div>

                            <div className="truncate text-sm font-semibold text-gray-700">
                              {t.luogo || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                            📅
                          </div>

                          <div>
                            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                              Data inizio
                            </div>

                            <div className="text-sm font-semibold text-gray-700">
                              {formatDate(t.dataInizio)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                            ⚽
                          </div>

                          <div>
                            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                              Stagione
                            </div>

                            <div className="text-sm font-semibold text-gray-700">
                              {t.stagioneNome}
                            </div>
                          </div>
                        </div>

                      </div>

                      <div className="mt-3 flex justify-end">
                        <span className="text-xs font-medium text-montecarlo-secondary transition group-hover:translate-x-1">
                          Apri torneo →
                        </span>
                      </div>

                    </div>
                  </li>
                ))}
              </ul>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}