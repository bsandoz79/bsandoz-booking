import { cerclesZone, fraisDeplacement, lignesTarifDeplacement, type ZonePublique } from './zone';

const abbeville: ZonePublique = {
  surPlace: false, freeRadiusKm: 5, maxDistanceKm: 50, pricePerKmCents: 0,
  paliers: [{ jusquaKm: 15, prixCents: 500 }, { jusquaKm: 30, prixCents: 1000 }, { jusquaKm: 50, prixCents: 2000 }],
};

describe('frais de déplacement', () => {
  it.each([[3, 0], [5, 0], [10, 500], [15, 500], [15.1, 1000], [40, 2000]])('%s km → %s centimes (tranches)', (km, cents) => {
    expect(fraisDeplacement(abbeville, km)).toBe(cents);
  });

  it('applique le prix au km sans tranche, et au-delà de la dernière tranche', () => {
    expect(fraisDeplacement({ ...abbeville, paliers: [], pricePerKmCents: 50 }, 7.2)).toBe(150);
    expect(fraisDeplacement({ ...abbeville, maxDistanceKm: 60, pricePerKmCents: 50 }, 55)).toBe(2000 + 5 * 50);
  });

  it('affiche les tranches lisiblement', () => {
    expect(lignesTarifDeplacement(abbeville)).toEqual([
      'Jusqu’à 5 km : offert',
      'De 5 km à 15 km : 5 €',
      'De 15 km à 30 km : 10 €',
      'De 30 km à 50 km : 20 €',
      'Au-delà de 50 km : sur devis',
    ]);
    expect(lignesTarifDeplacement({ ...abbeville, surPlace: true })).toEqual([]);
  });
});

describe('ville de départ', () => {
  it('trace les cercles depuis la limite de la ville', () => {
    const zone = { surPlace: false, freeRadiusKm: 5, maxDistanceKm: 50, pricePerKmCents: 0, paliers: [], roadFactor: 1.3, rayonVilleKm: 4 };
    // 5 km de route après la sortie d'une ville de 4 km de rayon : 4 + 5 / 1,3 ≈ 7,85 km à vol d'oiseau.
    expect(cerclesZone(zone)[0].rayonM).toBe(7846);
  });
});
