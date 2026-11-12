import { ApiError, http, isDemo } from './api';

/**
 * Compte client : session (jeton d'accès en mémoire, renouvelé par le cookie httpOnly `bsandoz_refresh`),
 * mots de passe par lien, rendez-vous (espace client ou lien de gestion), export et suppression.
 * Mode démo (sans VITE_API_URL) : un compte et un rendez-vous fictifs, rien n'est enregistré.
 */

export interface Compte { id: string; email: string; firstname: string; lastname: string; phone: string; roles: string[] }

export interface RendezVous {
  id: string;
  status: 'pending_payment' | 'confirmed' | 'done' | 'cancelled' | 'expired' | 'no_show';
  prestationId: string;
  optionIds: string[];
  /** Début et fin en UTC (ISO 8601). */
  start: string;
  end: string;
  address: string;
  lat: number;
  lng: number;
  totalCents: number;
  depositCents: number;
  /** Jusqu'à cette date (UTC), l'annulation est gratuite et l'acompte remboursé. */
  freeCancelUntil: string;
}

/** Mot de passe accepté par l'API : 10 caractères minimum, au moins une lettre et un chiffre. */
export const motDePasseValide = (mdp: string) => mdp.length >= 10 && /\p{L}/u.test(mdp) && /\d/.test(mdp);

let jeton: string | null = null;
let roles: string[] = [];

export const estConnecte = () => jeton !== null;
export const rolesSession = () => roles;

const demoRendezVous = (): RendezVous => {
  const debut = new Date(Date.now() + 5 * 24 * 3600 * 1000);
  debut.setUTCHours(8, 0, 0, 0);
  const fin = new Date(debut.getTime() + 150 * 60 * 1000);
  return {
    id: 'demo-1', status: 'confirmed', prestationId: 'complet', optionIds: [], start: debut.toISOString(), end: fin.toISOString(),
    address: '10 Rue de la République 80000 Amiens', lat: 49.8941, lng: 2.2958, totalCents: 14900, depositCents: 4470,
    freeCancelUntil: new Date(debut.getTime() - 48 * 3600 * 1000).toISOString(),
  };
};
let demo: RendezVous[] = [];

async function ouvrirSession(reponse: { token: string; roles: string[] }) {
  jeton = reponse.token;
  roles = reponse.roles;
}

export async function seConnecter(email: string, password: string): Promise<void> {
  if (isDemo()) {
    demo = [demoRendezVous()];
    return ouvrirSession({ token: 'demo', roles: ['ROLE_CLIENT', 'ROLE_PRO'] }); // démo : ouvre aussi l'espace pro
  }
  return ouvrirSession(await http('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }));
}

/** Reprend la session depuis le cookie (au chargement de la page). Faux si aucune session. */
export async function reprendreSession(): Promise<boolean> {
  if (isDemo()) return jeton !== null;
  try {
    await ouvrirSession(await http('/auth/refresh', { method: 'POST' }));
    return true;
  } catch {
    jeton = null;
    return false;
  }
}

export async function seDeconnecter(): Promise<void> {
  if (!isDemo()) await http('/auth/logout', { method: 'POST' }).catch(() => undefined);
  jeton = null;
  roles = [];
}

/** Appel authentifié : jeton expiré (15 min) → un renouvellement puis nouvel essai. */
export async function authHttp<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await http<T>(path, init, jeton ?? undefined);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && (await reprendreSession())) return http<T>(path, init, jeton ?? undefined);
    throw e;
  }
}

export async function monCompte(): Promise<Compte> {
  if (isDemo()) return { id: 'demo', email: 'camille@example.org', firstname: 'Camille', lastname: 'Martin', phone: '06 00 00 00 00', roles: ['ROLE_CLIENT'] };
  return authHttp('/me');
}

export async function mesRendezVous(): Promise<RendezVous[]> {
  if (isDemo()) return demo;
  return authHttp('/me/reservations');
}

export async function deplacerMonRendezVous(id: string, start: string): Promise<void> {
  if (isDemo()) { demo = demo.map((r) => (r.id === id ? { ...r, start } : r)); return; }
  return authHttp(`/me/reservations/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ start }) });
}

export async function annulerMonRendezVous(id: string): Promise<{ refundable: boolean }> {
  if (isDemo()) { demo = demo.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)); return { refundable: true }; }
  return authHttp(`/me/reservations/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Télécharge toutes mes données (JSON). */
export async function exporterMesDonnees(): Promise<Blob> {
  const donnees = isDemo() ? { compte: await monCompte(), reservations: demo } : await authHttp<unknown>('/me/export');
  return new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' });
}

export async function supprimerMonCompte(): Promise<void> {
  if (!isDemo()) await authHttp('/me', { method: 'DELETE' });
  jeton = null;
  roles = [];
}

// Liens reçus par e-mail
export async function activerCompte(token: string, password: string): Promise<void> {
  if (isDemo()) return;
  return http('/auth/activate', { method: 'POST', body: JSON.stringify({ token, password }) });
}

export async function demanderNouveauMotDePasse(email: string): Promise<void> {
  if (isDemo()) return;
  return http('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function choisirNouveauMotDePasse(token: string, password: string): Promise<void> {
  if (isDemo()) return;
  return http('/auth/reset', { method: 'POST', body: JSON.stringify({ token, password }) });
}

// Gestion sans compte (lien du mail de confirmation)
export async function rendezVousParLien(token: string): Promise<RendezVous> {
  if (isDemo()) {
    if (demo.length === 0) demo = [demoRendezVous()];
    return demo[0];
  }
  return http(`/booking/manage/${encodeURIComponent(token)}`);
}

export async function deplacerParLien(token: string, start: string): Promise<void> {
  if (isDemo()) { demo = demo.map((r) => ({ ...r, start })); return; }
  await http(`/booking/manage/${encodeURIComponent(token)}`, { method: 'PATCH', body: JSON.stringify({ start }) });
}

export async function annulerParLien(token: string): Promise<{ refundable: boolean }> {
  if (isDemo()) { demo = demo.map((r) => ({ ...r, status: 'cancelled' })); return { refundable: true }; }
  return http(`/booking/manage/${encodeURIComponent(token)}`, { method: 'DELETE' });
}
