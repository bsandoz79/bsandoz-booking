/** Conditions de déplacement publiées par l'API (`GET /booking/zone`), sans le point de départ du pro. */
export interface Palier { jusquaKm: number; prixCents: number }
export interface ZonePublique {
  surPlace: boolean; freeRadiusKm: number; maxDistanceKm: number; pricePerKmCents: number; paliers: Palier[];
  /** Distance routière ÷ distance à vol d'oiseau (1,3 par défaut) : sert à tracer les cercles de la carte. */
  roadFactor?: number;
  /** Rayon de la ville de départ (km, à vol d'oiseau) : toute la ville compte pour 0 km, les distances partent de sa limite. */
  rayonVilleKm?: number;
}

/** Estimation des frais pour une position (`GET /booking/zone/estimation`). */
export interface Estimation { distanceKm: number; dansZone: boolean; fraisCents: number }

export interface Cercle { km: number; rayonM: number; fraisCents: number }

/**
 * Cercles de la carte : un par limite de tranche (rayon offert, chaque tranche, distance maximale), du plus petit au
 * plus grand. Les distances étant routières et comptées depuis la limite de la ville de départ, le rayon tracé vaut
 * rayon de la ville + distance ÷ facteur route / vol d'oiseau.
 */
/** Couleurs des tranches, de la plus proche à la plus éloignée : vert, jaune, orange, rouge. */
export const COULEURS_TRANCHES = ['#2e9e5b', '#e2b007', '#ef7d1a', '#d93025'];

/** Couleur de la tranche `i` sur `n` : la première est verte, la dernière rouge, celles du milieu réparties entre les deux. */
export function couleurTranche(i: number, n: number): string {
  const dernier = COULEURS_TRANCHES.length - 1;
  return COULEURS_TRANCHES[n <= 1 ? 0 : Math.round((i * dernier) / (n - 1))];
}

export function cerclesZone(zone: ZonePublique): Cercle[] {
  if (zone.surPlace) return [];
  const facteur = zone.roadFactor && zone.roadFactor >= 1 ? zone.roadFactor : 1.3;
  const limites = [zone.freeRadiusKm, ...zone.paliers.map((p) => p.jusquaKm), zone.maxDistanceKm]
    .filter((km, i, t) => km > 0 && km <= zone.maxDistanceKm && t.indexOf(km) === i)
    .sort((a, b) => a - b);
  const ville = zone.rayonVilleKm ?? 0;
  return limites.map((km) => ({ km, rayonM: Math.round((ville + km / facteur) * 1000), fraisCents: fraisDeplacement(zone, km) }));
}

/** Frais de déplacement pour une distance routière (même règle que le kit back : rayon offert, tranches, puis prix au km). */
export function fraisDeplacement(zone: ZonePublique, km: number): number {
  if (zone.surPlace || km <= zone.freeRadiusKm) return 0;
  if (zone.paliers.length === 0) return Math.ceil(km - zone.freeRadiusKm) * zone.pricePerKmCents;
  const palier = zone.paliers.find((p) => km <= p.jusquaKm);
  if (palier) return palier.prixCents;
  const dernier = zone.paliers[zone.paliers.length - 1];
  return dernier.prixCents + Math.ceil(km - dernier.jusquaKm) * zone.pricePerKmCents;
}

const km = (n: number) => `${String(n).replace('.', ',')} km`;
const euros = (cents: number) => `${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2).replace('.', ',')} €`;

/** Lignes à afficher : « Jusqu'à 5 km : offert », « De 5 à 15 km : 5 € »… */
export function lignesTarifDeplacement(zone: ZonePublique): string[] {
  if (zone.surPlace) return [];
  const lignes = [zone.freeRadiusKm > 0 ? `Jusqu’à ${km(zone.freeRadiusKm)} : offert` : ''];
  let depuis = zone.freeRadiusKm;
  for (const p of zone.paliers) {
    lignes.push(`De ${km(depuis)} à ${km(p.jusquaKm)} : ${euros(p.prixCents)}`);
    depuis = p.jusquaKm;
  }
  if (depuis < zone.maxDistanceKm) {
    lignes.push(zone.pricePerKmCents > 0
      ? `De ${km(depuis)} à ${km(zone.maxDistanceKm)} : ${euros(zone.pricePerKmCents)} par km${zone.paliers.length > 0 ? ' en plus' : ''}`
      : `De ${km(depuis)} à ${km(zone.maxDistanceKm)} : offert`);
  }
  lignes.push(`Au-delà de ${km(zone.maxDistanceKm)} : sur devis`);
  return lignes.filter(Boolean);
}
