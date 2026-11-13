/*
 * Service worker de Perfect Clean.
 * - Pages : réseau d'abord ; hors connexion, dernière version en cache, sinon page « hors connexion ».
 * - Fichiers du build (/assets/, noms avec empreinte) et icônes : cache d'abord.
 * - API (autre domaine ou /api/) : jamais mise en cache (données personnelles, créneaux en temps réel).
 * - Notifications push (espace pro) : affichage et ouverture de la page indiquée.
 */
const VERSION = 'v6';
const CACHE = `perfect-clean-${VERSION}`;
const A_PRECHARGER = ['/', '/offline.html', '/manifest.webmanifest', '/icon-192.png', '/favicon.png', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(A_PRECHARGER)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => (n.startsWith('perfect-clean-') || n.startsWith('atelier-brillance-')) && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  const url = new URL(requete.url);
  if (requete.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (requete.mode === 'navigate') {
    event.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copie));
          return reponse;
        })
        .catch(async () => (await caches.match('/')) ?? caches.match('/offline.html')),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(requete).then((enCache) => enCache ?? fetch(requete).then((reponse) => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      })),
    );
  }
});

self.addEventListener('push', (event) => {
  let donnees = {};
  try {
    donnees = event.data ? event.data.json() : {};
  } catch {
    donnees = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(self.registration.showNotification(donnees.title ?? 'Perfect Clean', {
    body: donnees.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    lang: 'fr',
    tag: donnees.tag,
    data: { url: donnees.url ?? '/pro' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const cible = new URL(event.notification.data?.url ?? '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((f) => f.url === cible);
      return ouverte ? ouverte.focus() : self.clients.openWindow(cible);
    }),
  );
});
