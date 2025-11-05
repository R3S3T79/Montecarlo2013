// netlify/functions/update-partite-classifica.ts
// Data: 05/11/2025 — Aggiorna automaticamente la tabella classifica_partite da Campionando.it

import { Handler } from "@netlify/functions";
import * as cheerio from "cheerio"; // ✅ usa import ESM corretto
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🔗 pagina Campionando “Risultati e calendario”
const CAMP_URL = "https://campionando.it/risultati.php?camp=6158";

export const handler: Handler = async () => {
  try {
    // 1️⃣ Scarica la pagina HTML
    const res = await fetch(CAMP_URL);
    if (!res.ok) throw new Error(`Impossibile scaricare la pagina (${res.status})`);

    const html = await res.text();
    const $ = cheerio.load(html);

    const partite: any[] = [];
    let giornataCorrente: number | null = null;

    // 2️⃣ Scansiona la pagina
    $("table tr").each((i, el) => {
      const cols = $(el).find("td");

      // Riga giornata (es. "Giornata 5 - 01/11/2025")
      if (cols.length === 1 && $(cols[0]).text().toLowerCase().includes("giornata")) {
        const testo = $(cols[0]).text().trim();
        const numMatch = testo.match(/Giornata\s+(\d+)/i);
        giornataCorrente = numMatch ? parseInt(numMatch[1]) : null;
        return;
      }

      // Riga partita
      if (cols.length >= 5) {
        const data = $(cols[0]).text().trim() || null;
        const ora = $(cols[1]).text().trim() || null;
        const squadraCasa = $(cols[2]).text().trim();
        const risultato = $(cols[3]).text().trim();
        const squadraOspite = $(cols[4]).text().trim();
        const campo = cols.length >= 6 ? $(cols[5]).text().trim() : null;

        let goalCasa: number | null = null;
        let goalOspite: number | null = null;

        if (risultato && risultato.includes("-")) {
          const [gf, gs] = risultato.split("-").map((v) => v.trim());
          goalCasa = parseInt(gf) || null;
          goalOspite = parseInt(gs) || null;
        }

        if (squadraCasa && squadraOspite) {
          partite.push({
            giornata: giornataCorrente,
            data_match: data ? parseDataCampionando(data) : null,
            ora_match: ora || null,
            squadra_casa: squadraCasa,
            squadra_ospite: squadraOspite,
            goal_casa: goalCasa,
            goal_ospite: goalOspite,
            campo: campo || null,
          });
        }
      }
    });

    if (partite.length === 0) {
      throw new Error("Nessuna partita trovata nella pagina Campionando!");
    }

    // 3️⃣ Svuota la tabella esistente
    const { error: delError } = await supabase
      .from("classifica_partite")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (delError) throw delError;

    // 4️⃣ Inserisci nuove partite
    const { error: insError } = await supabase
      .from("classifica_partite")
      .insert(partite);

    if (insError) throw insError;

    console.log(`✅ Inserite ${partite.length} partite da Campionando.it`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Partite aggiornate correttamente",
        totale: partite.length,
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

// 🧠 Funzione helper per convertire “01/11/2025” → “2025-11-01”
function parseDataCampionando(dataStr: string): string | null {
  const m = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, giorno, mese, anno] = m;
  return `${anno}-${mese}-${giorno}`;
}
