import { DEMO_RULES, FORMULES, OPTIONS, tarifDe, PRODUITS } from '../data/demo';
import { isDemo, type Address, type Contact } from './api';
import { authHttp } from './compte';

/**
 * Espace pro (`/api/v1/admin`, rôle ROLE_PRO). Dates de l'API en UTC (ISO 8601) ; jours au format AAAA-MM-JJ
 * (minuit dans le fuseau du pro). Mode démo : données en mémoire, rien n'est enregistré.
 */

export interface TableauDeBord {
  today: number;
  week: number;
  monthRevenueCents: number;
  monthBookings: number;
  pendingPayments: number;
  monthCancellationRate: number;
  next: { id: string; start: string; address: string }[];
}

export interface RendezVousPro {
  id: string;
  status: 'pending_payment' | 'confirmed' | 'done' | 'cancelled' | 'expired' | 'no_show';
  start: string;
  end: string;
  prestationId: string;
  prestation: string;
  variante: string | null;
  optionIds: string[];
  /** Identifiant du compte client (carte de fidélité). */
  clientId: string;
  client: { name: string; email: string; phone: string };
  address: string;
  totalCents: number;
  depositCents: number;
  remiseFideliteCents?: number;
  /** Produits à apporter, déjà payés en ligne. */
  produits?: { id: string; nom: string; prixCents: number; quantite: number }[];
  produitsCents?: number;
  travelFeeCents: number;
  notes: string;
  metierData: Record<string, unknown>;
}

export interface Tarif { priceCents: number; durationMin: number }

export interface PrestationPro {
  id?: string;
  name: string;
  description: string;
  basePriceCents: number;
  baseDurationMin: number;
  active: boolean;
  categoryId: string | null;
  position: number;
  occupePlage: boolean;
  tarifs: Record<string, Tarif>;
  optionIds: string[];
}

/** Produit vendu avec les réservations ; stock à 0 ou inactif : plus proposé sur le site. */
export interface ProduitPro { id?: string; name: string; description: string; priceCents: number; stock: number; active: boolean; position: number; photo: string | null }

export interface OptionPro { id?: string; name: string; description: string; priceCents: number; durationMin: number; active: boolean }

export interface Plage { weekday: number; startsAt: string; endsAt: string }
export interface Indisponibilite { id: string; start: string; end: string; reason: string }

export interface Regles {
  minNoticeHours: number; horizonDays: number; bufferMin: number; slotStepMin: number;
  freeCancelHours: number; depositPercent: number; depositFixedCents: number; holdMinutes: number;
}
export interface Zone {
  originLat: number; originLng: number; freeRadiusKm: number; pricePerKmCents: number; maxDistanceKm: number;
  roadFactor?: number; averageSpeedKmh?: number;
  /** Frais par tranches au-delà du rayon offert (vide : prix au km). */
  paliers?: { jusquaKm: number; prixCents: number }[];
}
export interface Reglages { rules: Regles; zone: Zone | null; timezone: string }

export interface NouveauRendezVous {
  prestationId: string;
  variante: string;
  optionIds: string[];
  metierData: Record<string, unknown>;
  start: string;
  address: Address | null;
  contact: Contact;
  /** Vrai : un lien de paiement de l'acompte est envoyé au client ; faux : rendez-vous confirmé tout de suite. */
  sendDepositLink: boolean;
}

const json = (body: unknown) => ({ body: JSON.stringify(body) });

// ——— Démo ———
const demoDebut = (jours: number, heure: number) => {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(heure, 0, 0, 0);
  return d;
};
const demoRdv = (id: string, jours: number, heure: number, duree: number, prestationId: string, client: string, status: RendezVousPro['status'] = 'confirmed'): RendezVousPro => {
  const debut = demoDebut(jours, heure);
  const f = FORMULES.find((x) => x.id === prestationId) ?? FORMULES[0];
  const tarif = tarifDe(f);
  return {
    id, status, start: debut.toISOString(), end: new Date(debut.getTime() + duree * 60000).toISOString(), prestationId, prestation: f.name,
    variante: null, optionIds: [], clientId: `client-${id}`, client: { name: client, email: 'client@example.org', phone: '06 00 00 00 00' },
    address: '1 Place Max Lejeune 80100 Abbeville', totalCents: tarif.priceCents, depositCents: Math.ceil(tarif.priceCents * 0.3), travelFeeCents: 0,
    notes: '', metierData: {},
  };
};
const demo = {
  rdv: [
    demoRdv('d1', 0, 9, 90, 'int-eclat', 'Client démo A'),
    demoRdv('d2', 1, 14, 210, 'int-signature', 'Client démo B'),
    demoRdv('d3', 3, 8, 120, 'ext-signature', 'Client démo C', 'pending_payment'),
  ],
  prestations: FORMULES.map((f, i): PrestationPro => {
    return { id: f.id, name: f.name, description: f.description, basePriceCents: f.basePriceCents, baseDurationMin: f.baseDurationMin, active: true, categoryId: f.category, position: i, occupePlage: !!f.occupePlage, tarifs: f.tarifs, optionIds: f.optionIds };
  }),
  options: OPTIONS.map((o): OptionPro => ({ ...o, active: true })),
  produits: PRODUITS.map(({ photo, ...p }, i): ProduitPro => ({ ...p, photo, active: true, position: i })),
  horaires: [1, 2, 3, 4, 5].flatMap((j) => [{ weekday: j, startsAt: '08:00', endsAt: '12:00' }, { weekday: j, startsAt: '13:30', endsAt: '18:00' }]).concat([{ weekday: 6, startsAt: '08:00', endsAt: '12:00' }]) as Plage[],
  indisponibilites: [] as Indisponibilite[],
  reglages: {
    rules: { minNoticeHours: 24, horizonDays: 60, bufferMin: 15, slotStepMin: 30, freeCancelHours: 48, depositPercent: DEMO_RULES.depositPercent, depositFixedCents: 0, holdMinutes: 10 },
    zone: { paliers: DEMO_RULES.paliers, originLat: DEMO_RULES.origin.lat, originLng: DEMO_RULES.origin.lng, freeRadiusKm: DEMO_RULES.freeRadiusKm, pricePerKmCents: DEMO_RULES.pricePerKmCents, maxDistanceKm: DEMO_RULES.maxDistanceKm },
    timezone: 'Europe/Paris',
  } as Reglages,
};
let demoId = 100;

// ——— Tableau de bord et planning ———
export async function tableauDeBord(): Promise<TableauDeBord> {
  if (isDemo()) {
    const actifs = demo.rdv.filter((r) => r.status === 'confirmed');
    return {
      today: actifs.filter((r) => new Date(r.start).toDateString() === new Date().toDateString()).length, week: actifs.length,
      monthRevenueCents: actifs.reduce((s, r) => s + r.totalCents, 0), monthBookings: actifs.length,
      pendingPayments: demo.rdv.filter((r) => r.status === 'pending_payment').length, monthCancellationRate: 0,
      next: actifs.map((r) => ({ id: r.id, start: r.start, address: r.address })),
    };
  }
  return authHttp('/admin/dashboard');
}

/** Rendez-vous du jour `from` (inclus) au jour `to` (exclu), format AAAA-MM-JJ. */
export async function planning(from: string, to: string): Promise<RendezVousPro[]> {
  if (isDemo()) return demo.rdv;
  return authHttp(`/admin/reservations?from=${from}&to=${to}`);
}

export async function changerStatut(id: string, status: 'done' | 'no_show'): Promise<void> {
  if (isDemo()) { demo.rdv = demo.rdv.map((r) => (r.id === id ? { ...r, status } : r)); return; }
  return authHttp(`/admin/reservations/${encodeURIComponent(id)}`, { method: 'PATCH', ...json({ status }) });
}

export async function annulerRendezVous(id: string, refund: boolean): Promise<{ refundedCents: number }> {
  if (isDemo()) {
    const r = demo.rdv.find((x) => x.id === id);
    demo.rdv = demo.rdv.map((x) => (x.id === id ? { ...x, status: 'cancelled' } : x));
    return { refundedCents: refund && r ? r.depositCents : 0 };
  }
  return authHttp(`/admin/reservations/${encodeURIComponent(id)}/cancel`, { method: 'POST', ...json({ refund }) });
}

export async function rembourser(id: string, amountCents?: number): Promise<{ refundedCents: number }> {
  if (isDemo()) return { refundedCents: amountCents ?? demo.rdv.find((r) => r.id === id)?.depositCents ?? 0 };
  return authHttp(`/admin/reservations/${encodeURIComponent(id)}/refund`, { method: 'POST', ...json(amountCents === undefined ? {} : { amountCents }) });
}

export async function ajouterRendezVous(n: NouveauRendezVous): Promise<{ reservationId: string; status: string; paymentUrl: string | null }> {
  if (isDemo()) {
    const f = FORMULES.find((x) => x.id === n.prestationId) ?? FORMULES[0];
    const tarif = tarifDe(f, n.variante);
    const id = `d${demoId++}`;
    demo.rdv.push({
      ...demoRdv(id, 0, 8, tarif.durationMin, f.id, `${n.contact.firstname} ${n.contact.lastname}`, n.sendDepositLink ? 'pending_payment' : 'confirmed'),
      start: n.start, end: new Date(new Date(n.start).getTime() + tarif.durationMin * 60000).toISOString(), address: n.address?.label ?? '',
    });
    return { reservationId: id, status: n.sendDepositLink ? 'pending_payment' : 'confirmed', paymentUrl: null };
  }
  const { contact, ...reste } = n;
  return authHttp('/admin/reservations', { method: 'POST', ...json({ ...reste, ...contact, acceptedTerms: true }) });
}

// ——— Catalogue ———
export async function catalogue(): Promise<{ prestations: PrestationPro[]; options: OptionPro[] }> {
  if (isDemo()) return { prestations: demo.prestations, options: demo.options };
  return authHttp('/admin/catalog');
}

export async function enregistrerPrestation(p: PrestationPro): Promise<PrestationPro> {
  const { id, ...donnees } = p;
  if (isDemo()) {
    const enregistree = { ...donnees, id: id ?? `p${demoId++}` };
    demo.prestations = id ? demo.prestations.map((x) => (x.id === id ? enregistree : x)) : [...demo.prestations, enregistree];
    return enregistree;
  }
  return authHttp(id ? `/admin/catalog/prestations/${encodeURIComponent(id)}` : '/admin/catalog/prestations', { method: id ? 'PUT' : 'POST', ...json(donnees) });
}

export async function enregistrerOption(o: OptionPro): Promise<OptionPro> {
  const { id, ...donnees } = o;
  if (isDemo()) {
    const enregistree = { ...donnees, id: id ?? `o${demoId++}` };
    demo.options = id ? demo.options.map((x) => (x.id === id ? enregistree : x)) : [...demo.options, enregistree];
    return enregistree;
  }
  return authHttp(id ? `/admin/catalog/options/${encodeURIComponent(id)}` : '/admin/catalog/options', { method: id ? 'PUT' : 'POST', ...json(donnees) });
}

// ——— Produits ———
export async function produits(): Promise<ProduitPro[]> {
  if (isDemo()) return demo.produits;
  return (await authHttp<{ produits?: ProduitPro[] }>('/admin/catalog')).produits ?? [];
}

export async function enregistrerProduit(p: ProduitPro): Promise<ProduitPro> {
  const { id, ...donnees } = p;
  if (isDemo()) {
    const enregistre = { ...donnees, id: id ?? `pr${demoId++}` };
    demo.produits = id ? demo.produits.map((x) => (x.id === id ? enregistre : x)) : [...demo.produits, enregistre];
    return enregistre;
  }
  return authHttp(id ? `/admin/catalog/produits/${encodeURIComponent(id)}` : '/admin/catalog/produits', { method: id ? 'PUT' : 'POST', ...json(donnees) });
}

// ——— Horaires et congés ———
export async function horaires(): Promise<Plage[]> {
  if (isDemo()) return demo.horaires;
  return authHttp('/admin/availability/hours');
}

export async function definirHoraires(hours: Plage[]): Promise<Plage[]> {
  if (isDemo()) { demo.horaires = hours; return hours; }
  return authHttp('/admin/availability/hours', { method: 'PUT', ...json({ hours }) });
}

export async function indisponibilites(from: string, to: string): Promise<Indisponibilite[]> {
  if (isDemo()) return demo.indisponibilites;
  return authHttp(`/admin/availability/unavailabilities?from=${from}&to=${to}`);
}

/** Congé ou absence du jour `start` (inclus) au jour `end` (exclu), format AAAA-MM-JJ. */
export async function ajouterIndisponibilite(start: string, end: string, reason: string): Promise<string> {
  if (isDemo()) {
    const id = `i${demoId++}`;
    demo.indisponibilites = [...demo.indisponibilites, { id, start: `${start}T00:00:00`, end: `${end}T00:00:00`, reason }];
    return id;
  }
  return (await authHttp<{ id: string }>('/admin/availability/unavailabilities', { method: 'POST', ...json({ start, end, reason }) })).id;
}

export async function supprimerIndisponibilite(id: string): Promise<void> {
  if (isDemo()) { demo.indisponibilites = demo.indisponibilites.filter((i) => i.id !== id); return; }
  return authHttp(`/admin/availability/unavailabilities/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ——— Réglages ———
export async function reglages(): Promise<Reglages> {
  if (isDemo()) return demo.reglages;
  return authHttp('/admin/settings');
}

export async function enregistrerRegles(rules: Regles): Promise<void> {
  if (isDemo()) { demo.reglages = { ...demo.reglages, rules }; return; }
  await authHttp('/admin/settings/rules', { method: 'PUT', ...json(rules) });
}

/** Zone d'intervention ; null = activité sur place (pas de déplacement). */
export async function enregistrerZone(zone: Zone | null): Promise<void> {
  if (isDemo()) { demo.reglages = { ...demo.reglages, zone }; return; }
  await authHttp('/admin/settings/zone', { method: 'PUT', ...json({ zone }) });
}
