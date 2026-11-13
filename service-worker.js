"use strict";

/*
 * OFOQ offline shell service worker.
 * Cache only same-origin app-shell assets; never cache API/auth responses.
 */
const CACHE_PREFIX = "ofoq-shell-";
const CACHE_NAME = CACHE_PREFIX + "v51";
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./ofoq-icon.svg",
  "./ecommerce-studio.js",
  "./career-studio.js",
  "./operations-hub.js",
  "./ofoq-core.js",
  "./ofoq-commerce-cloud.js",
  "./ofoq-vault.js"
];

const APP_SCOPE = new URL("./", self.location.href);
const INDEX_URL = new URL("./index.html", self.location.href).href;

function isInAppScope(url) {
  return url.origin === APP_SCOPE.origin && url.pathname.startsWith(APP_SCOPE.pathname);
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isInAppScope(url) || url.search) return;

  const isPage = request.mode === "navigate" || url.pathname.endsWith("/index.html");

  if (isPage) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return (await cache.match(request)) ||
          (await cache.match(INDEX_URL)) ||
          Response.error();
      }
    })());
    return;
  }

  // Cache-first only for versioned app assets, never arbitrary API/data requests.
  if (!["script", "style", "image", "font", "manifest"].includes(request.destination)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
