/* Generated at build time. The API and application records are never cached here. */
const CACHE = "nexora-shell-" + __VERSION__;
const ASSETS = __PRECACHE__;
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("nexora-shell-") && key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/.netlify/")
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) =>
          response.ok ? response : caches.match("/index.html"),
        )
        .catch(() => caches.match("/index.html")),
    );
    return;
  }
  if (ASSETS.includes(url.pathname))
    event.respondWith(
      caches.match(url.pathname).then((cached) => cached || fetch(request)),
    );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(async (windows) => {
      const target = "/app/notifications";
      const existing = windows.find((w) =>
        w.url.startsWith(self.location.origin),
      );
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) await existing.navigate(target);
      } else await self.clients.openWindow(target);
    }),
  );
});
