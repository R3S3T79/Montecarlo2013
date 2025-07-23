// src/pages/tornei/NuovoTorneo/Step6_Eliminazione.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface Partita {
  id: string;
  squadra_casa_id: string;
  squadra_ospite_id: string;
  goal_casa: number;
  goal_ospite: number;
  rigori_vincitore: string | null;
  stato: string;
  data_ora: string | null;
  next_match_id?: string | null;
}

export default function Step6_Eliminazione() {
  const { torneoId: paramId } = useParams<{ torneoId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const torneoId =
    (location.state as { torneoId?: string })?.torneoId || paramId;

  // LOG per debug iniziale
  console.log("[Step6_Eliminazione] mount", {
    paramId,
    state: location.state,
    computedTorneoId: torneoId,
  });

  const [torneoNome, setTorneoNome] = useState<string>("Torneo");
  const [matches, setMatches] = useState<Partita[]>([]);
  const [squadreMap, setSquadreMap] = useState<Record<string, Squadra>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Se manca torneoId, redirect
    if (!torneoId) {
      console.warn("[Step6_Eliminazione] torneoId mancante, redirect a /tornei");
      navigate("/tornei");
      return;
    }

    console.log("[Step6_Eliminazione] loading data for torneoId", torneoId);
    setLoading(true);

    (async () => {
      // 1) carica nome torneo
      const { data: tData, error: tErr } = await supabase
        .from("tornei")
        .select("nome")
        .eq("id", torneoId)
        .single();
      if (tErr) console.error("[Step6_Eliminazione] errore fetch torneo", tErr);
      if (tData?.nome) setTorneoNome(tData.nome);

      // 2) carica partite eliminazione
      const { data: partiteData, error: pErr } = await supabase
        .from<Partita>("partite_torneo")
        .select(
          [
            "id",
            "squadra_casa_id",
            "squadra_ospite_id",
            "goal_casa",
            "goal_ospite",
            "rigori_vincitore",
            "stato",
            "data_ora",
            "next_match_id",
          ].join(",")
        )
        .eq("torneo_id", torneoId)
        .order("data_ora", { ascending: true });
      if (pErr) console.error("[Step6_Eliminazione] errore fetch partite", pErr);
      const ordered = [...(partiteData || [])].sort((a, b) => {
        const t1 = new Date(a.data_ora || "").getTime();
        const t2 = new Date(b.data_ora || "").getTime();
        return t1 !== t2 ? t1 - t2 : a.id.localeCompare(b.id);
      });
      console.log("[Step6_Eliminazione] partite caricate", ordered);
      setMatches(ordered);

      // 3) carica squadre coinvolte
      const squadreIds = Array.from(
        new Set(ordered.flatMap((m) => [m.squadra_casa_id, m.squadra_ospite_id]))
      );
      const { data: sData, error: sErr } = await supabase
        .from<Squadra>("squadre")
        .select("id, nome, logo_url")
        .in("id", squadreIds);
      if (sErr) console.error("[Step6_Eliminazione] errore fetch squadre", sErr);
      console.log("[Step6_Eliminazione] squadre caricate", sData);
      setSquadreMap(Object.fromEntries((sData || []).map((s) => [s.id, s])));

      setLoading(false);
    })();
  }, [torneoId, navigate]);

  // calcolo classifica eliminazione semplice
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
    const tbl: Record<string, Row> = {};

    matches.forEach((m) => {
      [m.squadra_casa_id, m.squadra_ospite_id].forEach((id) => {
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
      .filter((m) => m.stato === "Giocata")
      .forEach((m) => {
        const home = tbl[m.squadra_casa_id];
        const away = tbl[m.squadra_ospite_id];
        home.PG++; away.PG++;
        home.GF += m.goal_casa; home.GS += m.goal_ospite;
        away.GF += m.goal_ospite; away.GS += m.goal_casa;

        if (m.goal_casa > m.goal_ospite) {
          home.V++; away.P++; home.Pt += 3;
        } else if (m.goal_ospite > m.goal_casa) {
          away.V++; home.P++; away.Pt += 3;
        } else if (m.rigori_vincitore) {
          if (m.rigori_vincitore === m.squadra_casa_id) {
            home.V++; away.P++; home.Pt += 3;
          } else {
            away.V++; home.P++; away.Pt += 3;
          }
        } else {
          home.N++; away.N++; home.Pt++; away.Pt++;
        }
      });

    Object.values(tbl).forEach((r) => (r.DR = r.GF - r.GS));

    return Object.values(tbl).sort(
      (a, b) =>
        b.Pt - a.Pt ||
        b.DR - a.DR ||
        b.GF - a.GF ||
        a.nome.localeCompare(b.nome)
    );
  }, [matches, squadreMap]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) +
      " " +
      d.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const handleEdit = (matchId: string) => {
    navigate(
      `/tornei/nuovo/step6-eliminazione/${torneoId}/partita/${matchId}/edit`,
      { state: { torneoId } }
    );
  };

  const handlePrint = () => window.print();
  const handleSave = () => navigate("/tornei");
  const handleExit = () => navigate("/tornei");

  if (loading) {
    return <p className="text-center py-6">Caricamento in corso…</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 print:p-0 space-y-6">
      <h2 className="text-2xl font-bold text-center mb-4">{torneoNome}</h2>

      {/* Partite eliminazione */}
      <div className="space-y-3">
        {matches.map((m) => {
          const home = squadreMap[m.squadra_casa_id];
          const away = squadreMap[m.squadra_ospite_id];
          let score: React.ReactNode = <span className="text-sm font-medium">VS</span>;
          if (m.stato === "Giocata") {
            score = (
              <span className="text-sm font-medium">
                {m.goal_casa}-{m.goal_ospite}
              </span>
            );
          }
          return (
            <div
              key={m.id}
              onClick={() => handleEdit(m.id)}
              className="bg-white shadow rounded-lg p-2 cursor-pointer hover:bg-gray-50"
            >
              <div className="text-xs text-gray-500 mb-1 text-center">
                {formatDate(m.data_ora)}
              </div>
              <div className="flex items-center">
                <span className="w-1/3 text-left text-sm">{home?.nome}</span>
                <span className="w-1/3 text-center">{score}</span>
                <span className="w-1/3 text-right text-sm">{away?.nome}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Classifica */}
      <table className="w-full table-auto border-collapse text-center text-sm mb-6">
        <thead>
          <tr>
            <th className="px-2 py-1 border">Squadra</th>
            <th className="px-2 py-1 border">PG</th>
            <th className="px-2 py-1 border">V</th>
            <th className="px-2 py-1 border">N</th>
            <th className="px-2 py-1 border">P</th>
            <th className="px-2 py-1 border">GF</th>
            <th className="px-2 py-1 border">GS</th>
            <th className="px-2 py-1 border">DR</th>
            <th className="px-2 py-1 border">Pt</th>
          </tr>
        </thead>
        <tbody>
          {classifica.map((r) => (
            <tr key={r.id}>
              <td className="px-2 py-1 border flex items-center space-x-2">
                {r.logo_url && (
                  <img src={r.logo_url} alt="" className="w-4 h-4 rounded-full" />
                )}
                <span>{r.nome}</span>
              </td>
              <td className="px-2 py-1 border">{r.PG}</td>
              <td className="px-2 py-1 border">{r.V}</td>
              <td className="px-2 py-1 border">{r.N}</td>
              <td className="px-2 py-1 border">{r.P}</td>
              <td className="px-2 py-1 border">{r.GF}</td>
              <td className="px-2 py-1 border">{r.GS}</td>
              <td className="px-2 py-1 border">{r.DR}</td>
              <td className="px-2 py-1 border">{r.Pt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pulsanti */}
      <div className="flex justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Indietro
        </button>
        <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Stampa
        </button>
        <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Salva ed Esci
        </button>
      </div>
    </div>
  );
}
