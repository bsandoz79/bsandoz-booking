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
/** `groupe` : créneau juste avant ou après un rendez-vous déjà prévu (conseillé). */
export interface Slot { start: string; end?: string; label: string; groupe?: boolean }

/** Choix du client transmis à l'API : la variante est déduite de `metierData` par le module detailing. */
export interface Selection {
  formule: Formule;
  variante: string;
  /** Options de chaque véhicule mises bout à bout (une même option peut revenir, une fois par véhicule). */
  optionIds: string[];
  /** Nombre de véhicules (même formule pour tous) ; 1 par défaut. */
  quantite?: number;
  metierData: Record<string, unknown>;
  /** Formule combinée : la formule choisie dans chaque catégorie. */
  composantes?: Formule[];
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

const ZONE_DEMO: ZonePublique = { surPlace: false, freeRadiusKm: DEMO_RULES.freeRadiusKm, maxDistanceKm: DEMO_RULES.maxDistanceKm, pricePerKmCents: DEMO_RULES.pricePerKmCents, paliers: DEMO_RULES.paliers, roadFactor: 1.3, rayonVilleKm: DEMO_RULES.rayonVilleKm };

/** Horaires de démonstration (identiques à `detailing:demo:charger`) : lundi–samedi 8 h–19 h, dimanche 10 h–18 h. */
const HORAIRES_DEMO: Plage[] = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startsAt: '08:00', endsAt: '19:00' })).concat([{ weekday: 7, startsAt: '10:00', endsAt: '18:00' }]);

/** Horaires d'ouverture publiés (1 = lundi … 7 = dimanche). */
export async function getHoraires(): Promise<Plage[]> {
  if (isDemo()) return HORAIRES_DEMO;
  return http('/booking/hours');
}

/** Conditions de déplacement à afficher (rayon offert, tranches, distance maximale). */
/** Demande de contact ou de devis (page « Professionnels ») transmise au pro par mail. */
export interface DemandeContact { nom: string; email: string; telephone?: string; entreprise?: string; message: string; details?: Record<string, string>; site?: string }

export async function envoyerDemandeContact(demande: DemandeContact): Promise<void> {
  if (isDemo()) return;
  await http('/contact', { method: 'POST', body: JSON.stringify(demande) });
}

export async function getZone(): Promise<ZonePublique> {
  if (isDemo()) return ZONE_DEMO;
  return http('/booking/zone');
}

export async function getCatalog(): Promise<{ formules: Formule[]; options: OptionItem[]; produits: ProduitItem[] }> {
  if (isDemo()) return { formules: FORMULES, options: OPTIONS, produits: PRODUITS };
  const c = await http<{ formules: Formule[]; options: OptionItem[]; produits?: ProduitItem[] }>('/catalog');
  return { ...c, produits: c.produits ?? [] };
}

/** Démo : distance à vol d'oiseau depuis la limite d'Abbeville (rayon de la ville retiré) × 1,3. */
function demoDistanceKm(a: Address): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const { lat, lng } = DEMO_RULES.origin;
  const dLat = rad(a.lat - lat), dLng = rad(a.lng - lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(a.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(Math.max(0, 2 * R * Math.asin(Math.sqrt(h)) - DEMO_RULES.rayonVilleKm) * 1.3 * 10) / 10;
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
  const { formule, variante, optionIds, metierData, quantite = 1, composantes = [] } = selection;
  if (!isDemo()) {
    return http('/booking/quote', {
      method: 'POST',
      body: JSON.stringify({ prestationId: formule.id, variante, optionIds, metierData, lat: address?.lat, lng: address?.lng, quantite, composantes: composantes.map((c) => c.id) }),
    });
  }
  // Démo : même calcul que l'API (formule × véhicules, chaque option comptée autant de fois qu'elle est choisie ;
  // formule combinée : une ligne par formule choisie, puis la remise).
  const fois = (label: string, n: number) => (n > 1 ? `${label} × ${n}` : label);
  const opts = OPTIONS.map((o) => ({ o, n: optionIds.filter((id) => id === o.id).length })).filter((x) => x.n > 0);
  let tarif = tarifDe(formule, variante);
  let lignesFormule = [{ label: fois(formule.name, quantite), amountCents: tarif.priceCents * quantite - Math.min(formule.remiseUniteCents ?? 0, tarif.priceCents) * (quantite - 1) }];
  if (composantes.length > 0) {
    const tarifs = composantes.map((c) => tarifDe(c, variante));
    const somme = tarifs.reduce((s, t) => s + t.priceCents, 0);
    const remise = Math.min(formule.remiseCompositionCents ?? 0, somme);
    tarif = { priceCents: somme - remise, durationMin: tarifs.reduce((s, t) => s + t.durationMin, 0) };
    lignesFormule = [
      ...composantes.map((c, i) => ({ label: fois(c.name, quantite), amountCents: tarifs[i].priceCents * quantite })),
      ...(remise > 0 ? [{ label: fois(`Remise ${formule.name}`, quantite), amountCents: -remise * quantite }] : []),
    ];
  }
  const lines = [
    ...lignesFormule,
    ...opts.map(({ o, n }) => ({ label: fois(o.name, n), amountCents: o.priceCents * n })),
  ];
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
    durationMin: tarif.durationMin * quantite + opts.reduce((s, { o, n }) => s + o.durationMin * n, 0),
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

/** Adresse la plus proche d'une position (bouton « Utiliser ma position »). */
export async function adresseDePosition(lat: number, lng: number): Promise<Address> {
  if (!isDemo()) return http(`/geo/reverse?${query({ lat, lng })}`);
  const res = await fetch(`https://api-adresse.data.gouv.fr/reverse/?${query({ lat, lon: lng, limit: 1 })}`);
  const f = (await res.json()).features?.[0];
  if (!f) throw new Error('Aucune adresse trouvée à cette position.');
  return { label: f.properties.label, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
}

/** Position du visiteur (GPS du téléphone ou position du navigateur), avec son accord. */
export function maPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Votre navigateur ne permet pas de trouver votre position : saisissez l’adresse.')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED
        ? 'Position refusée : autorisez la localisation pour ce site, ou saisissez l’adresse.'
        : 'Position introuvable pour le moment : saisissez l’adresse.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
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
  // Démo : le premier créneau de l'après-midi suit un rendez-vous fictif.
  return starts.map((h) => ({ start: `${date}T${h}:00`, label: h, groupe: h === '13:30' }));
}

/** Crée la réservation (bloquée le temps du paiement) ; renvoie la page de paiement de l'acompte. */
/** Produits ajoutés à la réservation : identifiant et quantité. */
export interface ProduitChoisi { id: string; quantite: number }

/** « en_ligne » : tout payer maintenant (Stripe) ; « sur_place » : payer une fois la prestation faite. */
export type ModePaiement = 'en_ligne' | 'sur_place';

export async function reserve(selection: Selection, start: string, address: Address, contact: Contact, acceptedTerms: boolean, produits: ProduitChoisi[] = [], paiement?: ModePaiement): Promise<ReservationResult> {
  if (isDemo()) return { reservationId: 'demo', status: 'pending_payment', paymentUrl: '/confirmation?demo=1' };
  return http('/booking/reservations', {
    method: 'POST',
    body: JSON.stringify({
      prestationId: selection.formule.id,
      variante: selection.variante,
      optionIds: selection.optionIds,
      quantite: selection.quantite ?? 1,
      metierData: selection.metierData,
      ...(selection.composantes?.length ? { composantes: selection.composantes.map((c) => c.id) } : {}),
      start,
      address,
      ...contact,
      acceptedTerms,
      produits,
      ...(paiement ? { paiement } : {}),
    }),
  });
}
