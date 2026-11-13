/** Liens d'itinéraire vers une adresse (position GPS si connue). */
export interface Destination { address: string; lat?: number; lng?: number }

const point = (d: Destination) => (d.lat && d.lng ? `${d.lat},${d.lng}` : d.address);

/** Google Maps : itinéraire vers la destination (ouvre l'application sur téléphone). */
export const lienMaps = (d: Destination) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point(d))}`;

/** Waze : navigation vers la position, sinon recherche de l'adresse. */
export const lienWaze = (d: Destination) => (d.lat && d.lng
  ? `https://waze.com/ul?ll=${d.lat},${d.lng}&navigate=yes`
  : `https://waze.com/ul?q=${encodeURIComponent(d.address)}&navigate=yes`);
