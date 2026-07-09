self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "Boltalka", body: "", url: "/" };
  try {
    const parsed = event.data?.json();
    if (parsed) data = { ...data, ...parsed };
  } catch {
    data.body = event.data?.text() || "";
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    }),
  );
});
