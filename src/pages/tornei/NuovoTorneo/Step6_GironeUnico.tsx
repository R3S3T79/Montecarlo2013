// src/pages/tornei/NuovoTorneo/Step6_GironeUnico.tsx
// Data: 24/08/2025 (rev: classifica con rigori_vincitore + tabella con bordi rosso-200)

import { useEffect, useState, useMemo, type ReactNode } from "react";
import { useParams, useNavigate, useLocation, Outlet } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { UserRole } from "../../../lib/roles";

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface Partita {
  id: string;
  squadra_casa: string;
  squadra_ospite: string;
  gol_casa: number;
  gol_ospite: number;
  data_match: string | null;
  giocata: boolean;
  rigori_vincitore: string | null;
}

export default function Step6_GironeUnico() {
  const { user } = useAuth();
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

const canEdit = role === UserRole.Admin || role === UserRole.Creator;

  const { torneoId: paramId } = useParams<{ torneoId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const torneoId = (location.state as { torneoId?: string })?.torneoId || paramId;

  const [torneoNome, setTorneoNome] = useState<string>("Torneo");
  const [matches, setMatches] = useState<Partita[]>([]);
  const [squadreMap, setSquadreMap] = useState<{ [key: string]: Squadra }>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!torneoId) return navigate("/tornei");
    (async () => {
      setLoading(true);
      const { data: tData } = await supabase
        .from("tornei")
        .select("nome_torneo")
        .eq("id", torneoId)
        .single();
      if (tData?.nome_torneo) setTorneoNome(tData.nome_torneo);

      const { data: partiteData } = await supabase
        .from("tornei_gironeunico")
        .select(
          "id, squadra_casa, squadra_ospite, gol_casa, gol_ospite, data_match, giocata, rigori_vincitore"
        )
        .eq("torneo_id", torneoId)
        .order("data_match", { ascending: true });

      const ordered = (partiteData || []).sort((a, b) => {
        const t1 = new Date(a.data_match || "").getTime();
        const t2 = new Date(b.data_match || "").getTime();
        return t1 !== t2 ? t1 - t2 : a.id.localeCompare(b.id);
      });
      setMatches(ordered);

      const ids = Array.from(
        new Set(ordered.flatMap((m) => [m.squadra_casa, m.squadra_ospite]))
      );
      const { data: sData } = await supabase
        .from("squadre")
        .select("id, nome, logo_url")
        .in("id", ids);
      setSquadreMap(Object.fromEntries((sData || []).map((s) => [s.id, s])));

      setLoading(false);
    })();
  }, [torneoId, navigate]);

  const classifica = useMemo(() => {
    type Row = {
      id: string;
      nome: string;
      logo_url: string | null;
      PG: number;
      V: number;
      N: number;
      P: number;
      GF: number;
      GS: number;
      DR: number;
      Pt: number;
    };
    const tbl: { [key: string]: Row } = {};

    matches.forEach((m) => {
      [m.squadra_casa, m.squadra_ospite].forEach((id) => {
        if (!tbl[id]) {
          const s = squadreMap[id];
          tbl[id] = {
            id,
            nome: s?.nome || id,
            logo_url: s?.logo_url || null,
            PG: 0,
            V: 0,
            N: 0,
            P: 0,
            GF: 0,
            GS: 0,
            DR: 0,
            Pt: 0,
          };
        }
      });
    });

    matches
      .filter((m) => m.giocata)
      .forEach((m) => {
        const home = tbl[m.squadra_casa];
        const away = tbl[m.squadra_ospite];
        home.PG++;
        away.PG++;
        home.GF += m.gol_casa;
        home.GS += m.gol_ospite;
        away.GF += m.gol_ospite;
        away.GS += m.gol_casa;

        if (m.gol_casa > m.gol_ospite) {
          home.V++;
          away.P++;
          home.Pt += 3;
        } else if (m.gol_ospite > m.gol_casa) {
          away.V++;
          home.P++;
          away.Pt += 3;
        } else {
          if (m.rigori_vincitore === m.squadra_casa) {
            home.V++;
            away.P++;
            home.Pt += 3;
          } else if (m.rigori_vincitore === m.squadra_ospite) {
            away.V++;
            home.P++;
            away.Pt += 3;
          } else {
            home.N++;
            away.N++;
            home.Pt++;
            away.Pt++;
          }
        }
      });

    Object.values(tbl).forEach((r) => (r.DR = r.GF - r.GS));

    const rows = Object.values(tbl);
    rows.sort((a, b) => {
      const diff = b.Pt - a.Pt || b.DR - a.DR || b.GF - a.GF;
      return diff !== 0 ? diff : a.nome.localeCompare(b.nome);
    });

    return rows;
  }, [matches, squadreMap]);

  const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  // Spezza la stringa ISO e ricostruisci l'orario senza shift di timezone
  const [datePart, timePart] = iso.split("T");
  if (!datePart || !timePart) return "—";

  const [year, month, day] = datePart.split("-");
  const [hour, minute] = timePart.split(":");

  return `${day}/${month}/${year} ${hour}:${minute}`;
};



  const handleEdit = (matchId: string) => {
    navigate(
      `/tornei/nuovo/step6-gironeunico/${torneoId}/partita/${matchId}/edit`,
      {
        state: { torneoId },
      }
    );
  };

  const handleSaveAndExit = () => navigate("/tornei");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-2">
        <div className="rounded-xl border border-gray-200 bg-white/90 px-6 py-4 shadow-montecarlo">
          <div className="text-sm font-semibold text-montecarlo-secondary">
            Caricamento in corso…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border print:p-0">
      <div className="w-full max-w-4xl mx-auto space-y-4">

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo print:hidden">
          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl ring-1 ring-inset ring-red-200">
                🏆
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-xl sm:text-2xl font-bold text-gray-900">
                  {torneoNome}
                </h1>

                <p className="mt-0.5 text-sm text-gray-500">
                  Girone unico
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {matches.map((m) => {
            const home = squadreMap[m.squadra_casa];
            const away = squadreMap[m.squadra_ospite];
            let score: ReactNode = <span className="text-xs font-semibold text-gray-400">VS</span>;
            if (m.giocata) {
              let a = String(m.gol_casa),
                b = String(m.gol_ospite);
              if (a === b && m.rigori_vincitore) {
                if (m.rigori_vincitore === m.squadra_casa) {
                  a = "." + a;
                } else if (m.rigori_vincitore === m.squadra_ospite) {
                  b = b + ".";
                }
              }
              score = (
                <span className="text-lg font-bold text-montecarlo-secondary">
                  {a}-{b}
                </span>
              );
            }

            return (
              <div
                key={m.id}
                onClick={canEdit ? () => handleEdit(m.id) : undefined}
                className={`overflow-hidden rounded-xl border border-gray-200 bg-white/90 shadow-sm transition ${
                  canEdit ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-montecarlo" : ""
                }`}
              >
                <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

                <div className="p-3 sm:p-4">
                  <div className="mb-3 text-center text-xs font-medium text-gray-500">
                    {formatDate(m.data_match)}
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {home?.logo_url && (
                        <img
                          src={home.logo_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-contain bg-white p-0.5 shadow-sm"
                        />
                      )}

                      <span className="truncate text-sm sm:text-base font-semibold text-gray-800">
                        {home?.nome}
                      </span>
                    </div>

                    <div className="flex min-w-[52px] items-center justify-center rounded-lg bg-red-50 px-2 py-2 ring-1 ring-inset ring-red-100">
                      {score}
                    </div>

                    <div className="flex min-w-0 items-center justify-end gap-2">
                      <span className="truncate text-right text-sm sm:text-base font-semibold text-gray-800">
                        {away?.nome}
                      </span>

                      {away?.logo_url && (
                        <img
                          src={away.logo_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-contain bg-white p-0.5 shadow-sm"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CLASSIFICA */}
        <div className="overflow-hidden rounded-xl border border-red-200 bg-white/90 shadow-sm">
          <div className="border-b border-red-100 bg-red-50 px-4 py-3">
            <h2 className="font-bold text-gray-900">
              Classifica
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="table-auto border-collapse text-center text-sm sm:text-base w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 border-b border-r border-red-200 text-left">
                    Squadra
                  </th>
                  <th className="px-2 py-2 border-b border-r border-red-200">G</th>   {/* ex PG */}
                  <th className="px-2 py-2 border-b border-r border-red-200">V</th>
                  <th className="px-2 py-2 border-b border-r border-red-200">N</th>
                  <th className="px-2 py-2 border-b border-r border-red-200">P</th>
                  <th className="px-2 py-2 border-b border-r border-red-200">F</th>   {/* ex GF */}
                  <th className="px-2 py-2 border-b border-r border-red-200">S</th>   {/* ex GS */}
                  <th className="px-2 py-2 border-b border-r border-red-200">D</th>   {/* ex DR */}
                  <th className="px-2 py-2 border-b border-red-200 bg-red-50 font-bold text-montecarlo-secondary">P</th>   {/* ex Pt */}
                </tr>
              </thead>

              <tbody>
                {classifica.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 border-b border-r border-red-100 whitespace-nowrap text-left">
                      <div className="flex items-center space-x-2">
                        {r.logo_url && (
                          <img
                            src={r.logo_url}
                            alt=""
                            className="w-5 h-5 rounded-full object-contain"
                          />
                        )}
                        <span className="font-medium">{r.nome}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 border-b border-r border-red-100">{r.PG}</td>
                    <td className="px-2 py-2 border-b border-r border-red-100">{r.V}</td>
                    <td className="px-2 py-2 border-b border-r border-red-100">{r.N}</td>
                    <td className="px-2 py-2 border-b border-r border-red-100">{r.P}</td>
                    <td className="px-2 py-2 border-b border-r border-red-100">{r.GF}</td>
                    <td className="px-2 py-2 border-b border-r border-red-100">{r.GS}</td>
                    <td className="px-2 py-2 border-b border-r border-red-100">{r.DR}</td>
                    <td className="px-2 py-2 border-b border-red-100 bg-red-50/50 font-bold text-montecarlo-secondary">{r.Pt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOTTONI */}
        <div className={`grid grid-cols-1 gap-2 print:hidden ${canEdit ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-gray-100 border border-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-200 transition"
          >
            Indietro
          </button>

          <button
            onClick={() => window.print()}
            className="w-full border border-red-200 bg-red-50 text-montecarlo-secondary font-semibold py-2.5 px-4 rounded-lg hover:bg-red-100 transition"
          >
            Stampa
          </button>

          {canEdit && (
            <button
              onClick={handleSaveAndExit}
              className="w-full bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:opacity-90 transition"
            >
              Salva ed Esci
            </button>
          )}
        </div>

        {canEdit && <Outlet />}
      </div>
    </div>
  );
}