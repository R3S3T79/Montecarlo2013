// netlify/functions/update-partite-classifica.ts
// Data: 05/11/2025 — Parsing corretto struttura Campionando + pulizia testo

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
    const { data: squadre, error: errSquadre } = await supabase
      .from("classifica")
      .select("squadra");

    if (errSquadre || !squadre?.length)
      throw new Error("Impossibile leggere la lista squadre dalla classifica.");

    console.log(`🔹 ${squadre.length} squadre trovate.`);

    const tuttePartite: any[] = [];

    for (const s of squadre) {
      const nomeSquadra = encodeURIComponent(s.squadra);
      const url = `${BASE_URL}?squadra=${nomeSquadra}&camp=${CAMP_ID}&nome=${nomeSquadra}`;

      console.log(`\n📡 ${s.squadra} → ${url}`);

      let html: string | null = null;
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if (!response.ok) continue;
        html = await response.text();
      } catch (e: any) {
        console.error(`❌ Errore fetch ${s.squadra}:`, e.message);
        continue;
      }

      const $ = cheerio.load(html || "");
      const rows = $("table tr");
      let conteggio = 0;

      rows.each((i, el) => {
        const cols = $(el).find("td");
        if (cols.length < 4) return;

        // testo pulito
        const giornataTxt = pulisci($(cols[0]).text());
        const casaTxt = pulisci($(cols[1]).text());
        const risultatoTxt = pulisci($(cols[2]).text());
        const ospiteTxt = pulisci($(cols[3]).text());

        // validazione
        if (!giornataTxt.includes("Giornata")) return;
        if (!casaTxt || !ospiteTxt) return;

        const dataTxt = giornataTxt.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || null;
        const giornataNum = estraiNumeroGiornata(giornataTxt);

        let goalCasa: number | null = null;
        let goalOspite: number | null = null;

        if (risultatoTxt.includes("-")) {
          const [a, b] = risultatoTxt.split("-").map((x) => x.trim());
          goalCasa = parseInt(a) || null;
          goalOspite = parseInt(b) || null;
        }

        // salva solo se almeno la data esiste
        if (dataTxt && casaTxt && ospiteTxt) {
          tuttePartite.push({
            giornata: giornataNum,
            data_match: parseData(dataTxt),
            squadra_casa: casaTxt,
            squadra_ospite: ospiteTxt,
            goal_casa: goalCasa,
            goal_ospite: goalOspite,
          });
          conteggio++;
        }
      });

      console.log(`✅ ${conteggio} partite estratte per ${s.squadra}`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (tuttePartite.length === 0)
      throw new Error("Nessuna partita trovata nei ruolini.");

    await supabase.from("classifica_partite").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error: insErr } = await supabase.from("classifica_partite").insert(tuttePartite);
    if (insErr) throw insErr;

    console.log(`✅ Inserite ${tuttePartite.length} partite totali.`);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Partite aggiornate", totale: tuttePartite.length }),
    };
  } catch (err: any) {
    console.error("❌ Errore update-partite-classifica:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// 🔧 pulizia testo
function pulisci(txt: string): string {
  return txt.replace(/\s+/g, " ").replace(/\n/g, "").trim();
}

function estraiNumeroGiornata(testo: string): number | null {
  const m = testo.match(/Giornata\s+(\d+)/i);
  return m ? parseInt(m[1]) : null;
}

function parseData(txt: string | null): string | null {
  if (!txt) return null;
  const m = txt.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}
