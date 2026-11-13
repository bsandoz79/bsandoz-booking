import { http, isDemo } from './api';
import { authHttp } from './compte';

/** Relance automatique des clients absents (e-mail), réglée par le pro. */
export interface ReglageRelance { actif: boolean; jours: number; desinscrits: number }

let demo: ReglageRelance = { actif: false, jours: 90, desinscrits: 0 };

export async function reglageRelance(): Promise<ReglageRelance> {
  if (isDemo()) return demo;
  return authHttp('/admin/settings/relance');
}

export async function enregistrerRelance(r: { actif: boolean; jours: number }): Promise<ReglageRelance> {
  if (isDemo()) {
    if (r.jours < 30 || r.jours > 730) throw new Error('Délai de relance : entre 30 et 730 jours.');
    demo = { ...demo, ...r };
    return demo;
  }
  return authHttp('/admin/settings/relance', { method: 'PUT', body: JSON.stringify(r) });
}

/** Lien de l'e-mail : le client ne sera plus relancé. */
export async function seDesinscrire(u: string, s: string): Promise<void> {
  if (isDemo()) return;
  await http('/relance/desinscription', { method: 'POST', body: JSON.stringify({ u, s }) });
}
