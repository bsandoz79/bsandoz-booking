import { http, isDemo } from './api';
import { authHttp } from './compte';
import { FORMULES } from '../data/demo';

/**
 * Abonnements (API : /abonnements/offres, /me/abonnements, /admin/abonnements). Une prestation comprise par période,
 * prélevée automatiquement ; une prestation non réservée dans sa période est perdue. Sans engagement.
 */

export type Periodicite = 'semaine' | 'quinzaine' | 'mois' | 'annee';

export const PERIODICITES: { value: Periodicite; label: string }[] = [
  { value: 'semaine', label: 'chaque semaine' },
  { value: 'quinzaine', label: 'tous les 15 jours' },
  { value: 'mois', label: 'chaque mois' },
  { value: 'annee', label: 'chaque année' },
];

/** « / mois », « / 15 jours »… après un prix d'abonnement. */
export const parPeriode = (p: Periodicite) => ({ semaine: '/ semaine', quinzaine: '/ 15 jours', mois: '/ mois', annee: '/ an' })[p];

export interface OffreAbonnement {
  id: string;
  nom: string;
  description: string;
  prestationId: string;
  prestation: string;
  periodicite: Periodicite;
  periodiciteLibelle: string;
  prixCents: number;
  /** Prix normal de la prestation comprise (déduit de chaque prestation réservée avec l'abonnement). */
  prixPrestationCents: number;
}

export interface MonAbonnement {
  id: string;
  statut: 'actif' | 'impaye' | 'termine';
  offre: OffreAbonnement;
  debut: string | null;
  /** Fin de la période payée : prochain prélèvement, ou fin de l'abonnement s'il est résilié. */
  finPeriode: string | null;
  resiliationDemandee: boolean;
  periodeDebut: string | null;
  periodeFin: string | null;
  /** Prestation de la période en cours déjà réservée (date), ou null : encore à réserver. */
  prestationPrevueLe: string | null;
  utilisable: boolean;
}

export interface OffreAbonnementPro {
  id?: string;
  nom: string;
  description: string;
  prestationId: string;
  prestation?: string;
  periodicite: Periodicite;
  periodiciteLibelle?: string;
  prixCents: number;
  active: boolean;
  position?: number;
}

export interface Abonne {
  id: string;
  client: { nom: string; email: string; telephone: string };
  offre: string;
  statut: 'actif' | 'impaye' | 'termine';
  debut: string | null;
  finPeriode: string | null;
  resiliationDemandee: boolean;
}

// ——— Démo : offres sur la formule « Extérieur Éclat », au prix normal de la formule (le pro fixe les vrais prix). ———
const prestationDemo = FORMULES.find((f) => f.id === 'ext-eclat') ?? FORMULES[0];
let offresDemo: OffreAbonnementPro[] = PERIODICITES.map((p, i) => ({
  id: `abo-${p.value}`, nom: `Lavage ${p.label}`, description: '', prestationId: prestationDemo.id, prestation: prestationDemo.name,
  periodicite: p.value, periodiciteLibelle: p.label, prixCents: prestationDemo.basePriceCents, active: true, position: i,
}));
let abonnementDemo: MonAbonnement | null = null;

const versOffre = (o: OffreAbonnementPro): OffreAbonnement => ({
  id: o.id!, nom: o.nom, description: o.description, prestationId: o.prestationId, prestation: o.prestation ?? '',
  periodicite: o.periodicite, periodiciteLibelle: PERIODICITES.find((p) => p.value === o.periodicite)?.label ?? '', prixCents: o.prixCents,
  prixPrestationCents: FORMULES.find((f) => f.id === o.prestationId)?.basePriceCents ?? 0,
});
const ajouter = (date: Date, p: Periodicite) => {
  const d = new Date(date);
  if (p === 'semaine') d.setDate(d.getDate() + 7);
  else if (p === 'quinzaine') d.setDate(d.getDate() + 14);
  else if (p === 'mois') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
};

export async function offresAbonnement(): Promise<OffreAbonnement[]> {
  if (isDemo()) return offresDemo.filter((o) => o.active).map(versOffre);
  return http('/abonnements/offres');
}

export async function mesAbonnements(): Promise<MonAbonnement[]> {
  if (isDemo()) return abonnementDemo ? [abonnementDemo] : [];
  return authHttp('/me/abonnements');
}

/** Adresse de paiement de la première période (la carte sert ensuite aux prélèvements suivants). */
export async function souscrire(offreId: string): Promise<string> {
  if (isDemo()) {
    const offre = offresDemo.find((o) => o.id === offreId);
    if (!offre) throw new Error('Abonnement introuvable.');
    const debut = new Date();
    const fin = ajouter(debut, offre.periodicite);
    abonnementDemo = {
      id: 'abonnement-demo', statut: 'actif', offre: versOffre(offre), debut: debut.toISOString(), finPeriode: fin.toISOString(), resiliationDemandee: false,
      periodeDebut: debut.toISOString(), periodeFin: fin.toISOString(), prestationPrevueLe: null, utilisable: true,
    };
    return '/mon-espace?abonnement=ok';
  }
  return (await authHttp<{ url: string }>('/me/abonnements', { method: 'POST', body: JSON.stringify({ offreId }) })).url;
}

/** Résiliation : l'abonnement reste actif jusqu'à la fin de la période payée. */
export async function resilier(abonnementId: string): Promise<void> {
  if (isDemo()) { if (abonnementDemo) abonnementDemo = { ...abonnementDemo, resiliationDemandee: true }; return; }
  await authHttp(`/me/abonnements/${encodeURIComponent(abonnementId)}/resilier`, { method: 'POST' });
}

/** Démo : la prestation de la période est réservée (appelé après une réservation avec l'abonnement). */
export function noterPrestationDemo(start: string): void {
  if (isDemo() && abonnementDemo) abonnementDemo = { ...abonnementDemo, prestationPrevueLe: start };
}

export async function offresAbonnementPro(): Promise<OffreAbonnementPro[]> {
  if (isDemo()) return offresDemo;
  return authHttp('/admin/abonnements/offres');
}

export async function enregistrerOffre(offre: OffreAbonnementPro): Promise<OffreAbonnementPro> {
  if (isDemo()) {
    const prestation = FORMULES.find((f) => f.id === offre.prestationId)?.name ?? '';
    const enregistree = { ...offre, id: offre.id ?? `abo-${Date.now()}`, prestation, periodiciteLibelle: PERIODICITES.find((p) => p.value === offre.periodicite)?.label };
    offresDemo = offre.id ? offresDemo.map((o) => (o.id === offre.id ? enregistree : o)) : [...offresDemo, enregistree];
    return enregistree;
  }
  const corps = JSON.stringify({ nom: offre.nom, description: offre.description, prestationId: offre.prestationId, periodicite: offre.periodicite, prixCents: offre.prixCents, active: offre.active, ...(offre.position !== undefined ? { position: offre.position } : {}) });
  return offre.id
    ? authHttp(`/admin/abonnements/offres/${encodeURIComponent(offre.id)}`, { method: 'PUT', body: corps })
    : authHttp('/admin/abonnements/offres', { method: 'POST', body: corps });
}

export async function abonnes(): Promise<Abonne[]> {
  if (isDemo()) {
    return abonnementDemo ? [{ id: abonnementDemo.id, client: { nom: 'Client démo', email: 'client@exemple.fr', telephone: '' }, offre: abonnementDemo.offre.nom,
      statut: abonnementDemo.statut, debut: abonnementDemo.debut, finPeriode: abonnementDemo.finPeriode, resiliationDemandee: abonnementDemo.resiliationDemandee }] : [];
  }
  return authHttp('/admin/abonnements');
}
