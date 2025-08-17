// src/pages/tornei/NuovoTorneo/Step7_FaseGironi.tsx
// Data creazione chat: 29/07/2025

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { UserRole } from "../../../lib/roles";

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface PartitaRaw {
  id: string;
  girone: string;
  match_number: number;
  gol_casa: number | null;
  gol_ospite: number | null;
  rigori_vincitore: string | null;
  squadra_casa: Squadra | null;
  squadra_ospite: Squadra | null;
  data_match: string | null;
  giocata: boolean;
  fase_id: string | null;
}

interface Fase {
  id: string;
  tipo_fase: string;
}

export default function Step7_FaseGironi() {
  const { torneoId } = useParams<{ torneoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, loading: authLoading } = useAuth();

  const role =
    (authUser?.user_metadata?.role ?? authUser?.app_metadata?.role) as UserRole ||
    UserRole.Authenticated;
  const canEdit = role === UserRole.Admin || role === UserRole.Creator;

  const [torneoNome, setTorneoNome] = useState<string>("");
  const [groupPhaseId, setGroupPhaseId] = useState<string | null>(null);
  const [secondPhaseId, setSecondPhaseId] = useState<string | null>(null);
  const [partite, setPartite] = useState<PartitaRaw[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);

  // 1) Nome torneo
  useEffect(() => {
    if (!torneoId) return;
    supabase
      .from("tornei")
      .select("nome_torneo")
      .eq("id", torneoId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setTorneoNome(data.nome_torneo);
      });
  }, [torneoId]);

  // 2) Carica fasi
  useEffect(() => {
    if (!torneoId) return;
    supabase
      .from<Fase>("fasi_torneo")
      .select("id,tipo_fase")
      .eq("torneo_id", torneoId)
      .then(({ data, error }) => {
        if (error || !data) return;
        const init =
          data.find(f => f.tipo_fase === "multi_gironi") ||
          data.find(f => f.tipo_fase === "gironi");
        setGroupPhaseId(init?.id ?? null);
        const second = data.find(
          f => f.tipo_fase === "gironi" && init && f.id !== init.id
        );
        if (second) setSecondPhaseId(second.id);
      });
  }, [torneoId]);

  // 3) Crea Seconda Fase (una sola volta)
  const creaSecondaFase = useCallback(async () => {
    if (!canEdit || creating || !groupPhaseId || secondPhaseId) return;
    setCreating(true);

    // calcolo prossimo numero di fase
    const { data: allFasi } = await supabase
      .from("fasi_torneo")
      .select("fase_numerica")
      .eq("torneo_id", torneoId);
    const nextNum =
      (allFasi?.reduce((mx, f) => Math.max(mx, f.fase_numerica || 0), 0) ?? 0) +
      1;

    // inserimento fase
    const { data: nf, error: fe } = await supabase
      .from("fasi_torneo")
      .insert({
        torneo_id: torneoId,
        tipo_fase: "gironi",
        fase_numerica: nextNum,
      })
      .select("id")
      .single();
    if (fe || !nf) {
      console.error("Errore creazione fase:", fe);
      setCreating(false);
      return;
    }
    setSecondPhaseId(nf.id);

    // preleva risultati Fase 1
    const { data: raw } = await supabase
      .from<PartitaRaw>("tornei_fasegironi")
      .select(
        "girone,giocata,squadra_casa(id,nome),squadra_ospite(id,nome),gol_casa,gol_ospite,rigori_vincitore"
      )
      .eq("torneo_id", torneoId)
      .eq("fase_id", groupPhaseId);

    // calcolo primi/secondi/terzi
    const byGroup: Record<string, Squadra[]> = {};
    (raw || []).forEach(m => {
      if (!m.giocata) return;
      const h = m.squadra_casa!, a = m.squadra_ospite!;
      byGroup[m.girone] = byGroup[m.girone] || [];
      [h, a].forEach(s => {
        if (!byGroup[m.girone].find(x => x.id === s.id)) {
          byGroup[m.girone].push(s);
        }
      });
    });
    const primis = Object.values(byGroup).map(arr => arr[0]).filter(Boolean);
    const secondis = Object.values(byGroup).map(arr => arr[1]).filter(Boolean);
    const ters = Object.values(byGroup).map(arr => arr[2]).filter(Boolean);

    // costruisco calendario round-robin
    const nuoviGironi = [
      { label: "Girone A", squadre: primis },
      { label: "Girone B", squadre: secondis },
      { label: "Girone C", squadre: ters },
    ];
    const toInsert = nuoviGironi.flatMap(g => {
      const squads = g.squadre.filter((s): s is Squadra => !!s);
      return squads.flatMap((h, i) =>
        squads.slice(i + 1).map((a, j) => ({
          torneo_id: torneoId,
          fase_id: nf.id,
          girone: g.label,
          match_number: i * squads.length + j + 1,
          squadra_casa: h.id,
          squadra_ospite: a.id,
        }))
      );
    });

    await supabase.from("tornei_fasegironi").insert(toInsert);
    setCreating(false);
  }, [canEdit, creating, groupPhaseId, secondPhaseId, torneoId]);

  useEffect(() => {
    if (groupPhaseId && !secondPhaseId && !authLoading && !creating) {
      creaSecondaFase();
    }
  }, [groupPhaseId, secondPhaseId, authLoading, creating, creaSecondaFase]);

  // 4) Fetch partite fase corrente
  useEffect(() => {
    const faseId = secondPhaseId ?? groupPhaseId;
    if (!torneoId || !faseId) return;
    setLoading(true);
    supabase
      .from<PartitaRaw>("tornei_fasegironi")
      .select(
        `id,girone,match_number,
         gol_casa,gol_ospite,rigori_vincitore,
         data_match,giocata,fase_id,
         squadra_casa(id,nome,logo_url),
         squadra_ospite(id,nome,logo_url)`
      )
      .eq("torneo_id", torneoId)
      .eq("fase_id", faseId)
      .order("girone", { ascending: true })
      .order("match_number", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setPartite(data || []);
        setLoading(false);
      });
  }, [torneoId, groupPhaseId, secondPhaseId, location.key]);

  // 5) Classifica per girone Fase 2
  const classificaPerGirone = useMemo(() => {
    const byG: Record<string, any[]> = {};
    partite.forEach(m => {
      const h = m.squadra_casa!, a = m.squadra_ospite!;
      byG[m.girone] = byG[m.girone] || [];
      [h, a].forEach(s => {
        if (!byG[m.girone].find(x => x.id === s.id)) {
          byG[m.girone].push({ ...s, PG: 0, V: 0, N: 0, P: 0, GF: 0, GS: 0, DR: 0, Pt: 0 });
        }
      });
      if (!m.giocata) return;
      const rh = byG[m.girone].find(r => r.id === h.id)!;
      const ra = byG[m.girone].find(r => r.id === a.id)!;
      rh.PG++; ra.PG++;
      rh.GF += m.gol_casa!; rh.GS += m.gol_ospite!;
      ra.GF += m.gol_ospite!; ra.GS += m.gol_casa!;
      if (m.gol_casa! > m.gol_ospite!) {
        rh.V++; ra.P++; rh.Pt += 3;
      } else if (m.gol_ospite! > m.gol_casa!) {
        ra.V++; rh.P++; ra.Pt += 3;
      } else if (m.rigori_vincitore) {
        if (m.rigori_vincitore === h.id) {
          rh.V++; ra.P++; rh.Pt += 3;
        } else {
          ra.V++; rh.P++; ra.Pt += 3;
        }
      } else {
        rh.N++; ra.N++; rh.Pt++; ra.Pt++;
      }
    });
    Object.values(byG).forEach(arr => {
      arr.forEach(r => (r.DR = r.GF - r.GS));
      arr.sort((a, b) => b.Pt - a.Pt || b.DR - a.DR || b.GF - a.GF);
    });
    return byG;
  }, [partite]);

  // 6) Classifica generale
  const classificaGenerale = useMemo(() => {
    const order = ["Girone A", "Girone B", "Girone C"];
    const offset: Record<string, number> = { "Girone A": 0, "Girone B": 3, "Girone C": 6 };
    const list: { id: string; nome: string; logo_url: string | null; pos: number }[] = [];
    order.forEach(g => {
      (classificaPerGirone[g] || []).forEach((t, i) => {
        list.push({ id: t.id, nome: t.nome, logo_url: t.logo_url, pos: offset[g] + i + 1 });
      });
    });
    return list.sort((a, b) => a.pos - b.pos);
  }, [classificaPerGirone]);

  if (authLoading || loading) {
    return <p className="text-center py-6">Caricamento in corso…</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 print:p-0">

      {Object.entries(classificaPerGirone).map(([girone, squadre]) => (
        <div key={girone} className="space-y-4">
          <h3 className="text-lg font-semibold text-center">{girone}</h3>

          {/* MATCH: più ombreggiate */}
          {partite
            .filter(m => m.girone === girone)
            .sort((a, b) => a.match_number - b.match_number)
            .map(m => (
              <div
                key={m.id}
                className="grid grid-cols-3 items-center bg-gray-100 shadow rounded-lg p-2 mb-1 hover:bg-gray-200 cursor-pointer"
                onClick={() => canEdit && navigate(`/modifica-partita-fasegironi/${m.id}`)}
              >
                <span className="text-sm truncate">{m.squadra_casa!.nome}</span>
                {m.giocata ? (
                  <span className="text-sm font-medium text-center">
                    {m.gol_casa} – {m.gol_ospite}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-center text-gray-400">VS</span>
                )}
                <span className="text-sm text-right truncate">{m.squadra_ospite!.nome}</span>
              </div>
            ))}

          {/* TABELLA PUNTI senza "Pos", con logo */}
          <table className="w-full table-auto border-collapse text-center text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-1">Squadra</th>
                <th className="border px-3 py-1">PG</th>
                <th className="border px-3 py-1">V</th>
                <th className="border px-3 py-1">N</th>
                <th className="border px-3 py-1">P</th>
                <th className="border px-3 py-1">GF</th>
                <th className="border px-3 py-1">GS</th>
                <th className="border px-3 py-1">DR</th>
                <th className="border px-3 py-1">Pt</th>
              </tr>
            </thead>
            <tbody>
              {squadre.map((r: any) => (
                <tr key={r.id}>
                  <td className="border px-3 py-1 text-left flex items-center space-x-2">
                    {r.logo_url && (
                      <img src={r.logo_url} alt={r.nome} className="w-5 h-5 rounded-full" />
                    )}
                    <span>{r.nome}</span>
                  </td>
                  <td className="border px-3 py-1">{r.PG}</td>
                  <td className="border px-3 py-1">{r.V}</td>
                  <td className="border px-3 py-1">{r.N}</td>
                  <td className="border px-3 py-1">{r.P}</td>
                  <td className="border px-3 py-1">{r.GF}</td>
                  <td className="border px-3 py-1">{r.GS}</td>
                  <td className="border px-3 py-1">{r.DR}</td>
                  <td className="border px-3 py-1">{r.Pt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* CLASSIFICA GENERALE */}
      <div className="pt-4">
        <h3 className="text-xl font-semibold text-center mb-2">Classifica Generale</h3>
        <table className="w-full table-auto border-collapse text-center text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-1">Pos</th>
              <th className="border px-3 py-1">Squadra</th>
            </tr>
          </thead>
          <tbody>
            {classificaGenerale.map(item => (
              <tr key={item.id}>
                <td className="border px-3 py-1">{item.pos}</td>
                <td className="border px-3 py-1 text-left flex items-center space-x-2">
                  {item.logo_url && (
                    <img src={item.logo_url} alt={item.nome} className="w-5 h-5 rounded-full" />
                  )}
                  <span>{item.nome}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PULSANTI */}
      <div className="flex justify-between print:hidden space-x-2">
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
        <button
          onClick={() => navigate("/tornei")}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Salva ed Esci
        </button>
      </div>
    </div>
  );
}
