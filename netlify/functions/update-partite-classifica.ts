// netlify/functions/update-partite-classifica.ts
// Data: 05/11/2025 — Test fetch ruolini da Campionando.it (senza parsing, solo log)

import { Handler } from "@netlify/functions";
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

    // 2️⃣ Cicla le squadre per scaricare la pagina ruolino
    for (const s of squadre) {
      const nomeSquadra = encodeURIComponent(s.squadra);
      const url = `${BASE_URL}?squadra=${nomeSquadra}&camp=${CAMP_ID}&nome=${nomeSquadra}`;

      console.log(`\n📡 Inizio fetch per squadra: ${s.squadra}`);
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

        console.log(`🔁 Risposta HTTP: ${response.status} (${response.statusText})`);

        if (!response.ok) {
          console.warn(`⚠️ Errore nel download per ${s.squadra} → status ${response.status}`);
          continue;
        }

        html = await response.text();
        console.log(`✅ Pagina HTML scaricata correttamente (${html.length} caratteri)`);

      } catch (error: any) {
        console.error(`❌ Errore fetch per ${s.squadra}:`, error.message || error);
        continue;
      }

      if (!html) {
        console.warn(`⚠️ Nessun HTML disponibile per ${s.squadra}, salto...`);
        continue;
      }

      // Log anteprima HTML (prime 300 lettere)
      console.log("📜 Anteprima HTML:", html.slice(0, 300));

      // TODO: parsing cheerio qui (temporaneamente solo test)
      console.log(`ℹ️ Parsing non ancora attivo per ${s.squadra}`);

      // Attendi 1 secondo tra le richieste per non sovraccaricare Campionando
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log("✅ Fine ciclo di test — nessuna partita salvata per ora.");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Test completato — log disponibile su Netlify.",
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
