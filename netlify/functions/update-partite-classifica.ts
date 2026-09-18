// netlify/functions/update-partite-classifica.ts
// Data: 15/11/2025 — Real Calendar Mode (Mercoledì→Martedì) + deduplica + nomi originali

import { Handler } from "@netlify/functions";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAMP_ID = ""; // Inserire qui il nuovo ID Campionando U14 2026/27
const BASE_URL = "https://www.campionando.it/ruolino.php";

const STAGIONE_ID = "6a7cc3ea-b316-4261-85ed-73e310710dd8";
const STAGIONE_NOME = "2026/2027";
const FASE = "Prima Fase";

const FONTE = "campionando";
const STATO_FONTE = "provvisorio";

export const handler: Handler = async () => {
  try {
    // 1️⃣ Legge squadre
    const { data: squadre, error: errSquadre } = await supabase
      .from("classifica")
      .select("squadra");

    if (errSquadre || !squadre?.length)
      throw new Error("Impossibile leggere la lista squadre dalla classifica.");

    console.log(`🔹 ${squadre.length} squadre trovate.`);

    const tuttePartite: any[] = [];

    // 2️⃣ Parsing ruolini Campionando
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

      let estratte = 0;

      rows.each((i, el) => {
        const cols = $(el).find("td");
        if (cols.length < 4) return;

        const giornataTxt = pulisci($(cols[0]).text());
        if (!giornataTxt.includes("Giornata")) return;

        const dataTxt = giornataTxt.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || null;

        const casaTxt = pulisci($(cols[1]).text());
        const ospiteTxt = pulisci($(cols[2]).text());
        const risultatoTxt = pulisci($(cols[3]).text());

        if (!casaTxt || !ospiteTxt) return;

        let goalCasa: number | null = null;
        let goalOspite: number | null = null;

        if (risultatoTxt.includes("-")) {
          const [a, b] = risultatoTxt.split("-").map((x) => parseInt(x.trim()));
          goalCasa = isNaN(a) ? null : a;
          goalOspite = isNaN(b) ? null : b;
        }

        tuttePartite.push({
          data_match: parseData(dataTxt),
          squadra_casa: normalizzaSquadra(casaTxt),
          squadra_ospite: normalizzaSquadra(ospiteTxt),
          squadra_casa_originale: casaTxt,
          squadra_ospite_originale: ospiteTxt,
          goal_casa: goalCasa,
          goal_ospite: goalOspite,
        });

        estratte++;
      });

      console.log(`✅ ${estratte} partite estratte per ${s.squadra}`);

      await new Promise((r) => setTimeout(r, 700)); // piccola pausa
    }

    if (tuttePartite.length === 0)
      throw new Error("Nessuna partita trovata nei ruolini.");

    console.log(`📌 Totale partite grezze: ${tuttePartite.length}`);

    // 3️⃣ Deduplica partite (stessa data + stesse squadre)
    const map = new Map();

    for (const p of tuttePartite) {
      if (!p.data_match) continue;

      const chiave = [
        p.data_match,
        [p.squadra_casa, p.squadra_ospite].sort().join("-"),
      ].join("|");

      if (!map.has(chiave)) {
        map.set(chiave, p);
      } else {
        const salvata = map.get(chiave);

        if (p.goal_casa !== null) salvata.goal_casa = p.goal_casa;
        if (p.goal_ospite !== null) salvata.goal_ospite = p.goal_ospite;
      }
    }

    let partiteUniche = Array.from(map.values());
    console.log(`🧹 Partite dopo deduplica: ${partiteUniche.length}`);

    // 4️⃣ Ordinamento per data
    partiteUniche = partiteUniche.filter((p) => p.data_match !== null);
    partiteUniche.sort((a, b) => (a.data_match! < b.data_match! ? -1 : 1));

    // 5️⃣ Giornate REAL CALENDAR MODE (Mercoledì→Martedì)
    const dateToGiornata = new Map<string, number>();
    let giornataCorrente = 1;

    let currentStart = null;

    for (const p of partiteUniche) {
      const d = new Date(p.data_match!);

      const startOfWeek = mercolediDiQuellaSettimana(d);

      const key = startOfWeek.toISOString().substring(0, 10);

      if (!dateToGiornata.has(key)) {
        dateToGiornata.set(key, giornataCorrente++);
      }

      p.giornata = dateToGiornata.get(key);
    }

    console.log(`📌 Giornate generate: 1 → ${giornataCorrente - 1}`);

    // 6️⃣ Genera i RIPOSI
    const squadreOriginali = squadre.map((s) => s.squadra);
    const maxGiornata = giornataCorrente - 1;

    const calendarioCompleto: any[] = [];

    for (let g = 1; g <= maxGiornata; g++) {
      const partiteG = partiteUniche.filter((p) => p.giornata === g);

      for (const squadra of squadreOriginali) {
        const normale = normalizzaSquadra(squadra);

        const haGiocato = partiteG.some(
          (p) =>
            p.squadra_casa === normale || p.squadra_ospite === normale
        );

        if (!haGiocato) {
          calendarioCompleto.push({
            giornata: g,
            data_match: null,
            squadra_casa: normale,
            squadra_ospite: "riposo",
            squadra_casa_originale: squadra,
            squadra_ospite_originale: "RIPOSO",
            goal_casa: null,
            goal_ospite: null,
          });
        }
      }

      calendarioCompleto.push(...partiteG);
    }

    console.log(
      `📌 Partite + riposi totali: ${calendarioCompleto.length}`
    );

  // 7️⃣ Aggiunge stagione/fase/fonte a tutte le righe
const calendarioDaSalvare = calendarioCompleto.map((p) => ({
  ...p,
  stagione_id: STAGIONE_ID,
  stagione_nome: STAGIONE_NOME,
  fase: FASE,
  fonte: FONTE,
  stato_fonte: STATO_FONTE,
}));

// 8️⃣ Cancella SOLO i dati della stagione/fase/fonte che stiamo aggiornando.
// Lo storico delle altre stagioni rimane intatto.
const { error: deleteErr } = await supabase
  .from("classifica_partite")
  .delete()
  .eq("stagione_id", STAGIONE_ID)
  .eq("fase", FASE)
  .eq("fonte", FONTE);

if (deleteErr) {
  throw new Error(
    `Errore cancellazione vecchi dati ${STAGIONE_NOME} / ${FASE}: ${deleteErr.message}`
  );
}

// 9️⃣ Inserisce il nuovo calendario
const { error: insErr } = await supabase
  .from("classifica_partite")
  .insert(calendarioDaSalvare);

if (insErr) throw insErr;

console.log(
  `✅ Inserite ${calendarioDaSalvare.length} righe — ${STAGIONE_NOME} / ${FASE} / ${FONTE}.`
);

    if (insErr) throw insErr;

    console.log(`✅ Inserite ${calendarioCompleto.length} righe totali.`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Partite aggiornate correttamente (Real Calendar Mode)",
        totale: calendarioDaSalvare.length,
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

// ——— Funzioni di supporto ———

function pulisci(txt: string) {
  return txt.replace(/\s+/g, " ").replace(/\n/g, "").trim();
}

function parseData(txt: string | null): string | null {
  if (!txt) return null;
  const m = txt.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function normalizzaSquadra(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Mercoledì della settimana della partita
function mercolediDiQuellaSettimana(d: Date): Date {
  const giorno = d.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mer, 4=Gio, 5=Ven, 6=Sab
  const distanzaMercoledi =
    giorno >= 3 ? giorno - 3 : giorno + 4; // distanza dal Mercoledì precedente
  const mer = new Date(d);
  mer.setDate(d.getDate() - distanzaMercoledi);
  mer.setHours(0, 0, 0, 0);
  return mer;
}
