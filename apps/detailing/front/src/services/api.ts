import { DEMO_RULES, FORMULES, OPTIONS } from '../data/demo';
import type { Formule, OptionItem } from '../data/demo';

/** Client de l'API. Sans VITE_API_URL, renvoie les données de démonstration. */
const API_URL: string = import.meta.env.VITE_API_URL ?? '';

export interface Quote {
  lines: { label: string; amountCents: number }[];
  totalCents: number;
  depositCents: number;
  durationMin: number;
  travelFeeCents: number;
  inZone: boolean;
}
export interface Address { label: string; lat: number; lng: number }
export interface ReservationRequest {
  formuleId: string;
  optionIds: string[];
  metierData: Record<string, unknown>;
  start: string;
  address: Address;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  notes: string;
  acceptedTerms: boolean;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...init });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? 'Une erreur est survenue.');
  return res.json() as Promise<T>;
}

export async function getCatalog(): Promise<{ formules: Formule[]; options: OptionItem[] }> {
  if (!API_URL) return { formules: FORMULES, options: OPTIONS };
  return http('/catalog');
}

/** Démo : distance à vol d'oiseau depuis Amiens × 1,3. */
function demoDistanceKm(a: Address): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(a.lat - 49.8941), dLng = rad(a.lng - 2.2958);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(49.8941)) * Math.cos(rad(a.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.3 * 10) / 10;
}

export async function getQuote(formule: Formule, variante: string, optionIds: string[], address?: Address): Promise<Quote> {
  if (API_URL) {
    return http('/booking/quote', { method: 'POST', body: JSON.stringify({ prestationId: formule.id, variante, optionIds, lat: address?.lat, lng: address?.lng }) });
  }
  const tarif = formule.tarifs[variante] ?? Object.values(formule.tarifs)[0];
  const opts = OPTIONS.filter((o) => optionIds.includes(o.id));
  const lines = [{ label: formule.name, amountCents: tarif.priceCents }, ...opts.map((o) => ({ label: o.name, amountCents: o.priceCents }))];
  let travelFeeCents = 0;
  let inZone = true;
  if (address) {
    const km = demoDistanceKm(address);
    inZone = km <= DEMO_RULES.maxDistanceKm;
    travelFeeCents = inZone ? Math.ceil(Math.max(0, km - DEMO_RULES.freeRadiusKm)) * DEMO_RULES.pricePerKmCents : 0;
    if (travelFeeCents > 0) lines.push({ label: 'Frais de déplacement', amountCents: travelFeeCents });
  }
  const totalCents = lines.reduce((s, l) => s + l.amountCents, 0);
  return {
    lines, totalCents, travelFeeCents, inZone,
    depositCents: Math.ceil((totalCents * DEMO_RULES.depositPercent) / 100),
    durationMin: tarif.durationMin + opts.reduce((s, o) => s + o.durationMin, 0),
  };
}

export async function searchAddress(query: string): Promise<Address[]> {
  if (query.trim().length < 3) return [];
  if (API_URL) return http(`/geo/search?q=${encodeURIComponent(query)}`);
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
  const json = await res.json();
  return (json.features ?? []).map((f: { properties: { label: string }; geometry: { coordinates: [number, number] } }) => ({
    label: f.properties.label, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
  }));
}

/** Démo : du mardi au samedi, à partir de demain. */
export async function getAvailableDays(month: string, durationMin: number, address: Address): Promise<string[]> {
  if (API_URL) return http(`/booking/days?month=${month}&duration=${durationMin}&lat=${address.lat}&lng=${address.lng}`);
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

export async function getSlots(date: string, durationMin: number, address: Address): Promise<{ start: string; label: string }[]> {
  if (API_URL) return http(`/booking/slots?date=${date}&duration=${durationMin}&lat=${address.lat}&lng=${address.lng}`);
  const starts = durationMin > 180 ? ['08:30', '13:30'] : ['08:30', '10:30', '13:30', '15:30'];
  return starts.map((h) => ({ start: `${date}T${h}:00`, label: h }));
}

/** Renvoie l'URL de paiement de l'acompte (Stripe). */
export async function reserve(request: ReservationRequest): Promise<{ paymentUrl: string }> {
  if (API_URL) return http('/booking/reservations', { method: 'POST', body: JSON.stringify(request) });
  return { paymentUrl: '/confirmation?demo=1' };
}
