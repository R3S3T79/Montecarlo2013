// src/pages/tornei/NuovoTorneo/Step6_FaseGironi.tsx
// Data creazione chat: 29/07/2025

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { UserRole } from "../../../lib/roles";

interface Squadra {
  id: string;
  nome: string;
  logo_url?: string;
}

interface Partita {
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
}

interface Fase {
  id: string;
  tipo_fase: string;
  fase_numerica?: number;
  formula_tipo?: string;
}

export default function Step6_FaseGironi() {
  const { torneoId: paramId } = useParams<{ torneoId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();

  const role =
    (authUser?.user_metadata?.role ?? authUser?.app_metadata?.role) as UserRole ||
    UserRole.Authenticated;
  const canEdit = role === UserRole.Admin || role === UserRole.Creator;

  const torneoId =
    (location.state as { torneoId?: string })?.torneoId || paramId;

  const [groupPhaseId, setGroupPhaseId] = useState<string | null>(null);
  const [partite, setPartite] = useState<Partita[]>([]);
  const [torneoNome, setTorneoNome] = useState<string>("Fase a Gironi");
  const [loading, setLoading] = useState<boolean>(true);
  const [savingFormula, setSavingFormula] = useState(false);
  const [formulaType, setFormulaType] = useState<"eliminazione" | "gironi">(
    "eliminazione"
  );

  // 1) fase gironi
  useEffect(() => {
    if (!torneoId) return;
    supabase
      .from<Fase>("fasi_torneo")
      .select("id,tipo_fase")
      .eq("torneo_id", torneoId)
      .in("tipo_fase", ["multi_gironi", "gironi"])
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("Errore fetch fase gironi:", error);
        else setGroupPhaseId(data?.id ?? null);
      });
  }, [torneoId]);

  // 2) nome torneo
  useEffect(() => {
    if (!torneoId) return;
    supabase
      .from("tornei")
      .select("nome_torneo")
      .eq("id", torneoId)
      .single()
      .then(({ data, error }) => {
        if (data) setTorneoNome(data.nome_torneo);
        if (error) console.error("Errore fetch nome torneo:", error);
      });
  }, [torneoId]);

  // 3) partite
  useEffect(() => {
    if (!torneoId || !groupPhaseId) return;
    setLoading(true);
    supabase
      .from<Partita>("tornei_fasegironi")
      .select(`
        id,girone,match_number,
        gol_casa,gol_ospite,rigori_vincitore,
        data_match,giocata,
        squadra_casa(id,nome,logo_url),
        squadra_ospite(id,nome,logo_url)
      `)
      .eq("torneo_id", torneoId)
      .eq("fase_id", groupPhaseId)
      .order("girone", { ascending: true })
      .order("match_number", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Errore fetch partite:", error);
        else setPartite(data || []);
        setLoading(false);
      });
  }, [torneoId, groupPhaseId]);

  // raggruppo per girone
  const partitePerGirone = useMemo(() => {
    const map: Record<string, Partita[]> = {};
    partite.forEach((p) => {
      if (!map[p.girone]) map[p.girone] = [];
      map[p.girone].push(p);
    });
    return map;
  }, [partite]);

  // classifica per girone
  const classificaPerGirone = useMemo(() => {
    const out: Record<string, any[]> = {};
    Object.entries(partitePerGirone).forEach(([girone, matches]) => {
      const stats: Record<string, any> = {};
      matches.forEach((m) => {
        const h = m.squadra_casa!, a = m.squadra_ospite!;
        [h, a].forEach((s) => {
          if (!stats[s.id]) {
            stats[s.id] = {
              id: s.id,
              nome: s.nome,
              logo_url: s.logo_url,
              PG: 0, V: 0, N: 0, P: 0, GF: 0, GS: 0, DR: 0, Pt: 0,
            };
          }
        });
        if (!m.giocata) return;
        const rh = stats[h.id], ra = stats[a.id];
        rh.PG++; ra.PG++;
        rh.GF += m.gol_casa!; rh.GS += m.gol_ospite!;
        ra.GF += m.gol_ospite!; ra.GS += m.gol_casa!;
        if (m.gol_casa! > m.gol_ospite!) {
          rh.V++; ra.P++; rh.Pt += 3;
        } else if (m.gol_ospite! > m.gol_casa!) {
          ra.V++; rh.P++; ra.Pt += 3;
        } else if (m.rigori_vincitore) {
          (m.rigori_vincitore === h.id ? rh : ra).Pt += 3;
          (m.rigori_vincitore === h.id ? rh : ra).V++;
          (m.rigori_vincitore === h.id ? ra : rh).P++;
        } else {
          rh.N++; ra.N++; rh.Pt++; ra.Pt++;
        }
      });
      Object.values(stats).forEach((r: any) => (r.DR = r.GF - r.GS));
      out[girone] = Object.values(stats).sort(
        (a: any, b: any) =>
          b.Pt - a.Pt || b.DR - a.DR || b.GF - a.GF || a.nome.localeCompare(b.nome)
      );
    });
    return out;
  }, [partitePerGirone]);

  const handleEditPartita = (matchId: string) => {
    if (!torneoId || !canEdit) return;
    navigate(`/tornei/nuovo/step6-fasegironi/${torneoId}/partita/${matchId}/edit`, {
      state: { torneoId },
    });
  };

  // ✅ Fix: gli utenti "user" possono avanzare solo navigando (senza modifiche)
  const handleNextPhase = async () => {
    if (!torneoId) return;

    // READ-ONLY: nessuna scrittura, solo decide dove andare
    if (!canEdit) {
      // se esiste una fase eliminazione registrata → step8, altrimenti step7
      const { data: elim, error: elimErr } = await supabase
        .from("fasi_torneo")
        .select("id")
        .eq("torneo_id", torneoId)
        .eq("tipo_fase", "eliminazione")
        .maybeSingle();

      if (!elimErr && elim?.id) {
        navigate(`/tornei/nuovo/step8-fasegironi/${torneoId}`);
      } else {
        navigate(`/tornei/nuovo/step7-fasegironi/${torneoId}`, {
          state: { formulaType: "gironi" as const },
        });
      }
      return;
    }

    // EDITOR/ADMIN: logica esistente
    setSavingFormula(true);

    const { data: existing } = await supabase
      .from("fasi_torneo")
      .select("id")
      .eq("torneo_id", torneoId)
      .eq("tipo_fase", "eliminazione")
      .maybeSingle();

    let elimPhaseId: string;
    const payload = {
      torneo_id: torneoId,
      tipo_fase: "eliminazione",
      formula_tipo: formulaType,
    };

    if (existing?.id) {
      await supabase.from("fasi_torneo").update(payload).eq("id", existing.id);
      elimPhaseId = existing.id;
    } else {
      const { data: ins } = await supabase
        .from("fasi_torneo")
        .insert(payload)
        .select("id")
        .single();
      elimPhaseId = ins!.id;
    }

    if (formulaType === "eliminazione") {
      const byGroup: Record<string, { id: string; pts: number }[]> = {};
      partite.forEach((m) => {
        const gir = m.girone;
        byGroup[gir] = byGroup[gir] || [];
        const cid = m.squadra_casa?.id;
        const oid = m.squadra_ospite?.id;
        [cid, oid].forEach((id) => {
          if (!id) return;
          if (!byGroup[gir].some((x) => x.id === id)) byGroup[gir].push({ id, pts: 0 });
        });
        if (!m.giocata || !cid || !oid) return;
        if (m.gol_casa! > m.gol_ospite!) byGroup[gir].find(x => x.id === cid)!.pts += 3;
        else if (m.gol_ospite! > m.gol_casa!) byGroup[gir].find(x => x.id === oid)!.pts += 3;
        else if (m.rigori_vincitore) byGroup[gir].find(x => x.id === m.rigori_vincitore)!.pts += 3;
        else {
          byGroup[gir].find(x => x.id === cid)!.pts += 1;
          byGroup[gir].find(x => x.id === oid)!.pts += 1;
        }
      });

      const groups = Object.values(byGroup);
      if (groups.length < 2 || !groups[0]?.length || !groups[1]?.length) {
        alert("Gironi incompleti per generare gli scontri diretti.");
        setSavingFormula(false);
        return;
      }

      const topA = [...groups[0]].sort((a, b) => b.pts - a.pts).slice(0, 3);
      const topB = [...groups[1]].sort((a, b) => b.pts - a.pts).slice(0, 3);
      const pairCount = Math.min(topA.length, topB.length);
      if (pairCount === 0) {
        alert("Nessuna squadra qualificata.");
        setSavingFormula(false);
        return;
      }

      const toInsert = Array.from({ length: pairCount }, (_, i) => ({
        torneo_id: torneoId,
        fase_id: elimPhaseId,
        girone: "eliminazione",
        match_number: i + 1,
        squadra_casa: topA[i].id,
        squadra_ospite: topB[i].id,
      }));
      await supabase.from("tornei_fasegironi").upsert(toInsert, {
        onConflict: "torneo_id,fase_id,girone,match_number",
        ignoreDuplicates: true,
      });

      setSavingFormula(false);
      navigate(`/tornei/nuovo/step8-fasegironi/${torneoId}`);
      return;
    }

    setSavingFormula(false);
    navigate(`/tornei/nuovo/step7-fasegironi/${torneoId}`, {
      state: { formulaType },
    });
  };

  if (authLoading || loading) {
    return <p className="text-center text-white py-6">Caricamento in corso…</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 print:p-0">
      {/* ⛔️ Select visibile solo a chi può editare */}
      {canEdit && (
        <div className="flex justify-center items-center gap-2 print:hidden no-print">
          <label className="text-white font-medium">Formula fase successiva:</label>
          <select
            className="border rounded px-2 py-1"
            value={formulaType}
            onChange={(e) =>
              setFormulaType(e.currentTarget.value as "eliminazione" | "gironi")
            }
          >
            <option value="eliminazione">Scontri Diretti</option>
            <option value="gironi">Seconda Fase a Gironi</option>
          </select>
        </div>
      )}

      {Object.entries(partitePerGirone).map(([girone, matches]) => (
        <div key={girone} className="space-y-4 avoid-break">
          <h3 className="text-lg font-semibold text-center text-white print:text-black">
  {girone}
</h3>

<table className="bg-white/90 w-full table-fixed border-collapse text-sm mb-4 print:mb-6">
  <colgroup>
    <col style={{ width: "42%" }} />
    <col style={{ width: "16%" }} />
    <col style={{ width: "42%" }} />
  </colgroup>
  <tbody>
    {matches.map((m) => (
      <tr
        key={m.id}
        onClick={canEdit ? () => handleEditPartita(m.id) : undefined}
        className={canEdit ? "hover:bg-gray-100 cursor-pointer print:cursor-auto" : ""}
      >
        {/* Casa */}
        <td className="border border-grey-200 px-2 py-1">
          <div className="flex items-center gap-2 min-w-0">
            {m.squadra_casa?.logo_url && (
              <img
                src={m.squadra_casa.logo_url}
                alt={m.squadra_casa.nome}
                className="w-4 h-4 rounded-full flex-none"
              />
            )}
            <span className="truncate">{m.squadra_casa?.nome}</span>
          </div>
        </td>

        {/* Risultato */}
        <td className="border border-grey-200 px-2 py-1 text-center font-medium whitespace-nowrap">
          {m.giocata ? `${m.gol_casa} – ${m.gol_ospite}` : "VS"}
        </td>

        {/* Ospite */}
        <td className="border border-grey-200 px-2 py-1">
          <div className="flex items-center gap-2 justify-end min-w-0">
            <span className="truncate">{m.squadra_ospite?.nome}</span>
            {m.squadra_ospite?.logo_url && (
              <img
                src={m.squadra_ospite.logo_url}
                alt={m.squadra_ospite.nome}
                className="w-4 h-4 rounded-full flex-none"
              />
            )}
          </div>
        </td>
      </tr>
    ))}
  </tbody>
</table>

          {/* CLASSIFICA */}
          <table className="w-full table-fixed border-collapse text-center text-sm mb-6 bg-white/85">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-1 text-left" style={{ width: "52%" }}>
                  Squadra
                </th>
                <th className="border border-grey-200 px-2 py-1">PG</th>
                <th className="border border-grey-200 px-2 py-1">V</th>
                <th className="border border-grey-200 px-2 py-1">N</th>
                <th className="border border-grey-200 px-2 py-1">P</th>
                <th className="border border-grey-200 px-2 py-1">GF</th>
                <th className="border border-grey-200 px-2 py-1">GS</th>
                <th className="border border-grey-200 px-2 py-1">DR</th>
                <th className="border border-grey-200 px-2 py-1">Pt</th>
              </tr>
            </thead>
            <tbody>
              {classificaPerGirone[girone].map((r) => (
                <tr key={r.id} className="align-middle">
                  <td className="border px-3 py-1 text-left" style={{ width: "52%" }}>
                    <div className="td-team">
                      {r.logo_url && (
                        <img
                          src={r.logo_url}
                          alt={r.nome}
                          className="w-4 h-4 rounded-full flex-none"
                        />
                      )}
                      <span className="name">{r.nome}</span>
                    </div>
                  </td>
                  <td className="border border-grey-200 px-2 py-1">{r.PG}</td>
                  <td className="border border-grey-200 px-2 py-1">{r.V}</td>
                  <td className="border border-grey-200 px-2 py-1">{r.N}</td>
                  <td className="border border-grey-200 px-2 py-1">{r.P}</td>
                  <td className="border border-grey-200 px-2 py-1">{r.GF}</td>
                  <td className="border border-grey-200 px-2 py-1">{r.GS}</td>
                  <td className="border border-grey-200 px-2 py-1">{r.DR}</td>
                  <td className="border border-grey-200 px-2 py-1">{r.Pt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Pulsanti */}
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
          onClick={handleNextPhase}
          disabled={savingFormula}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {savingFormula ? "Salvataggio…" : "Prossima Fase"}
        </button>
      </div>
    </div>
  );
}
