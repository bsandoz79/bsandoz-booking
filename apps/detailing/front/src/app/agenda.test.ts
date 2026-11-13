import { contenuIcs, lienGoogleAgenda } from './agenda';

const rdv = { titre: 'Perfect Clean : Intérieur Éclat', debut: '2026-11-17T08:30:00Z', fin: '2026-11-17T10:00:00Z', lieu: '1 Place Max Lejeune, Abbeville' };

describe('Ajout à l’agenda', () => {
  it('construit le lien Google Agenda en UTC', () => {
    const url = new URL(lienGoogleAgenda(rdv));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('dates')).toBe('20261117T083000Z/20261117T100000Z');
    expect(url.searchParams.get('location')).toBe('1 Place Max Lejeune, Abbeville');
  });

  it('produit un fichier .ics valide avec rappel, caractères spéciaux échappés', () => {
    const ics = contenuIcs(rdv, 'uid-1');
    expect(ics).toContain('DTSTART:20261117T083000Z');
    expect(ics).toContain('LOCATION:1 Place Max Lejeune\\, Abbeville');
    expect(ics).toContain('TRIGGER:-PT1H');
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });
});
