import { horairesParJour, rangAujourdhui } from './horaires';

describe('horaires jour par jour', () => {
  it('répartit des horaires groupés sur chaque jour, un jour absent est fermé', () => {
    const jours = horairesParJour([
      { jours: 'Du lundi au samedi', heures: '11 h – 22 h' },
      { jours: 'Dimanche', heures: '' },
    ]);
    expect(jours).toHaveLength(7);
    expect(jours[0]).toEqual({ jours: 'Lundi', heures: '11 h – 22 h' });
    expect(jours[5].heures).toBe('11 h – 22 h');
    expect(jours[6]).toEqual({ jours: 'Dimanche', heures: 'Fermé' });
  });

  it('comprend « tous les jours », une plage qui passe par dimanche et une liste', () => {
    expect(horairesParJour([{ jours: 'Tous les jours', heures: 'A' }]).every((h) => h.heures === 'A')).toBe(true);
    const plage = horairesParJour([{ jours: 'Vendredi - lundi', heures: 'B' }]);
    expect(plage.map((h) => h.heures)).toEqual(['B', 'Fermé', 'Fermé', 'Fermé', 'B', 'B', 'B']);
    expect(horairesParJour([{ jours: 'Mardi et jeudi', heures: 'C' }]).map((h) => h.heures)[3]).toBe('C');
  });

  it('aujourd’hui, à l’heure de France', () => {
    // Dimanche 23 h 30 à Paris = dimanche 22 h 30 UTC (heure d'hiver).
    expect(rangAujourdhui(new Date('2026-11-22T22:30:00Z'))).toBe(6);
    // Lundi 0 h 30 à Paris = dimanche 23 h 30 UTC.
    expect(rangAujourdhui(new Date('2026-11-22T23:30:00Z'))).toBe(0);
  });
});
