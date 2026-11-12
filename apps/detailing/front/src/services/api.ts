import { DEMO_RULES, FORMULES, OPTIONS, tarifDe, PRODUITS } from '../data/demo';
import { fraisDeplacement, type Estimation, type ZonePublique } from '../data/zone';
import type { Plage } from '../data/vitrine';
import type { Formule, OptionItem, ProduitItem } from '../data/demo';

/**
 * Client de l'API (contrat : docs/api.md). `VITE_API_URL` = adresse de base de l'API, sans `/api/v1`
 * (ex. https://api.demo.bsandoz.fr). Vide : données de démonstration, aucun appel réseau vers l'API.
 */
const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const isDemo = () => API_URL === '';

export interface Quote {
  lines: { label: string; amountCents: number }[];
  totalCents: number;
  depositCents: number;
  durationMin: number;
  travelFeeCents: number;
  inZone: boolean;
}
export interface Address { label: string; lat: number; lng: number }
export interface Slot { start: string; end?: string; label: string }

/** Choix du client transmis à l'API : la variante est déduite de `metierData` par le module detailing. */
export interface Selection {
  formule: Formule;
  variante: string;
  optionIds: string[];
  metierData: Record<string, unknown>;
}

export interface Contact { firstname: string; lastname: string; email: string; phone: string; notes: string }

export interface ReservationResult {
  reservationId: string;
  status: 'pending_payment' | 'confirmed';
  /** Page de paiement de l'acompte (Stripe) ; null si aucun acompte ou paiement indisponible. */
  paymentUrl: string | null;
  paymentError?: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Appel JSON à l'API ; `token` = jeton d'accès (espace client / pro). Erreur problem+json → ApiError avec `detail`. */
export async function http<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  // Envoi de fichier (FormData) : le navigateur fixe lui-même le Content-Type multipart.
  const headers: Record<string, string> = init.body instanceof FormData ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api/v1${path}`, { credentials: 'include', ...init, headers });
  if (!res.ok) {
    const probleme = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(probleme?.detail ?? 'Une erreur est survenue. Merci de réessayer.', res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const query = (params: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();

const ZONE_DEMO: ZonePublique = { surPlace: false, freeRadiusKm: DEMO_RULES.freeRadiusKm, maxDistanceKm: DEMO_RULES.maxDistanceKm, pricePerKmCents: DEMO_RULES.pricePerKmCents, paliers: DEMO_RULES.paliers, roadFactor: 1.3 };

/** Horaires de démonstration (identiques à `detailing:demo:charger`) : lundi–samedi 8 h–19 h, dimanche 10 h–18 h. */
const HORAIRES_DEMO: Plage[] = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startsAt: '08:00', endsAt: '19:00' })).concat([{ weekday: 7, startsAt: '10:00', endsAt: '18:00' }]);

/** Horaires d'ouverture publiés (1 = lundi … 7 = dimanche). */
export async function getHoraires(): Promise<Plage[]> {
  if (isDemo()) return HORAIRES_DEMO;
  return http('/booking/hours');
}

/** Conditions de déplacement à afficher (rayon offert, tranches, distance maximale). */
export async function getZone(): Promise<ZonePublique> {
  if (isDemo()) return ZONE_DEMO;
  return http('/booking/zone');
}

export async function getCatalog(): Promise<{ formules: Formule[]; options: OptionItem[]; produits: ProduitItem[] }> {
  if (isDemo()) return { formules: FORMULES, options: OPTIONS, produits: PRODUITS };
  const c = await http<{ formules: Formule[]; options: OptionItem[]; produits?: ProduitItem[] }>('/catalog');
  return { ...c, produits: c.produits ?? [] };
}

/** Démo : distance à vol d'oiseau depuis le point de départ (Abbeville) × 1,3. */
function demoDistanceKm(a: Address): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const { lat, lng } = DEMO_RULES.origin;
  const dLat = rad(a.lat - lat), dLng = rad(a.lng - lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(a.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.3 * 10) / 10;
}

/** Frais de déplacement estimés pour une position (carte de la zone) ; la position n'est pas enregistrée. */
export async function estimerDeplacement(lat: number, lng: number): Promise<Estimation> {
  if (isDemo()) {
    const distanceKm = demoDistanceKm({ label: '', lat, lng });
    const dansZone = distanceKm <= ZONE_DEMO.maxDistanceKm;
    return { distanceKm, dansZone, fraisCents: dansZone ? fraisDeplacement(ZONE_DEMO, distanceKm) : 0 };
  }
  return http(`/booking/zone/estimation?${query({ lat, lng })}`);
}

export async function getQuote(selection: Selection, address?: Address): Promise<Quote> {
  const { formule, variante, optionIds, metierData } = selection;
  if (!isDemo()) {
    return http('/booking/quote', {
      method: 'POST',
      body: JSON.stringify({ prestationId: formule.id, variante, optionIds, metierData, lat: address?.lat, lng: address?.lng }),
    });
  }
  const tarif = tarifDe(formule, variante);
  const opts = OPTIONS.filter((o) => optionIds.includes(o.id));
  const lines = [{ label: formule.name, amountCents: tarif.priceCents }, ...opts.map((o) => ({ label: o.name, amountCents: o.priceCents }))];
  let travelFeeCents = 0;
  let inZone = true;
  if (address) {
    const km = demoDistanceKm(address);
    inZone = km <= DEMO_RULES.maxDistanceKm;
    travelFeeCents = inZone ? fraisDeplacement(ZONE_DEMO, km) : 0;
    if (travelFeeCents > 0) lines.push({ label: 'Frais de déplacement', amountCents: travelFeeCents });
  }
  const totalCents = lines.reduce((s, l) => s + l.amountCents, 0);
  return {
    lines, totalCents, travelFeeCents, inZone,
    depositCents: Math.ceil((totalCents * DEMO_RULES.depositPercent) / 100),
    durationMin: tarif.durationMin + opts.reduce((s, o) => s + o.durationMin, 0),
  };
}

export async function searchAddress(q: string): Promise<Address[]> {
  if (q.trim().length < 3) return [];
  if (!isDemo()) return http(`/geo/search?${query({ q })}`);
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?${query({ q, limit: 5 })}`);
  const json = await res.json();
  return (json.features ?? []).map((f: { properties: { label: string }; geometry: { coordinates: [number, number] } }) => ({
    label: f.properties.label, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
  }));
}

/** Démo : du mardi au samedi, à partir de demain. */
export async function getAvailableDays(month: string, durationMin: number, address: Address, prestationId?: string): Promise<string[]> {
  if (!isDemo()) return http(`/booking/days?${query({ month, duration: durationMin, lat: address.lat, lng: address.lng, prestation: prestationId })}`);
  const [y, m] = month.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
  const days: string[] = [];
  for (let d = 1; d <= count; d++) {
    const date = new Date(y, m - 1, d);
    const wd = date.getDay();
    if (date >= tomorrow && wd >= 2 && wd <= 6) days.push(`${month}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

/** Démo : prestation à durée incertaine (`occupePlage`) → débuts de demi-journée uniquement. */
export async function getSlots(date: string, durationMin: number, address: Address, formule?: Formule): Promise<Slot[]> {
  if (!isDemo()) return http(`/booking/slots?${query({ date, duration: durationMin, lat: address.lat, lng: address.lng, prestation: formule?.id })}`);
  const starts = formule?.occupePlage || durationMin > 180 ? ['08:30', '13:30'] : ['08:30', '10:30', '13:30', '15:30'];
  return starts.map((h) => ({ start: `${date}T${h}:00`, label: h }));
}

/** Crée la réservation (bloquée le temps du paiement) ; renvoie la page de paiement de l'acompte. */
/** Produits ajoutés à la réservation : identifiant et quantité. */
export interface ProduitChoisi { id: string; quantite: number }

export async function reserve(selection: Selection, start: string, address: Address, contact: Contact, acceptedTerms: boolean, produits: ProduitChoisi[] = []): Promise<ReservationResult> {
  if (isDemo()) return { reservationId: 'demo', status: 'pending_payment', paymentUrl: '/confirmation?demo=1' };
  return http('/booking/reservations', {
    method: 'POST',
    body: JSON.stringify({
      prestationId: selection.formule.id,
      variante: selection.variante,
      optionIds: selection.optionIds,
      metierData: selection.metierData,
      start,
      address,
      ...contact,
      acceptedTerms,
      produits,
    }),
  });
}
