// netlify/functions/update-partite-classifica.ts
// Data: 05/11/2025 — Versione completa con parsing cheerio e salvataggio Supabase

import { Handler } from "@netlify/functions";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAMP_ID = "6158";
const BASE_URL = "https://campionando.it/ruolino.php";

export const handler: Handler = async () => {
  try {
    // 1️⃣ Leggi le squadre
    const { data: squadre, error: errSquadre } = await supabase
      .from("classifica")
      .select("squadra");

    if (errSquadre || !squadre?.length)
      throw new Error("Impossibile leggere le squadre dalla tabella classifica.");

    console.log(`🔹 Trovate ${squadre.length} squadre in classifica.`);

    const tuttePartite: any[] = [];

    // 2️⃣ Cicla le squadre
    for (const s of squadre) {
      const nomeSquadra = encodeURIComponent(s.squadra);
      const url = `${BASE_URL}?squadra=${nomeSquadra}&camp=${CAMP_ID}&nome=${nomeSquadra}`;
      console.log(`\n📡 Fetch per squadra: ${s.squadra}`);
      console.log(`➡️  URL: ${url}`);

      let html: string | null = null;

      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
        });

        if (!response.ok) {
          console.warn(`⚠️ Errore fetch ${response.status}`);
          continue;
        }

        html = await response.text();
      } catch (error: any) {
        console.error(`❌ Errore rete per ${s.squadra}:`, error.message);
        continue;
      }

      if (!html) continue;

      // 3️⃣ Parsing HTML con cheerio
      const $ = cheerio.load(html);
      const rows = $("tr");
      let countPartite = 0;

      rows.each((i, el) => {
        const cols = $(el).find("td");
        if (cols.length < 4) return;

        const giornataTxt = $(cols[0]).text().trim();
        const casa = $(cols[1]).text().trim();
        const risultatoTxt = $(cols[2]).text().trim();
        const ospite = $(cols[3]).text().trim();

        const dataTxt = giornataTxt.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || null;
        const giornataNum = estraiNumeroGiornata(giornataTxt);

        let goalCasa: number | null = null;
        let goalOspite: number | null = null;

        if (risultatoTxt.includes("-")) {
          const [a, b] = risultatoTxt.split("-").map((x) => x.trim());
          goalCasa = parseInt(a) || null;
          goalOspite = parseInt(b) || null;
        }

        if (casa && ospite) {
          tuttePartite.push({
            data_match: parseData(dataTxt),
            squadra_casa: casa,
            squadra_ospite: ospite,
            goal_casa: goalCasa,
            goal_ospite: goalOspite,
            giornata: giornataNum,
          });
          countPartite++;
        }
      });

      console.log(`✅ Estratte ${countPartite} partite da ${s.squadra}`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (tuttePartite.length === 0)
      throw new Error("Nessuna partita trovata nei ruolini squadra.");

    // 4️⃣ Cancella vecchi dati e inserisci nuovi
    await supabase.from("classifica_partite").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const { error: insertErr } = await supabase.from("classifica_partite").insert(tuttePartite);
    if (insertErr) throw insertErr;

    console.log(`✅ Inserite ${tuttePartite.length} partite totali`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Partite aggiornate correttamente",
        totale: tuttePartite.length,
      }),
    };
  } catch (err: any) {
    console.error("❌ Errore update-partite-classifica:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// 🔧 Helper per estrarre numero giornata
function estraiNumeroGiornata(testo: string): number | null {
  const m = testo.match(/Giornata\s+(\d+)/i);
  return m ? parseInt(m[1]) : null;
}

// 🔧 Helper per formattare date tipo 12/10/2025
function parseData(txt: string | null): string | null {
  if (!txt) return null;
  const m = txt.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}
