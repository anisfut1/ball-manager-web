/* Service Worker Ball Manager.
 *
 * Volontairement MINIMAL et sûr pour les données personnelles :
 *  - seuls sont mis en cache des fichiers statiques non personnels (page hors ligne,
 *    icônes, /_next/static/* qui est versionné par hash) ;
 *  - AUCUNE page HTML, AUCUNE réponse d'API, AUCUN cookie/jeton n'est jamais mis en cache :
 *    un appareil partagé ne peut donc pas rejouer les données d'une autre personne ;
 *  - hors ligne, une navigation affiche /offline.html.
 * Mise à jour : le nouveau worker reste « en attente » jusqu'à ce que l'utilisateur
 * accepte (message SKIP_WAITING envoyé par PwaRegister), pour ne pas recharger en pleine saisie.
 */
const VERSION = "bm-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PRECACHE = ["/offline.html", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API ball-manager-back, Supabase… : jamais interceptés.

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match("/offline.html")) || new Response("Hors ligne", { status: 503 })),
    );
  }
  // Tout le reste : réseau direct (aucune mise en cache).
});

/* --- Web Push (infrastructure préparée, aucune notification envoyée pour l'instant) --- */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = typeof data.title === "string" && data.title ? data.title : "Ball Manager";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag : undefined,
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
