// src/pages/Classifica.tsx
// Data: 05/11/2025 — versione ibrida: aggiorna classifica anche in locale senza Netlify

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../lib/roles";
import * as cheerio from "cheerio"; // ✅ assicurati che sia installato: npm install cheerio
import { useNavigate } from "react-router-dom";

interface RigaClassifica {
  id?: string;
  posizione: number;
  squadra: string;
  partite_giocate: number;
  vinte: number;
  pareggiate: number;
  perse: number;
  goal_fatti: number;
  goal_subiti: number;
  differenza_reti: number;
  punti: number;
}

export default function Classifica(): JSX.Element {
  const { user } = useAuth();
  const [righe, setRighe] = useState<RigaClassifica[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(UserRole.Authenticated);
  const navigate = useNavigate();


  // ✅ Recupera ruolo utente per mostrare pulsante solo ad admin/creator
  useEffect(() => {
    const fetchRole = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error && data?.role) {
        const r = (data.role as string).toLowerCase();
        if (r === "admin") setRole(UserRole.Admin);
        else if (r === "creator") setRole(UserRole.Creator);
      }
    };
    fetchRole();
  }, [user?.id]);

  // ✅ Carica classifica da Supabase
  const caricaClassifica = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("classifica")
        .select("*")
        .order("punti", { ascending: false })
        .order("differenza_reti", { ascending: false });
      if (error) throw error;
      setRighe(data || []);
    } catch (err: any) {
      setErrore(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    caricaClassifica();
  }, []);

  // ✅ Aggiorna la classifica — ibrido (locale o Netlify)
  const aggiornaClassifica = async () => {
    try {
      setLoading(true);

      const isLocal = window.location.hostname === "localhost";
      if (isLocal) {
        console.log("🔹 Modalità locale: aggiornamento diretto da Campionando.it");

        // Scarica HTML direttamente
        const res = await fetch("https://campionando.it/classi.php?camp=6158");
        const html = await res.text();
        const $ = cheerio.load(html);

        const rows: any[] = [];
        $("table tr").each((i, el) => {
          const cols = $(el).find("td");
          if (cols.length >= 9) {
            const posizione = parseInt($(cols[0]).text().trim()) || 0;
            const squadra = $(cols[1]).text().trim();
            const partite_giocate = parseInt($(cols[2]).text().trim()) || 0;
            const vinte = parseInt($(cols[3]).text().trim()) || 0;
            const pareggiate = parseInt($(cols[4]).text().trim()) || 0;
            const perse = parseInt($(cols[5]).text().trim()) || 0;
            const goal_fatti = parseInt($(cols[6]).text().trim()) || 0;
            const goal_subiti = parseInt($(cols[7]).text().trim()) || 0;
            const punti = parseInt($(cols[8]).text().trim()) || 0;

            if (squadra) {
              rows.push({
                posizione,
                squadra,
                partite_giocate,
                vinte,
                pareggiate,
                perse,
                goal_fatti,
                goal_subiti,
                differenza_reti: goal_fatti - goal_subiti,
                punti,
              });
            }
          }
        });

        if (rows.length === 0) throw new Error("Nessuna riga trovata su Campionando.it");

        // Svuota tabella e inserisci nuovi dati
        await supabase.from("classifica").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        const { error } = await supabase.from("classifica").insert(rows);
        if (error) throw error;

        alert(`✅ Classifica aggiornata (${rows.length} squadre)`);
      } else {
        console.log("🌍 Modalità produzione: chiamata Netlify Function");
        const res = await fetch("/.netlify/functions/update-classifica");
        const text = await res.text();
        console.log("Risposta funzione:", text);
        alert("✅ Aggiornamento completato (Netlify).");
      }

      await caricaClassifica();
    } catch (err: any) {
      console.error("❌ Errore aggiornamento:", err);
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>⏳ Caricamento classifica...</div>
    );
  }

  if (errore) {
    return (
      <div style={{ color: "red", textAlign: "center", marginTop: 40 }}>
        Errore nel caricamento: {errore}
      </div>
    );
  }

  return (
    <div style={stili.container}>
      <h2 style={stili.titolo}>🏆 Classifica Campionato</h2>

      {(role === UserRole.Admin || role === UserRole.Creator) && (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <button onClick={aggiornaClassifica} style={stili.bottone}>
            🔄 Aggiorna classifica ora
          </button>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={stili.tabella}>
          <thead>
            <tr style={stili.intestazione}>
              <th>#</th>
              <th>Squadra</th>
              <th>P</th>
              <th>G</th>
              <th>V</th>
              <th>N</th>
              <th>P</th>
              <th>GF</th>
              <th>GS</th>
              <th>D</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r, i) => (
              <tr key={r.id || i} style={i % 2 === 0 ? stili.rigaChiara : stili.rigaScura}>
                <td>{r.posizione}</td>
                <td style={stili.squadra}>
  <span
    onClick={() => navigate(`/scontri/${encodeURIComponent(r.squadra)}`)}
    style={{
      cursor: "pointer",
      color: r.squadra.toLowerCase().includes("montecarlo")
        ? "#d00000"
        : "#004aad",
      fontWeight: r.squadra.toLowerCase().includes("montecarlo") ? 700 : 600,
      textDecoration: "underline",
    }}
  >
    {r.squadra}
  </span>
</td>


                <td style={{ fontWeight: 700 }}>{r.punti}</td>
                <td>{r.partite_giocate}</td>
                <td>{r.vinte}</td>
                <td>{r.pareggiate}</td>
                <td>{r.perse}</td>
                <td>{r.goal_fatti}</td>
                <td>{r.goal_subiti}</td>
                <td
                  style={{
                    color: r.differenza_reti > 0 ? "green" : r.differenza_reti < 0 ? "red" : "gray",
                    fontWeight: 600,
                  }}
                >
                  {r.differenza_reti}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={stili.footer}>
        Ultimo aggiornamento automatico ogni sera alle 21:00.
      </p>
    </div>
  );
}

const stili: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px",
    maxWidth: 800,
    margin: "0 auto",
  },
  titolo: {
    textAlign: "center",
    marginBottom: 20,
  },
  bottone: {
    background: "#004aad",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
  },
  tabella: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 15,
  },
  intestazione: {
    background: "#004aad",
    color: "white",
    textAlign: "center",
  },
  squadra: {
    textAlign: "left",
    fontWeight: 600,
  },
  rigaChiara: {
    background: "#f8f8f8",
    textAlign: "center",
    height: 36,
  },
  rigaScura: {
    background: "#ffffff",
    textAlign: "center",
    height: 36,
  },
  footer: {
    textAlign: "center",
    fontSize: 13,
    opacity: 0.7,
    marginTop: 12,
  },
};
