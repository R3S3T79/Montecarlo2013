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
  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
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
        .select<{
          id: string;
          nome_torneo: string;
          luogo: string | null;
          stagioni: string;
          formato_torneo: string;
        }>("id, nome_torneo, luogo, stagioni, formato_torneo")
        .order("created_at", { ascending: false });

      if (errT || !tornei) {
        alert("Errore caricamento tornei: " + errT?.message);
        return;
      }

      const stagIds = Array.from(new Set(tornei.map((t) => t.stagioni)));
      const { data: st, error: errSt } = await supabase
        .from("stagioni")
        .select<{ id: string; nome: string }>("id, nome")
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
              .select<{ [key: string]: string }>(colData)
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
    const route = {
      Eliminazione: `/tornei/nuovo/step6-eliminazione/${id}`,
      Fase_Gironi: `/tornei/nuovo/step6-fasegironi/${id}`,
      Girone_Unico: `/tornei/nuovo/step6-gironeunico/${id}`,
    }[formato as keyof typeof route];
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B7280] to-[#bfb9b9]">
        <div className="text-white text-lg">Caricamento…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-2 px-2 pb-6">
      <div className="w-full">
        {/* wrapper trasparente: lo sfondo si vede tra tornei */}
        <div className="rounded-xl shadow-montecarlo p-2 bg-transparent">
          {listaTornei.length === 0 ? (
            <p className="text-center text-gray-600 italic">
              Nessun torneo disponibile.
            </p>
          ) : (
            <ul className="space-y-3">
              {listaTornei.map((t) => (
                <li
                  key={t.id}
                  onClick={() => apriTorneo(t.id, t.formato)}
                  className="group cursor-pointer rounded-xl border border-gray-200 bg-white/85 px-4 py-3 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-gray-900">
                          {t.nome}
                        </h3>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-red-200 bg-red-50 text-red-700">
                          {t.formato.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-600">
                        {t.luogo || "—"}
                      </p>
                    </div>

                    {canAdd && (
                      <button
                        onClick={(e) => eliminaTorneo(e, t.id)}
                        className="opacity-70 transition hover:opacity-100 text-red-600 hover:text-red-700"
                        title="Elimina torneo"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700 sm:grid-cols-4">
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <div className="text-xs text-gray-500">Luogo</div>
                      <div className="font-medium">{t.luogo || "—"}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <div className="text-xs text-gray-500">Data Inizio</div>
                      <div className="font-medium">{formatDate(t.dataInizio)}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <div className="text-xs text-gray-500">Stagione</div>
                      <div className="font-medium">{t.stagioneNome}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <div className="text-xs text-gray-500">Tipo</div>
                      <div className="font-medium">
                        {t.formato.replace("_", " ")}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
