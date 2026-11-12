/** Fonctions pures du calendrier (testées à part). Dates au format YYYY-MM-DD, mois au format YYYY-MM. */

export function monthDays(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

/** Nombre de cases vides avant le 1er du mois, semaine commençant le lundi. */
export function leadingBlanks(month: string): number {
  const [y, m] = month.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = dimanche
  return (weekday + 6) % 7;
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(month: string, locale = 'fr-FR'): string {
  const [y, m] = month.split('-').map(Number);
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDay(date: string, locale = 'fr-FR'): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Ajoute (ou retire) des jours à une date YYYY-MM-DD. */
export function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}
