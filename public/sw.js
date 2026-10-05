// Bonded's service worker: shows phone notifications and opens the right page when one is tapped.
// It caches nothing, so the app always loads fresh from the server.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const url = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/notifications";
  event.waitUntil(
    self.registration.showNotification(data.title || "Bonded", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const ours = windows.filter((w) => new URL(w.url).origin === self.location.origin);
      const open = ours.find((w) => w.visibilityState === "visible") || ours[0];
      if (!open) return self.clients.openWindow(target);
      // Focus while the tap still counts as a user action; navigate can fail for windows this
      // worker doesn't control, and then a fresh window opens instead.
      await open.focus();
      try {
        await open.navigate(target);
      } catch {
        await self.clients.openWindow(target);
      }
    })(),
  );
});
