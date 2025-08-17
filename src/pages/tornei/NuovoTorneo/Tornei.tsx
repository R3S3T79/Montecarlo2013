// src/pages/Tornei.tsx
// Data creazione chat: 2025-08-01
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
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
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
    <div className="min-h-screen px-4 pb-6">
      <div className="w-full">
        <div className="bg-white rounded-xl shadow-montecarlo p-6 overflow-x-auto">
          {listaTornei.length === 0 ? (
            <p className="text-center text-gray-600 italic">
              Nessun torneo disponibile.
            </p>
          ) : (
            <table className="table-auto w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white">
                    Nome Torneo
                  </th>
                  <th className="px-4 py-2 text-left bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white">
                    Luogo
                  </th>
                  <th className="px-4 py-2 text-left bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white">
                    Data Inizio
                  </th>
                  <th className="px-4 py-2 text-left bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white">
                    Stagione
                  </th>
                  <th className="px-4 py-2 text-left bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white">
                    Tipo
                  </th>
                  {canAdd && (
                    <th className="px-4 py-2 text-left bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white">
                      Azioni
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {listaTornei.map((t, idx) => (
                  <tr
                    key={t.id}
                    onClick={() => apriTorneo(t.id, t.formato)}
                    onMouseEnter={() => setHoveredRow(idx)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`cursor-pointer transition-colors duration-200 ${
                      hoveredRow === idx
                        ? "bg-red-50"
                        : idx % 2 === 0
                        ? "bg-gray-50"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                      {t.nome}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                      {t.luogo || "–"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                      {formatDate(t.dataInizio)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                      {t.stagioneNome}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                      {t.formato.replace("_", " ")}
                    </td>
                    {canAdd && (
                      <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                        <button
                          onClick={(e) => eliminaTorneo(e, t.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
