/**
 * Mise en forme des données affichées sur l'accueil : contenu des prestations, horaires de la semaine, tranches de
 * frais de déplacement. Fonctions pures, testées dans `vitrine.test.ts`.
 */
import type { ZonePublique } from './zone';

/** Un élément compris : texte, étiquette facultative (« Nouveau », « Offert · durée limitée »…), formule de base incluse. */
export interface ElementCompris { texte: string; etiquette?: string; formule?: boolean }

export interface DetailPrestation {
  /** Éléments compris (liste à cocher) ; vide si la description est une simple phrase. */
  inclus: string[];
  /** Les mêmes éléments avec leur étiquette éventuelle et la formule incluse mise en avant. */
  elements: ElementCompris[];
  /** Description telle quelle, quand elle ne se découpe pas en liste. */
  texte: string;
  /** « 1 h à 1 h 30 », repris de « Durée : … » dans la description. */
  duree?: string;
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * Découpe la description d'une prestation (saisie dans le Catalogue de l'espace pro) en éléments compris :
 * « Aspiration complète, vitres intérieures, parfum d'ambiance. Durée : 1 h. » → 3 éléments + durée 1 h.
 * « Éclat, plus shampoing… » → « Formule Éclat incluse », « Shampoing… ». Au moins 3 éléments pour faire une liste.
 * Étiquette entre crochets à la fin d'un élément : « traitement anti-buée [Nouveau] », « désodorisant [Offert · durée limitée] ».
 */
export function detailPrestation(description: string): DetailPrestation {
  let texte = description.trim();
  let duree: string | undefined;
  const d = /\s*Durée\s*:\s*([^.]+)\.?\s*$/i.exec(texte);
  if (d) {
    duree = d[1].trim();
    texte = texte.slice(0, d.index).trim();
  }
  const elements = texte.replace(/\.$/, '').split(/,\s+/).map((e) => e.trim()).filter(Boolean);
  if (elements.length < 3 || elements.some((e) => e.includes('. ') || e.includes(' : '))) return { inclus: [], elements: [], texte: texte.replace(/\s*\[[^\]]*\]/g, ''), duree };
  const detail = elements.map((e, i): ElementCompris => {
    const tag = /\s*\[([^\]]+)\]\s*$/.exec(e);
    const sans = (tag ? e.slice(0, tag.index) : e).trim();
    const etiquette = tag ? tag[1].trim() : undefined;
    if (i === 0 && /^[A-ZÉÈ][\p{L}-]*$/u.test(sans)) return { texte: `Formule ${sans} incluse`, formule: true, etiquette };
    return { texte: majuscule(sans.replace(/^plus\s+/i, '')), etiquette };
  });
  return { inclus: detail.map((e) => e.texte), elements: detail, texte, duree };
}

export interface Plage { weekday: number; startsAt: string; endsAt: string }
export interface JourHoraires { weekday: number; jour: string; plages: string[] }

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** « 08:00 » → « 8 h », « 13:30 » → « 13 h 30 ». */
export const heure = (hhmm: string) => {
  const [h, m] = hhmm.split(':');
  return `${Number(h)} h${m && m !== '00' ? ` ${m}` : ''}`;
};

/** Les 7 jours de la semaine (lundi d'abord) avec leurs plages ; aucune plage = fermé. */
export function semaine(plages: Plage[]): JourHoraires[] {
  return JOURS.map((jour, i) => ({
    weekday: i + 1,
    jour,
    plages: plages
      .filter((p) => p.weekday === i + 1)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((p) => `${heure(p.startsAt)} – ${heure(p.endsAt)}`),
  }));
}

/** Jour ISO (1 = lundi … 7 = dimanche) d'une date, dans le fuseau du navigateur. */
export const jourIso = (date: Date) => ((date.getDay() + 6) % 7) + 1;

export interface Tranche { de: number; jusqua?: number; prix: string; offert: boolean }

const euros = (cents: number) => `${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2).replace('.', ',')} €`;

/** Tranches de frais de déplacement à afficher en cartes : 0–5 km offert, 5–15 km 5 €… puis « sur devis ». */
export function tranches(zone: ZonePublique): Tranche[] {
  if (zone.surPlace) return [];
  const liste: Tranche[] = [];
  if (zone.freeRadiusKm > 0) liste.push({ de: 0, jusqua: zone.freeRadiusKm, prix: 'Offert', offert: true });
  let depuis = zone.freeRadiusKm;
  for (const p of zone.paliers) {
    liste.push({ de: depuis, jusqua: p.jusquaKm, prix: p.prixCents === 0 ? 'Offert' : euros(p.prixCents), offert: p.prixCents === 0 });
    depuis = p.jusquaKm;
  }
  if (depuis < zone.maxDistanceKm) {
    liste.push(zone.pricePerKmCents > 0
      ? { de: depuis, jusqua: zone.maxDistanceKm, prix: `${zone.paliers.length > 0 ? '+ ' : ''}${euros(zone.pricePerKmCents)} / km`, offert: false }
      : { de: depuis, jusqua: zone.maxDistanceKm, prix: 'Offert', offert: true });
  }
  liste.push({ de: zone.maxDistanceKm, prix: 'Sur devis', offert: false });
  return liste;
}
