// src/pages/tornei/NuovoTorneo/Step7_FaseGironi.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Outlet } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface Partita {
  id: string;
  goal_casa: number;
  goal_ospite: number;
  rigori_vincitore: string | null;
  ordine_fase: number;
  data_ora: string | null;
  squadra_casa: Squadra;
  squadra_ospite: Squadra;
}

export default function Step7_FaseGironi() {
  const { torneoId } = useParams<{ torneoId: string }>();
  const navigate = useNavigate();

  const [torneoNome, setTorneoNome] = useState("");
  const [matches, setMatches] = useState<Partita[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!torneoId) return;

      const { data: tData } = await supabase
        .from("tornei")
        .select("nome")
        .eq("id", torneoId)
        .single();
      if (tData?.nome) setTorneoNome(tData.nome);

      const { data: pts, error } = await supabase
        .from<Partita>("partite_torneo")
        .select(`
          id,
          goal_casa,
          goal_ospite,
          rigori_vincitore,
          ordine_fase,
          data_ora,
          squadra_casa: squadra_casa_id(id,nome,logo_url),
          squadra_ospite: squadra_ospite_id(id,nome,logo_url)
        `)
        .eq("torneo_id", torneoId)
        .eq("is_finale", true)
        .order("ordine_fase", { ascending: true });

      if (!error && pts) setMatches(pts);
      else {
        console.error("Errore fetch finali:", error);
        setMatches(pts || []);
      }
      setLoading(false);
    })();
  }, [torneoId]);

  if (loading) {
    return <p className="text-center py-6">Caricamento…</p>;
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    );
  };

  // raggruppa per ordine_fase
  const byOrdine: Record<number, Partita[]> = {};
  matches.forEach((m) => {
    const o = m.ordine_fase || 0;
    byOrdine[o] = byOrdine[o] || [];
    byOrdine[o].push(m);
  });
  const ordini = Object.keys(byOrdine)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b);

  // costruisci classifica finale
  type ClassRow = { posizione: number; squadra: Squadra };
  const classifica: ClassRow[] = ordini
    .flatMap((ord) => {
      const m = byOrdine[ord][0];
      let winner = m.squadra_casa,
          loser = m.squadra_ospite;
      if (m.goal_casa > m.goal_ospite) {
        winner = m.squadra_casa;
        loser = m.squadra_ospite;
      } else if (m.goal_ospite > m.goal_casa) {
        winner = m.squadra_ospite;
        loser = m.squadra_casa;
      } else if (m.rigori_vincitore) {
        if (m.rigori_vincitore === m.squadra_casa.id) {
          winner = m.squadra_casa;
          loser = m.squadra_ospite;
        } else {
          winner = m.squadra_ospite;
          loser = m.squadra_casa;
        }
      }
      return [
        { posizione: 2 * ord - 1, squadra: winner },
        { posizione: 2 * ord, squadra: loser },
      ];
    })
    .sort((a, b) => a.posizione - b.posizione);

  const handleSaveAndExit = async () => {
    setLoading(true);
    for (const m of matches) {
      await supabase
        .from("partite_torneo")
        .update({
          goal_casa: m.goal_casa,
          goal_ospite: m.goal_ospite,
          rigori_vincitore: m.rigori_vincitore,
        })
        .eq("id", m.id);
    }
    navigate("/tornei");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-center">
        {torneoNome} – Finali
      </h2>

      {ordini.map((ord) => {
        const label =
          ord === 1
            ? "Finale 1-2 Posto"
            : `Finale ${2 * ord - 1}-${2 * ord} Posto`;
        return (
          <div key={ord} className="space-y-2">
            <p className="text-center text-sm text-gray-500">{label}</p>

            {byOrdine[ord].map((m) => (
              <div
                key={m.id}
                onClick={() =>
                  navigate(
                    `/tornei/nuovo/step7-fasegironi/${torneoId}/edit/${m.id}`
                  )
                }
                className="
                  bg-white rounded-lg
                  shadow-2xl hover:shadow-3xl
                  hover:bg-gray-50
                  transition-colors duration-200
                  p-4 cursor-pointer whitespace-nowrap
                  grid grid-cols-[max-content_auto_max-content] items-center
                "
              >
                <div className="col-span-3 text-xs text-gray-500 mb-2 text-center">
                  {formatDate(m.data_ora)}
                </div>

                <div className="flex items-center space-x-2">
                  {m.squadra_casa.logo_url && (
                    <img
                      src={m.squadra_casa.logo_url}
                      alt={m.squadra_casa.nome}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="font-medium">{m.squadra_casa.nome}</span>
                </div>

                <div className="flex items-center justify-center space-x-2 font-semibold">
                  <span>{m.goal_casa}</span>
                  <span>-</span>
                  <span>{m.goal_ospite}</span>
                </div>

                <div className="flex items-center space-x-2 justify-end">
                  <span className="font-medium">{m.squadra_ospite.nome}</span>
                  {m.squadra_ospite.logo_url && (
                    <img
                      src={m.squadra_ospite.logo_url}
                      alt={m.squadra_ospite.nome}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Classifica Finale centrata ma contenuto allineato a sinistra */}
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-2 text-center">Classifica Finale</h3>
        <div className="flex justify-center">
          <ul className="w-64 divide-y text-left">
            {classifica.map((row) => (
              <li key={row.posizione} className="flex items-center py-2 space-x-3">
                <span className="w-6 text-right font-semibold">{row.posizione}.</span>
                {row.squadra.logo_url && (
                  <img
                    src={row.squadra.logo_url}
                    alt={row.squadra.nome}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span>{row.squadra.nome}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-between mt-6">
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
          onClick={handleSaveAndExit}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Salva ed Esci
        </button>
      </div>

      <Outlet />
    </div>
  );
}
