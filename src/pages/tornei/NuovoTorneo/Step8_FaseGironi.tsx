// src/pages/tornei/NuovoTorneo/Step8_FaseGironi.tsx
// Data revisione: 24/08/2025 — Box trasparenti, titoli bianchi fuori dai box

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  match_number: number;
  giocata: boolean;
  gol_casa: number | null;
  gol_ospite: number | null;
  rigori_vincitore: string | null;
  squadra_casa: Squadra | null;
  squadra_ospite: Squadra | null;
}

interface ClassificaEntry {
  squadra: Squadra;
  posizione: number;
}

export default function Step8_FaseGironi() {
  const { torneoId } = useParams<{ torneoId: string }>();
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();

  const role =
    (authUser?.user_metadata?.role ?? authUser?.app_metadata?.role) as UserRole;
  const canEdit = role === UserRole.Admin || role === UserRole.Creator;

  const [elimPhaseId, setElimPhaseId] = useState<string | null>(null);
  const [elimMatches, setElimMatches] = useState<PartitaRaw[]>([]);
  const [classifica, setClassifica] = useState<ClassificaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 1) fase eliminazione
  useEffect(() => {
    if (!torneoId) return;
    supabase
      .from<{ id: string }>("fasi_torneo")
      .select("id")
      .eq("torneo_id", torneoId)
      .eq("tipo_fase", "eliminazione")
      .single()
      .then(({ data }) => {
        if (data) setElimPhaseId(data.id);
      });
  }, [torneoId]);

  // 2) partite eliminazione
  useEffect(() => {
    if (!torneoId || !elimPhaseId) return;
    setLoading(true);
    supabase
      .from<PartitaRaw>("tornei_fasegironi")
      .select(`
        id,match_number,giocata,
        gol_casa,gol_ospite,rigori_vincitore,
        squadra_casa(id,nome,logo_url),
        squadra_ospite(id,nome,logo_url)
      `)
      .eq("torneo_id", torneoId)
      .eq("fase_id", elimPhaseId)
      .order("match_number", { ascending: true })
      .then(({ data }) => {
        const matches = data || [];
        setElimMatches(matches);

        // classifica finale in base al numero match
        const entries: ClassificaEntry[] = [];
        matches.forEach((m) => {
          if (!m.giocata || !m.squadra_casa || !m.squadra_ospite) return;
          const casa = m.squadra_casa,
            ospite = m.squadra_ospite;
          const cGol = m.gol_casa!,
            oGol = m.gol_ospite!;
          let vincitore = casa,
            perdente = ospite;
          if (cGol > oGol) {
            vincitore = casa;
            perdente = ospite;
          } else if (oGol > cGol) {
            vincitore = ospite;
            perdente = casa;
          } else if (m.rigori_vincitore) {
            if (m.rigori_vincitore === ospite.id) {
              vincitore = ospite;
              perdente = casa;
            }
          }
          const basePos = (m.match_number - 1) * 2 + 1;
          entries.push({ squadra: vincitore, posizione: basePos });
          entries.push({ squadra: perdente, posizione: basePos + 1 });
        });
        entries.sort((a, b) => a.posizione - b.posizione);
        setClassifica(entries);

        setLoading(false);
      });
  }, [torneoId, elimPhaseId]);

  if (authLoading || loading) {
    return <p className="text-center text-white py-6">Caricamento in corso…</p>;
  }

  // etichette
  const labelMap: Record<number, string> = {
    1: "Finale 1°/2° Posto",
    2: "Finale 3°/4° Posto",
    3: "Finale 5°/6° Posto",
  };

  const formatScore = (m: PartitaRaw) => {
    if (!m.giocata) return "VS";
    const score = `${m.gol_casa} – ${m.gol_ospite}`;
    if (m.gol_casa === m.gol_ospite && m.rigori_vincitore) {
      if (m.rigori_vincitore === m.squadra_casa?.id) return `(Rig) ${score}`;
      if (m.rigori_vincitore === m.squadra_ospite?.id) return `${score} (Rig)`;
    }
    return score;
  };

  return (
  <div className="max-w-3xl mx-auto mt-2 px-2 space-y-6 print:p-0">
    {/* Scontri diretti */}
    {elimMatches.map((m) => (
      <div key={m.id} className="space-y-2">
        <h3 className="text-lg font-semibold text-center text-white print:text-black">
          {labelMap[m.match_number] || `Match ${m.match_number}`}
        </h3>

        <div
          onClick={() =>
            canEdit &&
            navigate(`/modifica-partita-fasegironi/${m.id}`, {
              state: { torneoId },
            })
          }
          className={`grid grid-cols-3 items-center py-2 px-3 bg-white/85 rounded ${
            canEdit ? "cursor-pointer hover:bg-gray-100" : ""
          }`}
        >
          {/* Casa */}
          <div className="flex items-center space-x-2 justify-start">
            {m.squadra_casa?.logo_url && (
              <img
                src={m.squadra_casa.logo_url}
                alt={m.squadra_casa.nome}
                className="w-5 h-5 rounded-full"
              />
            )}
            <span>{m.squadra_casa?.nome}</span>
          </div>

          {/* Risultato */}
          <div className="text-center font-medium">
            {formatScore(m)}
          </div>

          {/* Ospite */}
          <div className="flex items-center space-x-2 justify-end">
            <span>{m.squadra_ospite?.nome}</span>
            {m.squadra_ospite?.logo_url && (
              <img
                src={m.squadra_ospite.logo_url}
                alt={m.squadra_ospite.nome}
                className="w-5 h-5 rounded-full"
              />
            )}
          </div>
        </div>
      </div>
    ))}

    {/* Classifica Finale */}
    <div className="pt-6">
      <h3 className="text-xl font-semibold text-center mb-2 text-white print:text-black">
        Classifica Finale
      </h3>
      <table className="w-full table-auto border-collapse text-center text-sm bg-white/85 rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-1">Pos</th>
            <th className="border px-3 py-1">Squadra</th>
          </tr>
        </thead>
        <tbody>
          {classifica.map((e) => (
            <tr key={e.squadra.id}>
              <td className="border px-3 py-1">{e.posizione}</td>
              <td className="border px-3 py-1">
                <div className="flex items-center space-x-2">
                  {e.squadra.logo_url && (
                    <img
                      src={e.squadra.logo_url}
                      alt={e.squadra.nome}
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <span>{e.squadra.nome}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Pulsanti */}
    <div className="flex justify-between print:hidden space-x-2">
      <button
        onClick={() => navigate(-1)}
        className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
      >
        Esci
      </button>
      <button
        onClick={() => window.print()}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Stampa
      </button>
      {canEdit && (
        <button
          onClick={() => navigate("/tornei")}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Salva ed Esci
        </button>
      )}
    </div>
  </div>
);
}