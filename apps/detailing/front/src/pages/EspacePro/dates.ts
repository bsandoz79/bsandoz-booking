/** Conversions de dates de l'espace pro (l'API est en UTC, l'affichage dans le fuseau du navigateur). */

const deux = (n: number) => String(n).padStart(2, '0');

/** Jour local AAAA-MM-JJ. */
export const jourLocal = (d: Date) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;

/** Date ISO (UTC) → heure locale AAAA-MM-JJTHH:mm (format du bloc PlanningView). */
export const localIso = (iso: string) => {
  const d = new Date(iso);
  return `${jourLocal(d)}T${deux(d.getHours())}:${deux(d.getMinutes())}`;
};

/** Ajoute des jours à AAAA-MM-JJ. */
export const plusJours = (jour: string, n: number) => {
  const [y, m, d] = jour.split('-').map(Number);
  return jourLocal(new Date(y, m - 1, d + n));
};

export const dateHeure = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
