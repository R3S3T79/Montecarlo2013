// src/pages/DettaglioScontri.tsx
// Data: 05/11/2025 — Mostra tutti gli scontri (partite) di una squadra

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

interface Partita {
  id: string;
  data_ora: string;
  squadra_casa: string;
  squadra_ospite: string;
  goal_casa: number | null;
  goal_ospite: number | null;
}

export default function DettaglioScontri(): JSX.Element {
  const { nome } = useParams<{ nome: string }>();
  const [partite, setPartite] = useState<Partita[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!nome) return;

    const caricaPartite = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("partite")
        .select("id, data_ora, squadra_casa, squadra_ospite, goal_a, goal_b")
        .or(`squadra_casa.eq.${nome},squadra_ospite.eq.${nome}`)
        .order("data_ora", { ascending: true });

      if (error) {
        console.error("Errore caricamento scontri:", error);
      } else {
        // Rimappa i campi ai nomi leggibili
        const mapped = (data || []).map((p) => ({
          id: p.id,
          data_ora: p.data_ora,
          squadra_casa: p.squadra_casa,
          squadra_ospite: p.squadra_ospite,
          goal_casa: p.goal_a,
          goal_ospite: p.goal_b,
        }));
        setPartite(mapped);
      }

      setLoading(false);
    };

    caricaPartite();
  }, [nome]);

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        ⏳ Caricamento scontri di {nome}...
      </div>
    );

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ textAlign: "center" }}>⚽ Scontri di {nome}</h2>

      {partite.length === 0 ? (
        <p style={{ textAlign: "center" }}>Nessuna partita trovata.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#004aad", color: "white" }}>
                <th>Data</th>
                <th>Casa</th>
                <th>Risultato</th>
                <th>Ospite</th>
              </tr>
            </thead>
            <tbody>
              {partite.map((p) => {
                const data = new Date(p.data_ora).toLocaleDateString("it-IT");
                const risultato =
                  p.goal_casa !== null && p.goal_ospite !== null
                    ? `${p.goal_casa} - ${p.goal_ospite}`
                    : "-";
                return (
                  <tr key={p.id} style={{ textAlign: "center", height: 36 }}>
                    <td>{data}</td>
                    <td>{p.squadra_casa}</td>
                    <td style={{ fontWeight: 600 }}>{risultato}</td>
                    <td>{p.squadra_ospite}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "#004aad",
            color: "white",
            border: "none",
            padding: "6px 14px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          ⬅️ Torna indietro
        </button>
      </div>
    </div>
  );
}
