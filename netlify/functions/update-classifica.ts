// netlify/functions/update-classifica.ts
// Data: 11/04/2026 — versione definitiva con stagione_id + fase

import { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CONFIG
const CAMP_URL = "https://www.campionando.it/classi.php?camp=6221";

const STAGIONE_ID = "37f5676e-99cb-40f9-a47c-e1b849cf4ad1";
const STAGIONE_NOME = "2025/2026";
const FASE = "Seconda Fase";

export const handler: Handler = async () => {
  try {
    console.log("🚀 Aggiornamento classifica Seconda Fase");

    const res = await fetch(CAMP_URL);
    const html = await res.text();
    const $ = cheerio.load(html);

    const rows: any[] = [];

    $("table tr").each((i, el) => {
      const tds = $(el).find("td");

      if (tds.length >= 9) {
        const squadra = $(tds[1]).text().trim();

        if (!squadra || squadra.toLowerCase().includes("squadra")) return;

        const punti = parseInt($(tds[2]).text().trim()) || 0;
        const giocate = parseInt($(tds[3]).text().trim()) || 0;
        const vinte = parseInt($(tds[4]).text().trim()) || 0;
        const pareggiate = parseInt($(tds[5]).text().trim()) || 0;
        const perse = parseInt($(tds[6]).text().trim()) || 0;
        const gf = parseInt($(tds[7]).text().trim()) || 0;
        const gs = parseInt($(tds[8]).text().trim()) || 0;

        rows.push({
          squadra,
          punti,
          partite_giocate: giocate,
          vinte,
          pareggiate,
          perse,
          goal_fatti: gf,
          goal_subiti: gs,
          differenza_reti: gf - gs,
        });
      }
    });

    if (rows.length === 0) {
      throw new Error("❌ Nessuna squadra trovata");
    }

    console.log("✅ Squadre trovate:", rows.length);

    // 🔴 CANCELLA SOLO QUESTA FASE + STAGIONE
    await supabase
      .from("classifica")
      .delete()
      .eq("stagione_id", STAGIONE_ID)
      .eq("fase", FASE);

    // 🔵 PREPARA INSERT
    const insertData = rows.map((r, index) => ({
      posizione: index + 1,
      squadra: r.squadra,
      punti: r.punti,
      partite_giocate: r.partite_giocate,
      vinte: r.vinte,
      pareggiate: r.pareggiate,
      perse: r.perse,
      goal_fatti: r.goal_fatti,
      goal_subiti: r.goal_subiti,
      differenza_reti: r.differenza_reti,
      stagione_id: STAGIONE_ID,
      stagione_nome: STAGIONE_NOME,
      fase: FASE,
    }));

    const { error } = await supabase
      .from("classifica")
      .insert(insertData);

    if (error) {
      console.error("❌ Errore insert:", error);
      throw error;
    }

    console.log("✅ Classifica salvata correttamente");

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };

  } catch (err: any) {
    console.error("❌ ERRORE:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
};