// src/pages/tornei/NuovoTorneo/Step6_GironeUnico.tsx
// Data: 24/08/2025 (rev: classifica con rigori_vincitore + tabella con bordi rosso-200)

import React, { useEffect, useState, useMemo } from "react";
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
  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
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
        .from<Partita>("tornei_gironeunico")
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
        .from<Squadra>("squadre")
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

  if (loading) return <p className="text-center text-white py-6">Caricamento in corso…</p>;

  return (
    <div className="max-w-3xl mx-auto m-2 mt-2 p-2 print:p-0 space-y-6">
      <div className="space-y-3">
        {matches.map((m) => {
          const home = squadreMap[m.squadra_casa];
          const away = squadreMap[m.squadra_ospite];
          let score: React.ReactNode = <span className="text-sm">VS</span>;
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
              <span className="text-base font-medium">
                {a}-{b}
              </span>
            );
          }

          return (
            <div
              key={m.id}
              onClick={canEdit ? () => handleEdit(m.id) : undefined}
              className={`bg-white/90 shadow rounded-lg p-2 ${
                canEdit ? "cursor-pointer hover:bg-gray-50" : ""
              }`}
            >
              <div className="text-base text-gray-500 mb-1 text-center">
                {formatDate(m.data_match)}
              </div>
              <div className="flex items-center">
                <span className="w-1/3 text-left text-base">
                  {home?.nome}
                </span>
                <span className="w-1/3 text-center">{score}</span>
                <span className="w-1/3 text-right text-base">
                  {away?.nome}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CLASSIFICA */}
      <table className="bg-white/90 table-auto border-collapse text-center text-base mb-6 w-full border border-red-200">
        <thead>
          <tr>
            <th className="px-2 py-1 border border-red-200 text-left">
              Squadra
            </th>
            <th className="px-2 py-1 border border-red-200">PG</th>
            <th className="px-2 py-1 border border-red-200">V</th>
            <th className="px-2 py-1 border border-red-200">N</th>
            <th className="px-2 py-1 border border-red-200">P</th>
            <th className="px-2 py-1 border border-red-200">GF</th>
            <th className="px-2 py-1 border border-red-200">GS</th>
            <th className="px-2 py-1 border border-red-200">DR</th>
            <th className="px-2 py-1 border border-red-200">Pt</th>
          </tr>
        </thead>
        <tbody>
          {classifica.map((r) => (
            <tr key={r.id}>
              <td className="px-2 py-1 border border-red-200 flex items-center space-x-2 whitespace-nowrap text-left">
                {r.logo_url && (
                  <img
                    src={r.logo_url}
                    alt=""
                    className="w-4 h-4 rounded-full"
                  />
                )}
                <span>{r.nome}</span>
              </td>
              <td className="px-2 py-1 border border-red-200">{r.PG}</td>
              <td className="px-2 py-1 border border-red-200">{r.V}</td>
              <td className="px-2 py-1 border border-red-200">{r.N}</td>
              <td className="px-2 py-1 border border-red-200">{r.P}</td>
              <td className="px-2 py-1 border border-red-200">{r.GF}</td>
              <td className="px-2 py-1 border border-red-200">{r.GS}</td>
              <td className="px-2 py-1 border border-red-200">{r.DR}</td>
              <td className="px-2 py-1 border border-red-200">{r.Pt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* BOTTONI */}
      <div className="flex justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Indietro
        </button>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Stampa
        </button>
        {canEdit && (
          <button
            onClick={handleSaveAndExit}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Salva ed Esci
          </button>
        )}
      </div>

      {canEdit && <Outlet />}
    </div>
  );
}
