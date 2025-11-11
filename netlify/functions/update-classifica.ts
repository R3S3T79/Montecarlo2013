// netlify/functions/update-classifica.ts
// Data: 11/11/2025 — versione con aggiornamento manuale + automatico giornaliero (21:00)

import { Handler } from "@netlify/functions";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

// ✅ Client Supabase con chiave SERVICE_ROLE
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ URL campionato su Campionando.it
const CAMP_URL = "https://campionando.it/classi.php?camp=6158";

export const handler: Handler = async () => {
  try {
    console.log("⏰ Avvio aggiornamento classifica da Campionando.it...");
    const res = await fetch(CAMP_URL);
    const html = await res.text();
    const $ = cheerio.load(html);

    const rows: any[] = [];

    // Parsing identico a quello locale
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

    if (rows.length === 0) {
      console.error("⚠️ Nessuna riga trovata su Campionando.it");
      return { statusCode: 500, body: "Nessun dato trovato" };
    }

    // Svuota e reinserisci i dati
    await supabase
      .from("classifica")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    const { error } = await supabase.from("classifica").insert(rows);
    if (error) throw error;

    console.log(`✅ Classifica aggiornata (${rows.length} squadre)`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Classifica aggiornata con successo",
        totale: rows.length,
        eseguito: new Date().toLocaleString("it-IT"),
      }),
    };
  } catch (err: any) {
    console.error("❌ Errore aggiornamento classifica:", err);
    return { statusCode: 500, body: "Errore aggiornamento classifica" };
  }
};

// ✅ Pianificazione automatica (ogni giorno alle 21:00 ora italiana)
export const config = {
  schedule: "@daily 21:00 Europe/Rome", // formato Netlify Scheduled Functions
};
