// netlify/functions/update-classifica.ts
// Data: 11/11/2025 — parser definitivo Campionando + trigger automatico update-partite-classifica + scheduler 21:00

import { Handler } from "@netlify/functions";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAMP_URL = "https://campionando.it/classi.php?camp=6158";

export const handler: Handler = async () => {
  try {
    console.log("⏰ Avvio aggiornamento classifica + partite");

    // 1️⃣ Scarica la pagina classifica
    const res = await fetch(CAMP_URL);
    const html = await res.text();
    const $ = cheerio.load(html);

    const rows: any[] = [];

    // 2️⃣ Trova la tabella che contiene "Squadra"
    const table = $("table").filter((_, el) =>
      $(el).text().toLowerCase().includes("squadra")
    ).first();

    if (table.length === 0)
      throw new Error("Tabella classifica non trovata su Campionando.it");

    // 3️⃣ Parser corretto: 10 colonne (0 = logo)
    table.find("tbody tr").each((i, el) => {
      const cols = $(el).find("td");
      if (cols.length >= 10) {
        const squadra = $(cols[1]).text().trim();
        const punti = parseInt($(cols[2]).text().trim()) || 0;
        const partite_giocate = parseInt($(cols[3]).text().trim()) || 0;
        const vinte = parseInt($(cols[4]).text().trim()) || 0;
        const pareggiate = parseInt($(cols[5]).text().trim()) || 0;
        const perse = parseInt($(cols[6]).text().trim()) || 0;
        const goal_fatti = parseInt($(cols[7]).text().trim()) || 0;
        const goal_subiti = parseInt($(cols[8]).text().trim()) || 0;
        const differenza_reti =
          parseInt($(cols[9]).text().trim()) || goal_fatti - goal_subiti;

        if (squadra) {
          rows.push({
            posizione: i + 1,
            squadra,
            punti,
            partite_giocate,
            vinte,
            pareggiate,
            perse,
            goal_fatti,
            goal_subiti,
            differenza_reti,
          });
        }
      }
    });

    if (rows.length === 0) throw new Error("Nessun dato trovato nella tabella");

    // 4️⃣ Aggiorna tabella classifica in Supabase
    await supabase
      .from("classifica")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    const { error } = await supabase.from("classifica").insert(rows);
    if (error) throw error;

    console.log(`✅ Classifica aggiornata (${rows.length} squadre)`);

    // 5️⃣ Richiama automaticamente la function update-partite-classifica
    try {
      const siteUrl = process.env.URL || "https://montecarlo2013.netlify.app";
      console.log("▶️ Avvio aggiornamento partite via:", siteUrl);

      const res2 = await fetch(
        `${siteUrl}/.netlify/functions/update-partite-classifica`
      );
      const result = await res2.text();
      console.log("📄 Risposta update-partite-classifica:", result);
    } catch (e: any) {
      console.error("⚠️ Errore nel richiamo update-partite-classifica:", e.message);
    }

    // 6️⃣ Fine
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Classifica e partite aggiornate correttamente",
        totale: rows.length,
        runAt: new Date().toLocaleString("it-IT"),
      }),
    };
  } catch (err: any) {
    console.error("❌ Errore aggiornamento classifica:", err);
    return { statusCode: 500, body: "Errore aggiornamento classifica" };
  }
};

// ⏱️ Scheduler automatico (ogni giorno alle 21:00 ora italiana)
export const config = {
  schedule: "@daily 21:00 Europe/Rome",
};
