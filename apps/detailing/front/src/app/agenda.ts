/** Ajout d'un rendez-vous à l'agenda du visiteur : lien Google Agenda, fichier .ics (Apple Calendrier, Outlook…). */
export interface EvenementAgenda { titre: string; debut: string; fin: string; lieu?: string; details?: string }

/** Date ISO → format agenda UTC « AAAAMMJJTHHMMSSZ ». */
const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function lienGoogleAgenda(e: EvenementAgenda): string {
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.titre, dates: `${utc(e.debut)}/${utc(e.fin)}` });
  if (e.lieu) p.set('location', e.lieu);
  if (e.details) p.set('details', e.details);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const echapper = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Contenu d'un fichier .ics d'un seul événement (rappel 1 h avant). */
export function contenuIcs(e: EvenementAgenda, uid = `${utc(e.debut)}-${Math.random().toString(36).slice(2)}@bsandoz`): string {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//bsandoz//reservation//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${utc(new Date().toISOString())}`, `DTSTART:${utc(e.debut)}`, `DTEND:${utc(e.fin)}`,
    `SUMMARY:${echapper(e.titre)}`, ...(e.lieu ? [`LOCATION:${echapper(e.lieu)}`] : []), ...(e.details ? [`DESCRIPTION:${echapper(e.details)}`] : []),
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${echapper(e.titre)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

/** Adresse (blob:) d'un fichier .ics à télécharger. */
export const lienIcs = (e: EvenementAgenda) => URL.createObjectURL(new Blob([contenuIcs(e)], { type: 'text/calendar;charset=utf-8' }));

/** Dernière réservation faite dans cet onglet (pour la page de confirmation, aussi au retour du paiement en ligne). */
const CLE = 'derniere-reservation';
export const memoriserReservation = (id: string, e: EvenementAgenda) => {
  try { sessionStorage.setItem(CLE, JSON.stringify({ id, ...e })); } catch { /* stockage indisponible : pas d'ajout proposé */ }
};
export function reservationMemorisee(id: string | null): EvenementAgenda | undefined {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLE) ?? 'null') as (EvenementAgenda & { id: string }) | null;
    return v && (!id || v.id === id) ? v : undefined;
  } catch {
    return undefined;
  }
}
