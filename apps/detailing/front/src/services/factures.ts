import { isDemo } from './api';
import { authHttp } from './compte';

/** Factures (API : /admin/factures, /me/factures, /admin/settings/facturation). */

export interface FactureResume { id: string; numero: string; reservationId: string; emiseLe: string; prestationLe: string; client: string; totalCents: number }
export interface Facture extends Omit<FactureResume, 'client'> {
  vendeur: Record<'nom' | 'adresse' | 'siret' | 'mentionTva' | 'email' | 'telephone', string>;
  client: Record<'nom' | 'email' | 'adresse' | 'entreprise' | 'siret' | 'adresseFacturation', string>;
  lignes: { libelle: string; montantCents: number }[];
  payeEnLigneCents: number;
  payeSurPlaceCents: number;
}
export type InfosVendeur = Facture['vendeur'];

const A_COMPLETER = '[à compléter]';
let vendeurDemo: InfosVendeur = { nom: A_COMPLETER, adresse: A_COMPLETER, siret: A_COMPLETER, mentionTva: 'TVA non applicable, art. 293 B du CGI', email: A_COMPLETER, telephone: A_COMPLETER };
const factureDemo = (): Facture => ({
  id: 'facture-demo', numero: 'F-2026-0001', reservationId: 'demo-1', emiseLe: '2026-11-10T10:00:00+00:00', prestationLe: '2026-11-10T08:00:00+00:00',
  vendeur: vendeurDemo,
  client: { nom: 'Camille Martin', email: 'camille@example.org', adresse: '1 Place Max Lejeune 80100 Abbeville', entreprise: '', siret: '', adresseFacturation: '' },
  lignes: [{ libelle: 'Intérieur Signature', montantCents: 6900 }, { libelle: '2 × Microfibre', montantCents: 1000 }],
  totalCents: 7900, payeEnLigneCents: 0, payeSurPlaceCents: 7900,
});
const resume = (f: Facture): FactureResume => ({ ...f, client: f.client.entreprise || f.client.nom });

// ——— Espace pro ———
export async function factures(): Promise<FactureResume[]> {
  if (isDemo()) return [resume(factureDemo())];
  return authHttp('/admin/factures');
}

export async function facturePro(id: string): Promise<Facture> {
  if (isDemo()) return factureDemo();
  return authHttp(`/admin/factures/${encodeURIComponent(id)}`);
}

/** Émet (ou retrouve) la facture d'une prestation faite. */
export async function emettreFacture(reservationId: string): Promise<Facture> {
  if (isDemo()) return factureDemo();
  return authHttp(`/admin/reservations/${encodeURIComponent(reservationId)}/facture`, { method: 'POST' });
}

export async function factureDeLaReservation(reservationId: string): Promise<{ id: string; numero: string } | null> {
  if (isDemo()) return null;
  return authHttp(`/admin/reservations/${encodeURIComponent(reservationId)}/facture`);
}

export async function infosVendeur(): Promise<InfosVendeur> {
  if (isDemo()) return vendeurDemo;
  return authHttp('/admin/settings/facturation');
}

export async function enregistrerInfosVendeur(infos: InfosVendeur): Promise<InfosVendeur> {
  if (isDemo()) { vendeurDemo = { ...infos, mentionTva: infos.mentionTva || 'TVA non applicable, art. 293 B du CGI' }; return vendeurDemo; }
  return authHttp('/admin/settings/facturation', { method: 'PUT', body: JSON.stringify(infos) });
}

// ——— Espace client ———
export async function mesFactures(): Promise<FactureResume[]> {
  if (isDemo()) return [resume(factureDemo())];
  return authHttp('/me/factures');
}

export async function maFacture(id: string): Promise<Facture> {
  if (isDemo()) return factureDemo();
  return authHttp(`/me/factures/${encodeURIComponent(id)}`);
}
