// netlify/functions/update-partite-classifica.ts
// Data: 05/11/2025 — Legge tutti i ruolini squadra per il campionato 6158 e aggiorna la tabella classifica_partite

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
    // 1️⃣ Prende tutte le squadre dalla tabella classifica
    const { data: squadre, error: errSquadre } = await supabase
      .from("classifica")
      .select("squadra");

    if (errSquadre || !squadre?.length) {
      throw new Error("Impossibile leggere la lista squadre dalla tabella classifica.");
    }

    console.log(`🔹 Trovate ${squadre.length} squadre in classifica.`);

    const tuttePartite: any[] = [];

    // 2️⃣ Per ogni squadra, scarica il suo ruolino
    for (const s of squadre) {
      const nomeSquadra = encodeURIComponent(s.squadra.trim());
      const url = `${BASE_URL}?squadra=${nomeSquadra}&camp=${CAMP_ID}&nome=${nomeSquadra}`;
      console.log(`📥 Scarico ${url}`);

      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`⚠️ Errore fetch per ${s.squadra}: ${res.status}`);
        continue;
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      let giornata = 0;

      $("table tr").each((i, el) => {
        const text = $(el).text().trim();
        const cols = $(el).find("td");

        // Riga giornata
        if (cols.length === 1 && text.toLowerCase().includes("giornata")) {
          const m = text.match(/Giornata\s+(\d+)/i);
          giornata = m ? parseInt(m[1]) : giornata;
        }

        // Riga partita
        if (cols.length >= 5) {
          const giornataTxt = $(cols[0]).text().trim();
          const dataTxt = $(cols[1]).text().trim();
          const casa = $(cols[2]).text().trim();
          const risultato = $(cols[3]).text().trim();
          const ospite = $(cols[4]).text().trim();

          let goalCasa: number | null = null;
          let goalOspite: number | null = null;
          if (risultato.includes("-")) {
            const [a, b] = risultato.split("-").map((x) => x.trim());
            goalCasa = parseInt(a) || null;
            goalOspite = parseInt(b) || null;
          }

          if (casa && ospite) {
            tuttePartite.push({
              giornata,
              data_match: parseData(dataTxt),
              ora_match: null,
              squadra_casa: casa,
              squadra_ospite: ospite,
              goal_casa: goalCasa,
              goal_ospite: goalOspite,
              campo: null,
              note: null,
            });
          }
        }
      });
    }

    if (!tuttePartite.length) {
      throw new Error("Nessuna partita trovata nei ruolini squadra.");
    }

    // 3️⃣ Cancella vecchi dati
    await supabase.from("classifica_partite").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 4️⃣ Inserisce nuove partite
    const { error: insertErr } = await supabase.from("classifica_partite").insert(tuttePartite);
    if (insertErr) throw insertErr;

    console.log(`✅ Inserite ${tuttePartite.length} partite da ${squadre.length} squadre`);
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

// 🔧 Helper per formattare date tipo 12/10/2025
function parseData(txt: string): string | null {
  const m = txt.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}
