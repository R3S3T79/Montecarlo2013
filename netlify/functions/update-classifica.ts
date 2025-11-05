// netlify/functions/update-classifica.ts
// Data: 05/11/2025 — Aggiornamento automatico classifica da campionando.it

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
    // 1️⃣ Scarica pagina HTML
    const res = await fetch(CAMP_URL);
    const html = await res.text();

    // 2️⃣ Parsing con cheerio
    const $ = cheerio.load(html);

    const rows: any[] = [];

    // cerca la tabella classifica (basata sulla struttura del sito)
    $("table tr").each((i, el) => {
  const cols = $(el).find("td");
  if (cols.length >= 9) {
    const squadra = $(cols[0]).text().trim();
    const punti = parseInt($(cols[1]).text().trim()) || 0;
    const partite_giocate = parseInt($(cols[2]).text().trim()) || 0;
    const vinte = parseInt($(cols[3]).text().trim()) || 0;
    const pareggiate = parseInt($(cols[4]).text().trim()) || 0;
    const perse = parseInt($(cols[5]).text().trim()) || 0;
    const goal_fatti = parseInt($(cols[6]).text().trim()) || 0;
    const goal_subiti = parseInt($(cols[7]).text().trim()) || 0;
    const differenza_reti = parseInt($(cols[8]).text().trim()) || 0;

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


    if (rows.length === 0) {
      console.error("Nessun dato trovato nella pagina!");
      return { statusCode: 500, body: "Nessun dato trovato" };
    }

    // 3️⃣ Svuota tabella classifica
    await supabase.from("classifica").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 4️⃣ Inserisci nuova classifica
    const { error } = await supabase.from("classifica").insert(rows);
    if (error) throw error;

    console.log(`✅ Classifica aggiornata (${rows.length} righe)`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Classifica aggiornata", totale: rows.length }),
    };
  } catch (err: any) {
    console.error("❌ Errore aggiornamento classifica:", err);
    return { statusCode: 500, body: "Errore aggiornamento classifica" };
  }
};
