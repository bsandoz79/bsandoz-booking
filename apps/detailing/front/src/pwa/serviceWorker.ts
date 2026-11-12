/**
 * Enregistre le service worker (`public/sw.js`) : site installable, page hors connexion, notifications push.
 * Uniquement en production (en développement, le cache gênerait le rechargement à chaud).
 */
export function enregistrerServiceWorker(production: boolean = import.meta.env.PROD): Promise<ServiceWorkerRegistration | null> {
  if (!production || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => null);
}
