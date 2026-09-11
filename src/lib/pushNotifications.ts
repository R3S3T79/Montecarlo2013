import { supabase } from "./supabaseClient";

function urlBase64ToUint8Array(
  base64String: string
): Uint8Array {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(
    rawData.length
  );

  for (
    let i = 0;
    i < rawData.length;
    ++i
  ) {
    outputArray[i] =
      rawData.charCodeAt(i);
  }

  return outputArray;
}

export function pushNotificationsSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (!pushNotificationsSupported()) {
    return "unsupported";
  }

  return Notification.permission;
}

// ==========================================
// REGISTRA / SINCRONIZZA SUBSCRIPTION
// CON L'UTENTE ATTUALMENTE AUTENTICATO
// ==========================================

async function syncSubscriptionWithCurrentUser(
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return false;
    }

    const subscriptionJson =
      subscription.toJSON();

    if (
      !subscription.endpoint ||
      !subscriptionJson.keys?.p256dh ||
      !subscriptionJson.keys?.auth
    ) {
      throw new Error(
        "Sottoscrizione push incompleta."
      );
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh:
            subscriptionJson.keys.p256dh,
          auth:
            subscriptionJson.keys.auth,
          user_agent: navigator.userAgent,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "endpoint",
        }
      );

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error(
      "Errore sincronizzazione push:",
      error
    );

    return false;
  }
}

// ==========================================
// CONTROLLO SUBSCRIPTION
// ==========================================

export async function isPushSubscribed(): Promise<boolean> {
  if (!pushNotificationsSupported()) {
    return false;
  }

  try {
    if (Notification.permission !== "granted") {
      return false;
    }

    const registration =
      await navigator.serviceWorker.ready;

    const subscription =
      await registration.pushManager.getSubscription();

    if (!subscription) {
      return false;
    }

    // IMPORTANTE:
    // se sullo stesso browser è cambiato
    // l'utente, l'endpoint viene associato
    // automaticamente all'utente attuale.
    const synchronized =
      await syncSubscriptionWithCurrentUser(
        subscription
      );

    return synchronized;
  } catch (error) {
    console.error(
      "Errore controllo sottoscrizione push:",
      error
    );

    return false;
  }
}

// ==========================================
// ATTIVAZIONE NOTIFICHE
// ==========================================

export async function subscribeToPushNotifications(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!pushNotificationsSupported()) {
    return {
      success: false,
      message:
        "Le notifiche push non sono supportate su questo dispositivo.",
    };
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        message:
          "Devi effettuare l'accesso per attivare le notifiche.",
      };
    }

    // ======================================
    // PERMESSO NOTIFICHE
    // ======================================

    let permission =
      Notification.permission;

    if (permission === "default") {
      permission =
        await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return {
        success: false,
        message:
          "Permesso per le notifiche non concesso.",
      };
    }

    // ======================================
    // VAPID
    // ======================================

    const vapidPublicKey =
      import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      console.error(
        "VITE_VAPID_PUBLIC_KEY non configurata."
      );

      return {
        success: false,
        message:
          "Configurazione notifiche non disponibile.",
      };
    }

    // ======================================
    // SERVICE WORKER
    // ======================================

    const registration =
      await navigator.serviceWorker.ready;

    // ======================================
    // SUBSCRIPTION
    // ======================================

    let subscription =
      await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription =
        await registration.pushManager.subscribe(
          {
            userVisibleOnly: true,
            applicationServerKey:
              urlBase64ToUint8Array(
                vapidPublicKey
              ),
          }
        );
    }

    // ======================================
    // ASSOCIA ALL'UTENTE ATTUALE
    // ======================================

    const synchronized =
      await syncSubscriptionWithCurrentUser(
        subscription
      );

    if (!synchronized) {
      throw new Error(
        "Impossibile associare il dispositivo all'utente."
      );
    }

    return {
      success: true,
      message:
        "Notifiche attivate correttamente.",
    };
  } catch (error) {
    console.error(
      "Errore attivazione notifiche push:",
      error
    );

    return {
      success: false,
      message:
        "Impossibile attivare le notifiche.",
    };
  }
}