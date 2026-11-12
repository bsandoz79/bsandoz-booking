/**
 * Informations fixes du site Perfect Clean. Les textes, coordonnées et informations légales modifiables par le pro
 * sont dans `services/contenu.ts` (rubrique « Mon site » de l'espace pro).
 */
import { DEMO_RULES } from './demo';

export const SITE = {
  brand: 'Perfect Clean',
  activity: 'Detailing et nettoyage auto à domicile',
  /** Ville de départ des déplacements (point d'origine de la zone dans l'API). */
  city: 'Abbeville',
  freeRadiusKm: DEMO_RULES.freeRadiusKm,
  maxDistanceKm: DEMO_RULES.maxDistanceKm,
  pricePerKmCents: DEMO_RULES.pricePerKmCents,
  depositPercent: DEMO_RULES.depositPercent,
  /** Délai d'annulation gratuite (heures), identique à `free_cancel_hours` de l'API. */
  freeCancelHours: 48,
  legal: {
    host: 'o2switch, Chemin des Pardiaux, 63000 Clermont-Ferrand, France',
  },
} as const;

