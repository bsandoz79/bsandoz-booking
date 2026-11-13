import { isDemo } from './api';
import { authHttp } from './compte';
import { demoRendezVousPro } from './pro';
import type { CarteFidelite } from './fidelite';

/** Résumé d'un client (liste de l'espace pro). */
export interface ClientResume {
  userId: string; nom: string; email: string; phone: string; visites: number; depenseCents: number;
  derniereVisite: string | null; prochainRdv: string | null; aRelancer: boolean;
}

export interface FicheClient extends ClientResume {
  panierMoyenCents: number;
  avoirCents: number;
  fidelite: CarteFidelite | null;
  historique: { id: string; start: string; status: string; prestation: string; quantite: number; totalCents: number }[];
}

const demoAvoirs: Record<string, number> = {};

function demoFiches(): FicheClient[] {
  const parClient = new Map<string, FicheClient>();
  for (const r of demoRendezVousPro()) {
    const f = parClient.get(r.clientId) ?? {
      userId: r.clientId, nom: r.client.name, email: r.client.email, phone: r.client.phone, visites: 0, depenseCents: 0,
      derniereVisite: null, prochainRdv: null, aRelancer: false, panierMoyenCents: 0, avoirCents: demoAvoirs[r.clientId] ?? 0, fidelite: null, historique: [],
    };
    if (r.status === 'confirmed' && new Date(r.start) > new Date()) f.prochainRdv = r.start;
    f.historique.push({ id: r.id, start: r.start, status: r.status, prestation: r.prestation, quantite: r.quantite ?? 1, totalCents: r.totalCents + (r.produitsCents ?? 0) });
    parClient.set(r.clientId, f);
  }
  return [...parClient.values()];
}

export async function clients(): Promise<ClientResume[]> {
  if (isDemo()) return demoFiches();
  return authHttp('/admin/clients');
}

export async function ficheClient(userId: string): Promise<FicheClient> {
  if (isDemo()) {
    const f = demoFiches().find((x) => x.userId === userId);
    if (!f) throw new Error('Client introuvable.');
    return f;
  }
  return authHttp(`/admin/clients/${encodeURIComponent(userId)}`);
}

export async function changerAvoir(userId: string, avoirCents: number): Promise<number> {
  if (isDemo()) { demoAvoirs[userId] = avoirCents; return avoirCents; }
  return (await authHttp<{ avoirCents: number }>(`/admin/clients/${encodeURIComponent(userId)}/avoir`, { method: 'PUT', body: JSON.stringify({ avoirCents }) })).avoirCents;
}
