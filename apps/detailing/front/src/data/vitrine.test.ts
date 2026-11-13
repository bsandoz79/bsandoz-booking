import { FORMULES } from './demo';
import { detailPrestation, heure, jourIso, semaine, tranches } from './vitrine';

describe('mise en forme de l’accueil', () => {
  it('découpe une description en éléments compris et en durée', () => {
    const eclat = detailPrestation(FORMULES.find((f) => f.id === 'int-eclat')!.description);
    expect(eclat.inclus).toEqual(['Nettoyage approfondi des surfaces', 'Aspiration minutieuse de l’habitacle', 'Nettoyage des vitres intérieures', 'Parfum d’ambiance']);
    expect(eclat.duree).toBe('1 h à 1 h 30');

    const signature = detailPrestation(FORMULES.find((f) => f.id === 'int-signature')!.description);
    expect(signature.inclus[0]).toBe('Formule Éclat incluse');
    expect(signature.elements[0].formule).toBe(true);
    expect(signature.inclus[1]).toBe('Shampooing des tapis et moquettes');
    expect(signature.elements).toContainEqual({ texte: 'Désodorisant voiture', etiquette: 'Offert · durée limitée' });
  });

  it('garde une phrase telle quelle quand elle ne se découpe pas en liste', () => {
    const phares = detailPrestation(FORMULES.find((f) => f.id === 'phares')!.description);
    expect(phares.inclus).toEqual([]);
    expect(phares.texte).toMatch(/^Les deux phares/);
    expect(detailPrestation('Ciel de toit nettoyé.').inclus).toEqual([]);
  });

  it('présente les horaires jour par jour, fermé si aucune plage', () => {
    expect(heure('08:00')).toBe('8 h');
    expect(heure('13:30')).toBe('13 h 30');
    const jours = semaine([{ weekday: 1, startsAt: '13:30', endsAt: '18:00' }, { weekday: 1, startsAt: '08:00', endsAt: '12:00' }]);
    expect(jours).toHaveLength(7);
    expect(jours[0]).toEqual({ weekday: 1, jour: 'Lundi', plages: ['8 h – 12 h', '13 h 30 – 18 h'] });
    expect(jours[6].plages).toEqual([]);
    expect(jourIso(new Date(2026, 10, 15))).toBe(7); // dimanche 15 novembre 2026
  });

  it('présente les frais de déplacement par tranches', () => {
    expect(tranches({ surPlace: false, freeRadiusKm: 5, maxDistanceKm: 50, pricePerKmCents: 0, paliers: [{ jusquaKm: 15, prixCents: 500 }, { jusquaKm: 50, prixCents: 2000 }] })).toEqual([
      { de: 0, jusqua: 5, prix: 'Offert', offert: true },
      { de: 5, jusqua: 15, prix: '5 €', offert: false },
      { de: 15, jusqua: 50, prix: '20 €', offert: false },
      { de: 50, prix: 'Sur devis', offert: false },
    ]);
    expect(tranches({ surPlace: false, freeRadiusKm: 10, maxDistanceKm: 30, pricePerKmCents: 50, paliers: [] })[1]).toEqual({ de: 10, jusqua: 30, prix: '0,50 € / km', offert: false });
    expect(tranches({ surPlace: true, freeRadiusKm: 0, maxDistanceKm: 0, pricePerKmCents: 0, paliers: [] })).toEqual([]);
  });
});
