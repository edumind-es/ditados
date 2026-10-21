/* Service worker del catálogo de ditados.
   - El índice y las fichas de dictado se sirven de la red y se guardan (si no hay red, se usa la copia).
   - Fuentes, PDF, MP3 y presentaciones se guardan la primera vez y se sirven de la caché después.
   Así, una presentación abierta una vez en el aula sigue funcionando sin conexión, con su audio dentro.
   No se guarda ningún dato de nadie: solo ficheros públicos del propio sitio. */
const VERSION = 'ditados-{{VERSION}}';
const PRECACHE = ['./', './index.html', './manifest.webmanifest', {{FUENTES}}];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/editor')) return;
  const esHtmlCatalogo = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (esHtmlCatalogo) {
    // Red primero; si falla, caché.
    e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request)));
  } else {
    // Caché primero; si no está, red y se guarda.
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); } return r; })));
  }
});
// Mensaje desde la página: guardar una lista de rutas (por ejemplo, la presentación de un dictado) para usarla sin conexión.
self.addEventListener('message', (e) => {
  if (e.data && e.data.tipo === 'guardar' && Array.isArray(e.data.rutas)) {
    e.waitUntil(caches.open(VERSION).then((c) => c.addAll(e.data.rutas)).then(() => e.source && e.source.postMessage({ tipo: 'guardado', rutas: e.data.rutas })).catch((err) => e.source && e.source.postMessage({ tipo: 'error', mensaje: String(err) })));
  }
});
