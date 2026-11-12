/** Conditions de déplacement publiées par l'API (`GET /booking/zone`), sans le point de départ du pro. */
export interface Palier { jusquaKm: number; prixCents: number }
export interface ZonePublique { surPlace: boolean; freeRadiusKm: number; maxDistanceKm: number; pricePerKmCents: number; paliers: Palier[] }

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
