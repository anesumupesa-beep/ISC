const CACHE = "isc-connect-next-v2";
let offlineNavigation = false;
const CORE = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable.png",
  "/mauritius-coast.jpg",
  "/fonts/dm-sans.woff2",
  "/fonts/inter.woff2",
  "/fonts/ibm-plex-mono-400.woff2",
  "/fonts/ibm-plex-mono-500.woff2",
];
// Auth and API traffic always goes to the network; welfare and admin pages are never stored on the device.
const NEVER_CACHE = /^\/(api|sign-in|sign-out|auth|admin|welfare|welfare-staff)(\/|$)/;
const OFFLINE_HTML =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | ISC Connect</title><body style="font-family:system-ui;padding:2rem;background:#F8F6EF;color:#23335C"><h1>You’re offline.</h1><p>Open ISC Connect again once you are back online.</p></body>';

async function cachePage(cache, url, response) {
  if (!response.ok || response.redirected) return;
  await cache.put(new URL(url).pathname, response.clone());
  // Keep the page's own JS/CSS chunks so an offline reload hydrates and is styled.
  const html = await response.text();
  const assets = new Set(html.match(/\/_next\/static\/[^"'\\\s)]+/g) || []);
  await Promise.all(
    [...assets].map(async (asset) => {
      if (!(await cache.match(asset))) await cache.add(asset).catch(() => {});
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("isc-connect-") && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
      // The first visited page loaded before this worker existed; store it now so it reloads offline.
      const cache = await caches.open(CACHE);
      const windows = await self.clients.matchAll({ type: "window" });
      await Promise.all(
        windows
          .filter((client) => !NEVER_CACHE.test(new URL(client.url).pathname))
          .map((client) =>
            fetch(client.url)
              .then((response) => cachePage(cache, client.url, response))
              .catch(() => {}),
          ),
      );
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ISC_NETWORK_STATE") {
    event.source?.postMessage({ type: "ISC_NETWORK_STATE", offline: offlineNavigation });
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Only same-origin GETs; server-action POSTs and cross-origin requests pass straight through.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (NEVER_CACHE.test(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          offlineNavigation = false;
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cachePage(cache, request.url, copy)));
          return response;
        })
        .catch(async () => {
          offlineNavigation = true;
          return (
            (await caches.match(url.pathname)) ||
            (await caches.match("/")) ||
            new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
          );
        }),
    );
    return;
  }

  // RSC payloads (?_rsc=) and other dynamic GETs are not cached: only hashed build output and core assets.
  if (!url.pathname.startsWith("/_next/static/") && !CORE.includes(url.pathname)) return;
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
          }
          return response;
        }),
    ),
  );
});
