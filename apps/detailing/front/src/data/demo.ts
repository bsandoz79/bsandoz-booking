/**
 * Données de DÉMONSTRATION, utilisées tant que l'API n'est pas branchée (VITE_API_URL vide).
 * Les vrais prix et horaires seront saisis par l'artisan dans son espace pro.
 */
export type Category = 'auto' | 'canape';

export interface Formule {
  id: string;
  category: Category;
  name: string;
  description: string;
  /** Prix (centimes) et durée (minutes) par variante. */
  tarifs: Record<string, { priceCents: number; durationMin: number }>;
  optionIds: string[];
  /** Durée incertaine : la prestation occupe la demi-journée (débuts de demi-journée uniquement). */
  occupePlage?: boolean;
  badge?: string;
}

export interface OptionItem { id: string; name: string; description: string; priceCents: number; durationMin: number }

export const VEHICLE_TYPES = [
  { value: 'citadine', label: 'Citadine' },
  { value: 'berline_break', label: 'Berline / Break' },
  { value: 'suv', label: 'SUV / 4x4' },
  { value: 'utilitaire', label: 'Utilitaire' },
];

const t = (c: number, b: number, s: number, u: number, d: number) => ({
  citadine: { priceCents: c, durationMin: d },
  berline_break: { priceCents: b, durationMin: d + 15 },
  suv: { priceCents: s, durationMin: d + 30 },
  utilitaire: { priceCents: u, durationMin: d + 45 },
});

export const FORMULES: Formule[] = [
  { id: 'interieur', category: 'auto', name: 'Intérieur', description: 'Aspiration, plastiques, vitres intérieures, tapis.', tarifs: t(6900, 7900, 8900, 9900, 90), optionIds: ['poils', 'sieges', 'odeur'] },
  { id: 'exterieur', category: 'auto', name: 'Extérieur', description: 'Lavage à la main, jantes, vitres, cire de protection.', tarifs: t(4900, 5900, 6900, 7900, 60), optionIds: ['jantes', 'odeur'] },
  { id: 'complet', category: 'auto', name: 'Complet', description: 'Intérieur et extérieur en une seule intervention.', tarifs: t(10900, 12900, 14900, 16900, 150), optionIds: ['poils', 'sieges', 'jantes', 'odeur'], occupePlage: true, badge: 'Recommandé' },
  { id: 'canape', category: 'canape', name: 'Nettoyage de canapé', description: 'Injection-extraction, détachage, séchage rapide.', tarifs: { canape_2: { priceCents: 6900, durationMin: 60 }, canape_3: { priceCents: 8900, durationMin: 75 }, canape_4: { priceCents: 10900, durationMin: 90 } }, optionIds: ['odeur'] },
];

export const OPTIONS: OptionItem[] = [
  { id: 'poils', name: "Poils d'animaux", description: 'Retrait minutieux des poils incrustés.', priceCents: 1500, durationMin: 30 },
  { id: 'sieges', name: 'Shampoing des sièges', description: 'Tissus nettoyés en profondeur.', priceCents: 2500, durationMin: 30 },
  { id: 'jantes', name: 'Jantes et pneus', description: 'Décontamination et brillant pneus.', priceCents: 1500, durationMin: 20 },
  { id: 'odeur', name: 'Traitement des odeurs', description: 'Neutralise tabac et humidité.', priceCents: 2000, durationMin: 15 },
];

export const DEMO_RULES = { depositPercent: 30, freeRadiusKm: 15, pricePerKmCents: 50, maxDistanceKm: 60 };
