// src/pages/DettaglioScontri.tsx
// Data: 05/11/2025 — Mostra tutti gli scontri (partite) di una squadra dal campionato completo

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

interface Partita {
  id: string;
  giornata: number | null;
  data_match: string | null;
  ora_match: string | null;
  squadra_casa: string;
  squadra_ospite: string;
  goal_casa: number | null;
  goal_ospite: number | null;
  campo?: string | null;
  note?: string | null;
}

export default function DettaglioScontri(): JSX.Element {
  const { nome } = useParams<{ nome: string }>();
  const [partite, setPartite] = useState<Partita[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!nome) return;
    const squadraNome = decodeURIComponent(nome); // ✅ evita problemi con spazi e caratteri speciali

    const caricaPartite = async () => {
      try {
        setLoading(true);

        // ✅ Nuova query sulla tabella classifica_partite
        const { data, error } = await supabase
          .from("classifica_partite")
          .select("*")
          .or(`squadra_casa.eq.${squadraNome},squadra_ospite.eq.${squadraNome}`)
          .order("data_match", { ascending: true });

        if (error) {
          console.error("❌ Errore caricamento scontri:", error);
        } else {
          setPartite(data || []);
        }
      } catch (err) {
        console.error("❌ Errore imprevisto:", err);
      } finally {
        setLoading(false);
      }
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
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>
        ⚽ Scontri di {decodeURIComponent(nome || "")}
      </h2>

      {partite.length === 0 ? (
        <p style={{ textAlign: "center" }}>Nessuna partita trovata.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={stili.tabella}>
            <thead>
              <tr style={stili.intestazione}>
                <th>Giornata</th>
                <th>Data</th>
                <th>Ora</th>
                <th>Casa</th>
                <th>Risultato</th>
                <th>Ospite</th>
                <th>Campo</th>
              </tr>
            </thead>
            <tbody>
              {partite.map((p) => {
                const dataFormattata = p.data_match
                  ? new Date(p.data_match).toLocaleDateString("it-IT")
                  : "-";
                const risultato =
                  p.goal_casa !== null && p.goal_ospite !== null
                    ? `${p.goal_casa} - ${p.goal_ospite}`
                    : "-";
                return (
                  <tr key={p.id} style={stili.riga}>
                    <td>{p.giornata ?? "-"}</td>
                    <td>{dataFormattata}</td>
                    <td>{p.ora_match || "-"}</td>
                    <td
                      style={{
                        color: p.squadra_casa
                          .toLowerCase()
                          .includes("montecarlo")
                          ? "#d00000"
                          : "inherit",
                        fontWeight: 600,
                      }}
                    >
                      {p.squadra_casa}
                    </td>
                    <td style={{ fontWeight: 600 }}>{risultato}</td>
                    <td
                      style={{
                        color: p.squadra_ospite
                          .toLowerCase()
                          .includes("montecarlo")
                          ? "#d00000"
                          : "inherit",
                        fontWeight: 600,
                      }}
                    >
                      {p.squadra_ospite}
                    </td>
                    <td>{p.campo || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button onClick={() => navigate(-1)} style={stili.bottone}>
          ⬅️ Torna indietro
        </button>
      </div>
    </div>
  );
}

const stili: Record<string, React.CSSProperties> = {
  tabella: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 15,
  },
  intestazione: {
    background: "#004aad",
    color: "white",
    textAlign: "center",
    height: 36,
  },
  riga: {
    textAlign: "center",
    height: 36,
    background: "#fff",
  },
  bottone: {
    background: "#004aad",
    color: "white",
    border: "none",
    padding: "6px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },
};
