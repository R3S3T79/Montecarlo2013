// =======================================
// 1. IMPORT
// =======================================

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// =======================================
// 2. CONFIGURAZIONE
// =======================================

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const VAPID_PUBLIC_KEY =
  process.env.VITE_VAPID_PUBLIC_KEY;

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY;

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:marcomiressi@gmail.com";

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

// =======================================
// 3. HANDLER
// =======================================

export const handler: Handler = async () => {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !VAPID_PUBLIC_KEY ||
    !VAPID_PRIVATE_KEY
  ) {
    console.error("Variabili ambiente mancanti");

    return json(500, {
      error: "Configurazione server incompleta",
    });
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // =======================================
    // 4. CONTROLLO ORARIO ITALIANO
    // =======================================

    const now = new Date();

    const italianParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);

    const getPart = (type: string) =>
      italianParts.find((part) => part.type === type)?.value || "";

    const year = getPart("year");
    const month = getPart("month");
    const day = getPart("day");
    const hour = getPart("hour");

    const today = `${year}-${month}-${day}`;

    // =======================================
// TEST TEMPORANEO - CONTROLLO ORARIO DISATTIVATO
// =======================================

/*
if (hour !== "08") {
  console.log(
    `Birthday push ignorata: in Italia sono le ore ${hour}`
  );

  return json(200, {
    success: true,
    skipped: true,
    reason: "Fuori dall'orario previsto",
    italianHour: hour,
  });
}
*/

    // =======================================
    // 5. RECUPERA STAGIONE CORRENTE
    // =======================================

    const { data: stagione, error: stagioneError } =
      await supabase
        .from("stagioni")
        .select("id")
        .lte("data_inizio", today)
        .gte("data_fine", today)
        .maybeSingle();

    if (stagioneError) {
      console.error(
        "Errore recupero stagione:",
        stagioneError.message
      );

      return json(500, {
        error: "Errore recupero stagione corrente",
      });
    }

    if (!stagione?.id) {
      console.log("Nessuna stagione corrente trovata");

      return json(200, {
        success: true,
        sent: 0,
        message: "Nessuna stagione corrente trovata",
      });
    }

    // =======================================
    // 6. RECUPERA GIOCATORI
    // =======================================

    const { data: giocatori, error: giocatoriError } =
      await supabase
        .from("v_giocatori_completo")
        .select(
          "giocatore_uid, nome, cognome, data_nascita"
        )
        .eq("stagione_id", stagione.id)
        .not("data_nascita", "is", null);

    if (giocatoriError) {
      console.error(
        "Errore recupero giocatori:",
        giocatoriError.message
      );

      return json(500, {
        error: "Errore recupero giocatori",
      });
    }

    // =======================================
    // 7. TROVA I COMPLEANNI DI OGGI
    // =======================================

    const birthdayPlayers = (giocatori || []).filter(
      (giocatore) => {
        if (!giocatore.data_nascita) {
          return false;
        }

        const birthDate = String(giocatore.data_nascita);
        const birthMonthDay = birthDate.slice(5, 10);
        const todayMonthDay = today.slice(5, 10);

        return birthMonthDay === todayMonthDay;
      }
    );

    if (birthdayPlayers.length === 0) {
      console.log("Nessun compleanno oggi");

      return json(200, {
        success: true,
        sent: 0,
        message: "Nessun compleanno oggi",
      });
    }

    // =======================================
    // 8. RECUPERA DISPOSITIVI
    // =======================================

    const { data: subscriptions, error: subsError } =
      await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth");

    if (subsError) {
      console.error(
        "Errore recupero push subscriptions:",
        subsError.message
      );

      return json(500, {
        error: "Errore recupero dispositivi",
      });
    }

    if (!subscriptions?.length) {
      return json(200, {
        success: true,
        sent: 0,
        message: "Nessun dispositivo registrato",
      });
    }

    // =======================================
    // 9. CONFIGURA WEB PUSH
    // =======================================

    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    let sent = 0;
    let failed = 0;
    let duplicate = 0;

    const staleIds = new Set<string>();

    // =======================================
    // 10. INVIO COMPLEANNI
    // =======================================

    for (const giocatore of birthdayPlayers) {
      const giocatoreUid = String(
        giocatore.giocatore_uid || ""
      ).trim();

      if (!giocatoreUid) {
        continue;
      }

      const nome = String(giocatore.nome || "").trim();
      const cognome = String(
        giocatore.cognome || ""
      ).trim();

      const nomeCompleto =
        `${nome} ${cognome}`.trim() || "un nostro ragazzo";

      const eventKey =
        `birthday:${today}:${giocatoreUid}`;

      // =======================================
      // 11. BLOCCO DUPLICATI
      // =======================================

      const { error: logError } = await supabase
        .from("birthday_push_log")
        .insert({
          event_key: eventKey,
          giocatore_uid: giocatoreUid,
          birthday_date: today,
        });

      if (logError) {
        if (logError.code === "23505") {
          console.log(
            "Notifica compleanno già inviata:",
            eventKey
          );

          duplicate++;
          continue;
        }

        console.error(
          "Errore registrazione birthday_push_log:",
          logError.message
        );

        continue;
      }

      // =======================================
      // 12. COSTRUZIONE NOTIFICA
      // =======================================

      const title =
        `🎂 Oggi è il compleanno di ${nomeCompleto}!`;

      const message =
        "Facciamogli sentire tutto il calore della famiglia Montecarlo 2013 e rendiamo speciale questa giornata! ❤️⚽ " +
        `Tutti insieme: tanti auguri ${nome}! 🎉`;

      const payload = JSON.stringify({
        title,
        body: message,
        url: "/",
        tag: eventKey,
      });

      let playerSent = 0;

      // =======================================
      // 13. INVIO AI DISPOSITIVI
      // =======================================

      await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              payload,
              {
                TTL: 3600,
              }
            );

            sent++;
            playerSent++;
          } catch (err: any) {
            failed++;

            const statusCode =
              err?.statusCode || err?.status;

            console.error(
              "Errore invio birthday push:",
              statusCode,
              err?.message
            );

            if (
              statusCode === 404 ||
              statusCode === 410
            ) {
              staleIds.add(sub.id);
            }
          }
        })
      );

      // =======================================
      // 14. RIPRISTINO LOG SE INVIO FALLITO
      // =======================================

      if (playerSent === 0) {
        await supabase
          .from("birthday_push_log")
          .delete()
          .eq("event_key", eventKey);
      }
    }

    // =======================================
    // 15. PULIZIA SUBSCRIPTION SCADUTE
    // =======================================

    if (staleIds.size > 0) {
      const { error: deleteError } =
        await supabase
          .from("push_subscriptions")
          .delete()
          .in("id", [...staleIds]);

      if (deleteError) {
        console.error(
          "Errore eliminazione subscription scadute:",
          deleteError.message
        );
      }
    }

    // =======================================
    // 16. RISPOSTA
    // =======================================

    return json(200, {
      success: true,
      date: today,
      birthdays: birthdayPlayers.length,
      sent,
      failed,
      duplicate,
    });
  } catch (error: any) {
    console.error(
      "Errore birthday-push:",
      error?.message || error
    );

    return json(500, {
      error: "Errore durante l'invio delle notifiche di compleanno",
    });
  }
};