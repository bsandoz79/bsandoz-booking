import { distance, distanceVolOiseau, duree, estimerTrajets } from './trajet';

const crocs = { lat: 49.887017, lng: 2.282462 };

describe('trajet', () => {
  it('mesure la distance à vol d’oiseau', () => {
    // Gare d'Amiens (environ 49.8906, 2.3075) : un peu moins de 2 km.
    const d = distanceVolOiseau({ lat: 49.8906, lng: 2.3075 }, crocs);
    expect(d).toBeGreaterThan(1700);
    expect(d).toBeLessThan(2000);
  });

  it('estime voiture, vélo et pied, du plus rapide au plus lent', () => {
    const t = estimerTrajets({ lat: 49.8906, lng: 2.3075 }, crocs);
    expect(t.voiture).toBeLessThan(t.velo + 3);
    expect(t.velo).toBeLessThan(t.pied);
    expect(t.pied).toBeGreaterThan(25);
    expect(t.pied).toBeLessThan(40);
  });

  it('au moins une minute, même sur place', () => {
    expect(estimerTrajets(crocs, crocs)).toMatchObject({ distanceM: 0, velo: 1, pied: 1 });
  });

  it('écrit les durées et distances simplement', () => {
    expect(duree(8)).toBe('8 min');
    expect(duree(65)).toBe('1 h 05');
    expect(distance(840)).toBe('850 m');
    expect(distance(2430)).toBe('2,4 km');
  });
});
