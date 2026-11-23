const CACHE = "cbc-v3";
const ARQUIVOS = ["./index.html", "./cbc-manifest.json", "./cbc-192.png", "./cbc-512.png", "./cbc-logo.png"];
const PUBLICOS = new Set(ARQUIVOS.map(arquivo => new URL(arquivo, self.registration.scope).href));
self.addEventListener("install", evento => {
  evento.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", evento => {
  evento.waitUntil(caches.delete("cbc-v2").then(() => self.clients.claim()));
});
self.addEventListener("fetch", evento => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const inicio = self.registration.scope;
  if (request.mode === "navigate" && (request.url === inicio || PUBLICOS.has(request.url))) {
    evento.respondWith(fetch(request).catch(() => caches.match(new URL("index.html", inicio).href)));
  } else if (PUBLICOS.has(request.url)) {
    evento.respondWith(fetch(request).catch(() => caches.match(request)));
  }
});
