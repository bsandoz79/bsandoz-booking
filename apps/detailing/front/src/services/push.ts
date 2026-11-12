import { http, isDemo } from './api';
import { authHttp } from './compte';

/**
 * Notifications push du pro sur cet appareil (Web Push) : le service worker (`public/sw.js`) affiche les notifications
 * envoyées par l'API à chaque rendez-vous confirmé, annulé ou déplacé.
 */

export type EtatPush = 'non-pris-en-charge' | 'non-configure' | 'refuse' | 'inactif' | 'actif';

/** Clé VAPID (base64url) → octets attendus par `pushManager.subscribe`. */
export function cleEnOctets(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const brut = atob(base64);
  const octets = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i++) octets[i] = brut.charCodeAt(i);
  return octets;
}

const prisEnCharge = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function clePublique(): Promise<string | null> {
  if (isDemo()) return null;
  return (await http<{ publicKey: string | null }>('/push/key')).publicKey;
}

async function abonnementActuel(): Promise<PushSubscription | null> {
  const enregistrement = await navigator.serviceWorker.getRegistration('/');
  return enregistrement ? enregistrement.pushManager.getSubscription() : null;
}

export async function etatPush(): Promise<EtatPush> {
  if (!prisEnCharge()) return 'non-pris-en-charge';
  if (!(await clePublique())) return 'non-configure';
  if (Notification.permission === 'denied') return 'refuse';
  return (await abonnementActuel()) ? 'actif' : 'inactif';
}

/** Demande l'autorisation, abonne l'appareil et l'enregistre côté API. */
export async function activerPush(): Promise<EtatPush> {
  const cle = await clePublique();
  if (!prisEnCharge()) return 'non-pris-en-charge';
  if (!cle) return 'non-configure';
  if ((await Notification.requestPermission()) !== 'granted') return 'refuse';
  const enregistrement = await navigator.serviceWorker.ready;
  const abonnement = (await enregistrement.pushManager.getSubscription())
    ?? (await enregistrement.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(cle) }));
  await authHttp('/admin/push', { method: 'POST', body: JSON.stringify(abonnement.toJSON()) });
  return 'actif';
}

export async function desactiverPush(): Promise<EtatPush> {
  const abonnement = prisEnCharge() ? await abonnementActuel() : null;
  if (abonnement) {
    await authHttp('/admin/push', { method: 'DELETE', body: JSON.stringify({ endpoint: abonnement.endpoint }) }).catch(() => undefined);
    await abonnement.unsubscribe();
  }
  return 'inactif';
}
