// netlify/functions/update-partite-classifica.ts
// Data: 05/11/2025 — Legge i ruolini squadra da Campionando.it (struttura tabella standard)

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
    // 1️⃣ Leggi le squadre dalla tabella classifica
    const { data: squadre, error: errSquadre } = await supabase
      .from("classifica")
      .select("squadra");

    if (errSquadre || !squadre?.length) {
      throw new Error("Impossibile leggere la lista squadre dalla tabella classifica.");
    }

    console.log(`🔹 Trovate ${squadre.length} squadre in classifica.`);

    const tuttePartite: any[] = [];

    // 2️⃣ Cicla le squadre
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

      // Ogni riga partita ha 5 <td> (giornata/data, casa, ospite, risultato)
      $("table tr").each((i, el) => {
        const cols = $(el).find("td");
        if (cols.length === 0) return;

        // Riga giornata (es. "Giornata 1 - 12/10/2025")
        if (cols.length === 1 && $(cols[0]).text().includes("Giornata")) {
          return;
        }

        if (cols.length >= 5) {
          const giornataTxt = $(cols[0]).text().trim();
          const dataTxt = giornataTxt.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || null;
          const casa = $(cols[1]).text().trim();
          const ospite = $(cols[3]).text().trim();
          const risultato = $(cols[2]).text().trim();

          let goalCasa: number | null = null;
          let goalOspite: number | null = null;
          if (risultato.includes("-")) {
            const [a, b] = risultato.split("-").map((x) => x.trim());
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
              giornata: estraiNumeroGiornata(giornataTxt),
              campo: null,
              note: null,
            });
          }
        }
      });
    }

    if (tuttePartite.length === 0) {
      throw new Error("Nessuna partita trovata nei ruolini squadra.");
    }

    // 3️⃣ Cancella vecchi dati
    await supabase
      .from("classifica_partite")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // 4️⃣ Inserisci nuove partite
    const { error: insertErr } = await supabase
      .from("classifica_partite")
      .insert(tuttePartite);

    if (insertErr) throw insertErr;

    console.log(`✅ Inserite ${tuttePartite.length} partite`);
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
