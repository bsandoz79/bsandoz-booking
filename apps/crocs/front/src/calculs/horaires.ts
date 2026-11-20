import type { Horaire } from '../services/api';

export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;
export type Jour = (typeof JOURS)[number];

/** Texte affiché pour un jour sans horaires. */
export const FERME = 'Fermé';

const sansAccent = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const rang = (mot: string) => JOURS.findIndex((j) => sansAccent(j) === sansAccent(mot));

/** Jours couverts par un libellé : « Lundi », « Du lundi au samedi », « Lundi - vendredi », « Tous les jours ». */
function joursCouverts(libelle: string): number[] {
  const t = sansAccent(libelle);
  if (/tous les jours|7\s*j(ours)?\s*\/\s*7/.test(t)) return [0, 1, 2, 3, 4, 5, 6];
  const plage = t.match(/^(?:du\s+)?([a-z]+)\s*(?:au|a|-|–)\s*([a-z]+)$/);
  if (plage) {
    const debut = rang(plage[1]), fin = rang(plage[2]);
    if (debut >= 0 && fin >= 0) {
      const liste: number[] = [];
      for (let i = debut; ; i = (i + 1) % 7) {
        liste.push(i);
        if (i === fin) break;
      }
      return liste;
    }
  }
  return t.split(/\s*(?:,|et)\s*/).map(rang).filter((i) => i >= 0);
}

/**
 * Horaires jour par jour (lundi → dimanche). Accepte aussi d'anciens horaires groupés (« Du lundi au samedi »).
 * Un jour non mentionné est « Fermé ».
 */
export function horairesParJour(horaires: Horaire[]): Horaire[] {
  const heures: string[] = JOURS.map(() => '');
  horaires.forEach((h) => joursCouverts(h.jours).forEach((i) => { heures[i] = h.heures.trim(); }));
  return JOURS.map((jour, i) => ({ jours: jour, heures: heures[i] || FERME }));
}

/** Rang du jour (0 = lundi) à l'heure du commerce (Europe/Paris), quel que soit le fuseau du visiteur. */
export function rangAujourdhui(maintenant = new Date()): number {
  const nom = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' }).format(maintenant);
  return rang(nom);
}
