/**
 * Informations du site Perfect Clean. Tout ce qui n'est pas connu reste « [à compléter] » :
 * ne jamais inventer d'avis, de chiffres ni de coordonnées.
 */
import { DEMO_RULES } from './demo';

const A_COMPLETER = '[à compléter]';

export const SITE = {
  brand: 'Perfect Clean',
  activity: 'Detailing et nettoyage auto à domicile',
  /** Ville de départ des déplacements (point d'origine de la zone dans l'API). */
  city: 'Abbeville',
  phone: A_COMPLETER,
  email: A_COMPLETER,
  hours: 'du lundi au samedi de 8 h à 19 h, le dimanche de 10 h à 18 h',
  freeRadiusKm: DEMO_RULES.freeRadiusKm,
  maxDistanceKm: DEMO_RULES.maxDistanceKm,
  pricePerKmCents: DEMO_RULES.pricePerKmCents,
  depositPercent: DEMO_RULES.depositPercent,
  /** Délai d'annulation gratuite (heures), identique à `free_cancel_hours` de l'API. */
  freeCancelHours: 48,
  legal: {
    owner: A_COMPLETER,
    status: A_COMPLETER,
    siret: A_COMPLETER,
    address: A_COMPLETER,
    vat: A_COMPLETER,
    host: 'o2switch, Chemin des Pardiaux, 63000 Clermont-Ferrand, France',
    mediator: A_COMPLETER,
  },
} as const;

export const A_COMPLETER_TEXTE = A_COMPLETER;
