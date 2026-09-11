self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      body: event.data ? event.data.text() : "",
    };
  }

  const title = data.title || "Montecarlo 2013";

  const options = {
    body: data.body || "",
    icon: data.icon || "/icon_192x192.png",
    badge: data.badge || "/icon_192x192.png",
    data: {
      url: data.url || "/",
    },
    ...(data.tag ? { tag: data.tag } : {}),
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let targetUrl;

  try {
    targetUrl = new URL(
      event.notification.data?.url || "/",
      self.location.origin
    );

    // Le notifiche possono aprire solamente pagine della nostra app
    if (targetUrl.origin !== self.location.origin) {
      targetUrl = new URL("/", self.location.origin);
    }
  } catch {
    targetUrl = new URL("/", self.location.origin);
  }

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (clientList) => {
        for (const client of clientList) {
          if ("navigate" in client) {
            await client.navigate(targetUrl.href);
          }

          if ("focus" in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl.href);
        }
      })
  );
});