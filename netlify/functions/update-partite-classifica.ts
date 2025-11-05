// netlify/functions/update-partite-classifica.ts
// Data: 05/11/2025 — Parsing definitivo + rimozione duplicati + pulizia testo

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
    // 1️⃣ Legge le squadre dalla tabella classifica
    const { data: squadre, error: errSquadre } = await supabase
      .from("classifica")
      .select("squadra");

    if (errSquadre || !squadre?.length)
      throw new Error("Impossibile leggere la lista squadre dalla classifica.");

    console.log(`🔹 ${squadre.length} squadre trovate.`);

    const tuttePartite: any[] = [];

    // 2️⃣ Cicla su ogni squadra
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

      // 3️⃣ Parsing righe della tabella
      rows.each((i, el) => {
        const cols = $(el).find("td");
        if (cols.length < 4) return; // serve giornata + 3 colonne

        const giornataTxt = pulisci($(cols[0]).text());
        if (!giornataTxt.includes("Giornata")) return;

        const dataTxt = giornataTxt.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || null;
        const giornataNum = estraiNumeroGiornata(giornataTxt);

        // Squadre e risultato
        const casaTxt = pulisci($(cols[1]).text());
        const ospiteTxt = pulisci($(cols[2]).text());
        const risultatoTxt = pulisci($(cols[3]).text());

        let goalCasa: number | null = null;
        let goalOspite: number | null = null;

        if (risultatoTxt.includes("-")) {
          const [a, b] = risultatoTxt.split("-").map((x) => parseInt(x.trim()));
          goalCasa = isNaN(a) ? null : a;
          goalOspite = isNaN(b) ? null : b;
        }

        if (!casaTxt || !ospiteTxt) return;

        tuttePartite.push({
          giornata: giornataNum,
          data_match: parseData(dataTxt),
          squadra_casa: casaTxt,
          squadra_ospite: ospiteTxt,
          goal_casa: goalCasa,
          goal_ospite: goalOspite,
        });
        conteggio++;
      });

      console.log(`✅ ${conteggio} partite estratte per ${s.squadra}`);
      await new Promise((r) => setTimeout(r, 800)); // piccola pausa
    }

    if (tuttePartite.length === 0)
      throw new Error("Nessuna partita trovata nei ruolini.");

   // 4️⃣ Filtra i duplicati (stessa data e stesse squadre invertite)
const uniche: any[] = [];
const visti = new Set();

for (const p of tuttePartite) {
  if (!p.data_match || !p.squadra_casa || !p.squadra_ospite) continue;

  // Genera chiave unica indipendente dall'ordine casa/ospite
  const chiave = [
    p.data_match,
    [p.squadra_casa, p.squadra_ospite].sort().join("-"),
    p.goal_casa ?? "x",
    p.goal_ospite ?? "x",
  ].join("|");

  if (!visti.has(chiave)) {
    visti.add(chiave);
    uniche.push(p);
  }
}

// Ordina per data e giornata
uniche.sort((a, b) => {
  if (a.data_match < b.data_match) return -1;
  if (a.data_match > b.data_match) return 1;
  return (a.giornata || 0) - (b.giornata || 0);
});

console.log(
  `🧹 Eliminati ${tuttePartite.length - uniche.length} duplicati. Rimaste ${uniche.length} partite.`
);


    // 5️⃣ Cancella vecchi dati e salva i nuovi
    await supabase
      .from("classifica_partite")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    const { error: insErr } = await supabase
      .from("classifica_partite")
      .insert(uniche);

    if (insErr) throw insErr;

    console.log(`✅ Inserite ${uniche.length} partite totali.`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Partite aggiornate correttamente",
        totale: uniche.length,
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

// 🔧 Funzioni di supporto
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
