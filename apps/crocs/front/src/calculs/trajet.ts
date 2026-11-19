/**
 * Temps de trajet estimés jusqu'au restaurant, calculés dans le navigateur (rien n'est envoyé) :
 * distance à vol d'oiseau, majorée pour suivre les rues, et vitesses moyennes en ville.
 * Ce sont des estimations, annoncées comme telles.
 */
export interface Point {
  lat: number;
  lng: number;
}

export interface Trajets {
  /** Distance par la route estimée, en mètres. */
  distanceM: number;
  voiture: number;
  velo: number;
  pied: number;
}

/** Les rues ne vont pas en ligne droite : environ 35 % de plus en ville. */
const DETOUR = 1.35;
/** Vitesses moyennes en ville (km/h). */
const VITESSES = { voiture: 22, velo: 14, pied: 4.8 };
/** Se garer et marcher jusqu'à la porte. */
const STATIONNEMENT_MIN = 2;

export function distanceVolOiseau(a: Point, b: Point): number {
  const r = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

const minutes = (metres: number, kmh: number) => Math.max(1, Math.round(metres / 1000 / kmh * 60));

export function estimerTrajets(depart: Point, arrivee: Point): Trajets {
  const distanceM = Math.round(distanceVolOiseau(depart, arrivee) * DETOUR);
  return {
    distanceM,
    voiture: minutes(distanceM, VITESSES.voiture) + STATIONNEMENT_MIN,
    velo: minutes(distanceM, VITESSES.velo),
    pied: minutes(distanceM, VITESSES.pied),
  };
}

/** « 8 min », « 1 h 05 ». */
export function duree(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, '0')}`;
}

/** « 850 m », « 2,4 km ». */
export function distance(m: number): string {
  return m < 1000 ? `${Math.round(m / 50) * 50} m` : `${(m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
}
