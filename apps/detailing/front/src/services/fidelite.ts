import { http, isDemo } from './api';
import { authHttp } from './compte';

/** Carte de fidélité (API : /fidelite, /me/fidelite, /admin/fidelite/{userId}, /admin/settings/fidelite). */

export interface RegleFidelite { actif: boolean; tamponsRequis: number; remisePercent: number }
export interface CarteFidelite extends RegleFidelite { tampons: number; remiseDisponible: boolean }

let regleDemo: RegleFidelite = { actif: true, tamponsRequis: 4, remisePercent: 20 };
const cartesDemo = new Map<string, number>([['demo', 2]]);

const carteDemo = (userId: string): CarteFidelite => {
  const tampons = cartesDemo.get(userId) ?? 0;
  return { ...regleDemo, tampons, remiseDisponible: regleDemo.actif && tampons >= regleDemo.tamponsRequis };
};

export async function regleFidelite(): Promise<RegleFidelite> {
  if (isDemo()) return regleDemo;
  return http('/fidelite');
}

export async function maCarteFidelite(): Promise<CarteFidelite> {
  if (isDemo()) return carteDemo('demo');
  return authHttp('/me/fidelite');
}

export async function carteClient(userId: string): Promise<CarteFidelite> {
  if (isDemo()) return carteDemo(userId);
  return authHttp(`/admin/fidelite/${encodeURIComponent(userId)}`);
}

/** Ajoute (+) ou retire (−) des tampons sur la carte d'un client (espace pro). */
export async function ajusterCarte(userId: string, delta: number): Promise<CarteFidelite> {
  if (isDemo()) { cartesDemo.set(userId, Math.max(0, (cartesDemo.get(userId) ?? 0) + delta)); return carteDemo(userId); }
  return authHttp(`/admin/fidelite/${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify({ delta }) });
}

export async function modifierRegleFidelite(regle: RegleFidelite): Promise<RegleFidelite> {
  if (isDemo()) { regleDemo = regle; return regle; }
  return authHttp('/admin/settings/fidelite', { method: 'PUT', body: JSON.stringify(regle) });
}

/** « Encore 2 prestations avant 20 % de remise » ou « Votre prochaine réservation : −20 % ». */
export function messageCarte(c: CarteFidelite): string {
  if (c.remiseDisponible) return `Carte pleine : ${c.remisePercent} % de remise sur votre prochaine réservation, appliqués automatiquement.`;
  const reste = c.tamponsRequis - c.tampons;
  return `Encore ${reste} prestation${reste > 1 ? 's' : ''} avant ${c.remisePercent} % de remise.`;
}
