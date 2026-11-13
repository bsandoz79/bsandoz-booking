import { isDemo } from './api';
import { authHttp } from './compte';

/** Demande d'avis : lien de la page d'avis (ex. fiche Google), joint au mail envoyé quand la prestation est faite. */
export interface ReglageAvis { actif: boolean; lien: string }

let demo: ReglageAvis = { actif: false, lien: '' };

export async function reglageAvis(): Promise<ReglageAvis> {
  if (isDemo()) return demo;
  return authHttp('/admin/settings/avis');
}

export async function enregistrerAvis(r: ReglageAvis): Promise<ReglageAvis> {
  if (isDemo()) {
    const lien = r.lien.trim();
    if (lien !== '' && !/^https:\/\/\S+$/.test(lien)) throw new Error('Le lien d’avis doit être une adresse https:// complète.');
    demo = { actif: r.actif && lien !== '', lien };
    return demo;
  }
  return authHttp('/admin/settings/avis', { method: 'PUT', body: JSON.stringify(r) });
}
