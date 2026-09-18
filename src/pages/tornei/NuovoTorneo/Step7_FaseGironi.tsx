// src/pages/tornei/NuovoTorneo/Step7_FaseGironi.tsx
// Data creazione chat: 29/07/2025

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { UserRole } from "../../../lib/roles";
import { useScrollRestoration } from "../../../Hooks/useScrollRestoration";


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
  const [role, setRole] = useState<UserRole>(UserRole.Authenticated);

  useEffect(() => {
    const caricaRuolo = async () => {
      if (!authUser?.id) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (!error && data?.role) {
        setRole(data.role as UserRole);
      }
    };

    caricaRuolo();
  }, [authUser?.id]);

  const canEdit = role === UserRole.Admin || role === UserRole.Creator;


 
 

  const [torneoNome, setTorneoNome] = useState<string>("");
  const [groupPhaseId, setGroupPhaseId] = useState<string | null>(null);
  const [secondPhaseId, setSecondPhaseId] = useState<string | null>(null);
  const [partite, setPartite] = useState<PartitaRaw[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);

   const pageReady = !authLoading && !loading;
  useScrollRestoration(pageReady, `scroll-step7-${torneoId}`);

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
      .from("fasi_torneo")
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

// =========================
// ✅ CREA SECONDA FASE (raggruppamento per posizione: 1°, 2°, 3°, 4°)
// =========================
const creaSecondaFase = useCallback(async () => {
  if (!canEdit || creating || !groupPhaseId || secondPhaseId) return;
  setCreating(true);

  // Calcola numero di fase successiva
  const { data: allFasi } = await supabase
    .from("fasi_torneo")
    .select("fase_numerica")
    .eq("torneo_id", torneoId);
  const nextNum =
    (allFasi?.reduce((mx, f) => Math.max(mx, f.fase_numerica || 0), 0) ?? 0) + 1;

  // Crea nuova fase
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

  const nuovaFaseId = nf.id;

  // Recupera partite della fase precedente
  const { data: raw } = await supabase
    .from("tornei_fasegironi")
    .select(`
      girone, giocata,
      squadra_casa(id,nome),
      squadra_ospite(id,nome),
      gol_casa,gol_ospite,rigori_vincitore
    `)
    .eq("torneo_id", torneoId)
    .eq("fase_id", groupPhaseId);

  if (!raw || raw.length === 0) {
    console.error("Nessuna partita trovata nella fase precedente");
    setCreating(false);
    return;
  }

  // Calcola classifiche per ogni girone
  const statsByGroup: Record<string, Record<string, any>> = {};
  raw.forEach((m) => {
    const gir = m.girone;
    if (!statsByGroup[gir]) statsByGroup[gir] = {};
    const h = Array.isArray(m.squadra_casa) ? m.squadra_casa[0] : m.squadra_casa;
const a = Array.isArray(m.squadra_ospite) ? m.squadra_ospite[0] : m.squadra_ospite;
    [h, a].forEach((s) => {
      if (!statsByGroup[gir][s.id]) {
        statsByGroup[gir][s.id] = { id: s.id, nome: s.nome, GF: 0, GS: 0, Pt: 0 };
      }
    });
    if (!m.giocata) return;
    const rh = statsByGroup[gir][h.id];
    const ra = statsByGroup[gir][a.id];
    rh.GF += m.gol_casa ?? 0;
    rh.GS += m.gol_ospite ?? 0;
    ra.GF += m.gol_ospite ?? 0;
    ra.GS += m.gol_casa ?? 0;
    if (m.gol_casa! > m.gol_ospite!) rh.Pt += 3;
    else if (m.gol_ospite! > m.gol_casa!) ra.Pt += 3;
    else if (m.rigori_vincitore) {
      statsByGroup[gir][m.rigori_vincitore].Pt += 3;
    } else {
      rh.Pt += 1;
      ra.Pt += 1;
    }
  });

  // Ordina squadre in ciascun girone per punti
  const classificheOrdinate = Object.fromEntries(
    Object.entries(statsByGroup).map(([gir, val]) => [
      gir,
      Object.values(val).sort(
        (a: any, b: any) =>
          b.Pt - a.Pt || b.GF - a.GF || a.nome.localeCompare(b.nome)
      ),
    ])
  );

  const gironi = Object.keys(classificheOrdinate).sort();

  // Controllo: servono almeno 2 gironi
  if (gironi.length < 2) {
    alert("Servono almeno 2 gironi per generare la seconda fase.");
    setCreating(false);
    return;
  }

  // Calcola numero massimo di posizioni (es. 4 se ci sono 4 squadre per girone)
  const maxPos = Math.max(...Object.values(classificheOrdinate).map((v) => v.length));

  // Crea nuovi gironi in base alla posizione
  const toInsert: any[] = [];
  for (let pos = 0; pos < maxPos; pos++) {
    const squadrePosizione: any[] = [];
    gironi.forEach((g) => {
      const squadra = classificheOrdinate[g][pos];
      if (squadra) squadrePosizione.push(squadra);
    });

    // Se meno di 2 squadre → ignora
    if (squadrePosizione.length < 2) continue;

    // Nome del nuovo girone
    const gironeLabel = `Girone ${String.fromCharCode(65 + pos)}`; // A, B, C, D…

    // Crea accoppiamenti round-robin tra le squadre di questa posizione
    for (let i = 0; i < squadrePosizione.length; i++) {
      for (let j = i + 1; j < squadrePosizione.length; j++) {
        toInsert.push({
          torneo_id: torneoId,
          fase_id: nuovaFaseId,
          girone: gironeLabel,
          match_number: i * 10 + j,
          squadra_casa: squadrePosizione[i].id,
          squadra_ospite: squadrePosizione[j].id,
          gol_casa: 0,
          gol_ospite: 0,
          giocata: false,
          rigori_vincitore: null,
        });
      }
    }
  }

  if (toInsert.length === 0) {
    alert("Nessun accoppiamento valido generato.");
    setCreating(false);
    return;
  }

  await supabase.from("tornei_fasegironi").insert(toInsert);
  console.log("✅ Seconda fase generata con", toInsert.length, "partite");

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
      .from("tornei_fasegironi")
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
        else setPartite(
  (data || []).map((p) => ({
    ...p,
    squadra_casa: Array.isArray(p.squadra_casa) ? p.squadra_casa[0] : p.squadra_casa,
    squadra_ospite: Array.isArray(p.squadra_ospite) ? p.squadra_ospite[0] : p.squadra_ospite,
  }))
);
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

  const classificaGenerale = useMemo(() => {
  const list: { id: string; nome: string; logo_url: string | null; pos: number }[] = [];

  // Filtra solo i gironi che hanno almeno una partita giocata
  const gironiValidi = Object.entries(classificaPerGirone)
    .filter(([girone, squadre]) => {
      // Cerca almeno una partita giocata in questo girone
      return partite.some(p => p.girone === girone && p.giocata);
    })
    .map(([girone]) => girone)
    .sort();

  // Posizione progressiva
  let posCounter = 1;

  gironiValidi.forEach(g => {
    (classificaPerGirone[g] || []).forEach(t => {
      list.push({
        id: t.id,
        nome: t.nome,
        logo_url: t.logo_url,
        pos: posCounter++,
      });
    });
  });

  return list;
}, [classificaPerGirone, partite]);


  if (authLoading || loading) {
    return <p className="text-center text-white py-6">Caricamento in corso…</p>;
  }

  return (
  <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border print:p-0 print:pt-6">
    <div className="w-full max-w-3xl mx-auto space-y-4">

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
                Seconda fase a gironi
              </p>
            </div>
          </div>
        </div>
      </div>


    {Object.entries(classificaPerGirone).map(([girone, squadre]) => (
  <div
    key={girone}
    className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm print:break-inside-avoid"
  >
        <div className="border-t-4 border-red-500 px-4 py-3 bg-red-50/70">
          <h3 className="text-base font-bold text-gray-900">
            {girone}
          </h3>
        </div>

        <div className="p-3 space-y-2">

        {/* Box Partite */}
        {partite
  .filter(m => m.girone === girone)
  .sort((a, b) => a.match_number - b.match_number)
  .map(m => (
    <div
  key={m.id}
  className={`grid grid-cols-[44%_12%_44%] items-center rounded-lg border border-gray-200 bg-white px-3 py-2 ${
    canEdit ? "cursor-pointer transition hover:border-red-300 hover:bg-red-50" : ""
  }`}
  style={{ lineHeight: "1.1" }}
  onClick={() => canEdit && navigate(`/modifica-partita-fasegironi/${m.id}`)}
>

      {/* Casa - allineata a sinistra */}
      <div className="text-left truncate font-medium text-gray-800">
        {m.squadra_casa!.nome}
      </div>
      {/* Risultato - centrato orizzontalmente e verticalmente */}
      <div className="text-center font-bold text-montecarlo-secondary">
        {m.giocata ? `${m.gol_casa} – ${m.gol_ospite}` : "VS"}
      </div>
      {/* Ospite - allineata a destra */}
      <div className="text-right truncate font-medium text-gray-800">
        {m.squadra_ospite!.nome}
      </div>
    </div>
))}

        {/* Tabella Classifica Girone */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-center text-sm bg-white">
        <colgroup>
  <col style={{ width: "60%" }} />   {/* Colonna nomi squadre più larga */}
  <col style={{ width: "5%" }} />
  <col style={{ width: "5%" }} />
  <col style={{ width: "5%" }} />
  <col style={{ width: "5%" }} />
  <col style={{ width: "5%" }} />
  <col style={{ width: "5%" }} />
  <col style={{ width: "5%" }} />
  <col style={{ width: "5%" }} />
</colgroup>


          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="border-b border-r px-3 py-2 text-left">Squadra</th>
              <th className="border-b border-r px-2 py-2">G</th>
              <th className="border-b border-r px-2 py-2">V</th>
              <th className="border-b border-r px-2 py-2">N</th>
              <th className="border-b border-r px-2 py-2">P</th>
              <th className="border-b border-r px-2 py-2">F</th>
              <th className="border-b border-r px-2 py-2">S</th>
              <th className="border-b border-r px-2 py-2">D</th>
              <th className="border-b px-2 py-2 text-montecarlo-secondary">P</th>
            </tr>
          </thead>
          <tbody>
            {squadre.map((r: any) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-b-0">
                <td className="border-r px-3 py-2 text-left">
                  <div className="flex items-center space-x-2">
                    {r.logo_url && (
                      <img
                        src={r.logo_url}
                        alt={r.nome}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="font-medium text-gray-800">{r.nome}</span>
                  </div>
                </td>
                <td className="border-r px-2 py-2">{r.PG}</td>
                <td className="border-r px-2 py-2">{r.V}</td>
                <td className="border-r px-2 py-2">{r.N}</td>
                <td className="border-r px-2 py-2">{r.P}</td>
                <td className="border-r px-2 py-2">{r.GF}</td>
                <td className="border-r px-2 py-2">{r.GS}</td>
                <td className="border-r px-2 py-2">{r.DR}</td>
                <td className="px-2 py-2 font-bold text-montecarlo-secondary">{r.Pt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        </div>
      </div>
    ))}

    {/* CLASSIFICA GENERALE - mostrata solo se almeno una partita è giocata */}
{partite.some(p => p.giocata) && (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm print:break-inside-avoid">
    <div className="border-t-4 border-red-500 px-4 py-3 bg-red-50/70">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏅</span>
        <h3 className="text-base font-bold text-gray-900">
          Classifica Generale
        </h3>
      </div>
    </div>

    <div className="p-3">
    <div className="overflow-hidden rounded-lg border border-gray-200">
    <table className="w-full table-auto border-collapse text-center text-sm bg-white">
      <colgroup>
        <col style={{ width: "10%" }} />
        <col style={{ width: "90%" }} />
      </colgroup>
      <thead>
        <tr className="bg-gray-50 text-gray-600">
          <th className="border-b border-r px-3 py-2">Pos</th>
          <th className="border-b px-3 py-2 text-left">Squadra</th>
        </tr>
      </thead>
      <tbody>
        {classificaGenerale.map(item => (
          <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
            <td className="border-r px-3 py-2 font-bold text-montecarlo-secondary">{item.pos}</td>
            <td className="px-3 py-2 text-left">
              <div className="flex items-center space-x-2">
                {item.logo_url && (
                  <img
                    src={item.logo_url}
                    alt={item.nome}
                    className="w-5 h-5 rounded-full"
                  />
                )}
                <span className="font-medium text-gray-800">{item.nome}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
    </div>
  </div>
)}


    {/* PULSANTI */}
    <div
  className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:hidden"
  style={{
    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
  }}
>
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
      <button
        onClick={() => navigate("/tornei")}
        className="w-full bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:opacity-90 transition"
      >
        Salva ed Esci
      </button>
    </div>
  </div>
  </div>
);

}