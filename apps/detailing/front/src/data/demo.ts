/**
 * Données de DÉMONSTRATION de Perfect Clean, utilisées tant que l'API n'est pas branchée (VITE_API_URL vide).
 * Identiques à `php bin/console detailing:demo:charger` côté API. Un seul prix par formule, quel que soit le véhicule.
 * Les durées des soins à la carte et des options sont des estimations [à confirmer] par l'artisan.
 */
export type Category = 'interieur' | 'exterieur' | 'optique' | 'carte';

export interface Formule {
  id: string;
  category: Category | string;
  name: string;
  description: string;
  /** Prix (centimes) et durée (minutes) de base, appliqués quel que soit le véhicule. */
  basePriceCents: number;
  baseDurationMin: number;
  /** Prix et durée propres à une variante (type de véhicule), si l'artisan en définit. */
  tarifs: Record<string, { priceCents: number; durationMin: number }>;
  optionIds: string[];
  /** Durée incertaine : la prestation occupe la demi-journée (débuts de demi-journée uniquement). */
  occupePlage?: boolean;
  /** Mise en avant (ex. « Le plus choisi »), réglée dans l'espace pro. */
  badge?: string | null;
}

export interface OptionItem { id: string; name: string; description: string; priceCents: number; durationMin: number }

/** Produit vendu avec la réservation (réglé avec la prestation, apporté le jour du rendez-vous). `stock` : quantité maximale. */
export interface ProduitItem { id: string; name: string; description: string; priceCents: number; stock: number; photo: string | null }

/** Produits de démonstration (mode hors API) : prix d'exemple, les vrais produits et prix sont saisis dans l'espace pro. */
export const PRODUITS: ProduitItem[] = [
  { id: 'microfibre', name: 'Microfibre', description: 'Chiffon microfibre pour l’entretien entre deux passages.', priceCents: 500, stock: 10, photo: null },
  { id: 'anti-buee', name: 'Anti-buée', description: 'Pour garder des vitres claires l’hiver.', priceCents: 900, stock: 3, photo: null },
];

export const CATEGORIES: { value: Category; label: string; description: string }[] = [
  { value: 'interieur', label: 'Nettoyage intérieur', description: 'Sièges, moquettes, plastiques, vitres : un habitacle comme neuf.' },
  { value: 'exterieur', label: 'Nettoyage extérieur', description: 'Lavage à la main, jantes, vitres et finitions.' },
  { value: 'optique', label: 'Rénovation des phares', description: 'Des phares clairs, sans les remplacer.' },
  { value: 'carte', label: 'Soins à la carte', description: 'Un besoin précis : sièges, cuirs, ciel de toit, céramique, jantes.' },
];

export const VEHICLE_TYPES = [
  { value: 'citadine', label: 'Citadine' },
  { value: 'berline_break', label: 'Berline / Break' },
  { value: 'suv', label: 'SUV / 4x4' },
  { value: 'utilitaire', label: 'Utilitaire' },
];

const INTERIEUR_OPTIONS = ['poils', 'tres-sale-int'];

const f = (id: string, category: Category, name: string, description: string, prix: number, duree: number, optionIds: string[] = [], extra: Partial<Formule> = {}): Formule => ({
  id, category, name, description, basePriceCents: prix, baseDurationMin: duree, tarifs: {}, optionIds, ...extra,
});

export const FORMULES: Formule[] = [
  f('int-eclat', 'interieur', 'Intérieur Éclat', 'Nettoyage approfondi des surfaces, aspiration minutieuse de l’habitacle, nettoyage des vitres intérieures, parfum d’ambiance. Durée : 1 h à 1 h 30.', 2900, 90, [...INTERIEUR_OPTIONS, 'desodorisant']),
  f('int-signature', 'interieur', 'Intérieur Signature', 'Éclat, shampooing des tapis et moquettes, contours de portes (intérieur / extérieur / coffre), nettoyage du pare-brise intérieur, nettoyage du coffre, shampooing des sièges à l’injecteur-extracteur, entretien des cuirs à la main, entretien de l’alcantara à la main, imperméabilisation textile [Durée limitée], désodorisant voiture [Offert · durée limitée]. Durée : 2 h 30 à 3 h 30.', 6900, 150, INTERIEUR_OPTIONS, { occupePlage: true, badge: 'Le plus choisi' }),
  f('int-excellence', 'interieur', 'Intérieur Excellence', 'Signature, désinfection intégrale à la vapeur, rénovation et entretien des joints, soin nourrissant longue durée des cuirs, protection des plastiques, nettoyage des ceintures, traitement anti-buée [Nouveau], désodorisant voiture [Offert · durée limitée]. Durée : 3 h 30 à 5 h.', 8900, 210, INTERIEUR_OPTIONS, { occupePlage: true }),
  f('ext-eclat', 'exterieur', 'Extérieur Éclat', 'Prélavage à la mousse active, lavage à la main, séchage microfibre, vitres. Durée : 1 h à 1 h 30.', 2500, 90, ['tres-sale-ext']),
  f('ext-signature', 'exterieur', 'Extérieur Signature', 'Éclat, plus jantes nettoyées en profondeur, passages de roues, séchage complet, pneus lustrés. Durée : 1 h 30 à 2 h.', 4500, 120, ['tres-sale-ext'], { badge: 'Le plus choisi' }),
  f('ext-excellence', 'exterieur', 'Extérieur Excellence', 'Signature, plus prélavage renforcé, joints de portes, démoustiquage, plastiques et joints extérieurs rénovés, dégoudronnage. Durée : 2 h 30 à 3 h 30.', 7000, 210, ['tres-sale-ext'], { occupePlage: true }),
  f('phares', 'optique', 'Rénovation des phares', 'Les deux phares retrouvent leur transparence, sans remplacement : meilleure visibilité et contrôle technique serein. Prix pour la paire. Durée : environ 1 h 30.', 4500, 90, ['deuxieme-vehicule']),
  f('carte-sieges', 'carte', 'Shampoing des sièges', 'Sièges en tissu nettoyés à l’injecteur-extracteur.', 3900, 60),
  f('carte-cuirs', 'carte', 'Nettoyage des cuirs', 'Cuirs nettoyés et entretenus à la main.', 3500, 60),
  f('carte-moquettes', 'carte', 'Moquettes et tapis de sol', 'Shampoing complet des moquettes et des tapis.', 3500, 60),
  f('carte-ciel', 'carte', 'Ciel de toit', 'Ciel de toit en textile nettoyé sans être détrempé.', 3500, 45),
  f('carte-ceramique', 'carte', 'Céramique vitres et pare-brise', 'Traitement hydrophobe de toutes les vitres : la pluie glisse.', 5900, 60),
  f('carte-ceramique-pb', 'carte', 'Céramique pare-brise', 'Traitement hydrophobe du pare-brise seul.', 3500, 30),
  f('carte-jantes', 'carte', 'Les 4 jantes', 'Décontamination et brossage des quatre jantes.', 2500, 30),
  f('carte-jantes-pneus', 'carte', 'Jantes et pneus', 'Les quatre jantes et les pneus nettoyés en entier.', 3000, 40),
];

export const OPTIONS: OptionItem[] = [
  { id: 'poils', name: 'Poils d’animaux', description: 'Retrait des poils incrustés dans les sièges et les moquettes.', priceCents: 1000, durationMin: 30 },
  { id: 'tres-sale-int', name: 'Véhicule très sale', description: 'Supplément pour un intérieur demandant plus de temps.', priceCents: 1000, durationMin: 30 },
  { id: 'desodorisant', name: 'Désodorisant', description: 'Désodorisant laissé dans le véhicule.', priceCents: 400, durationMin: 0 },
  { id: 'tres-sale-ext', name: 'Véhicule très sale', description: 'Supplément pour une carrosserie très encrassée.', priceCents: 1000, durationMin: 20 },
  { id: 'deuxieme-vehicule', name: 'Deuxième véhicule', description: 'Rénovation des phares d’un deuxième véhicule, le même jour.', priceCents: 4000, durationMin: 90 },
]

/** Prix et durée d'une formule pour une variante (prix unique si l'artisan n'a pas défini de prix par véhicule). */
export const tarifDe = (formule: Formule, variante?: string) =>
  (variante ? formule.tarifs[variante] : undefined) ?? { priceCents: formule.basePriceCents, durationMin: formule.baseDurationMin };

/** Prix le plus bas d'une formule (« à partir de »). */
export const prixMin = (formule: Formule) => Math.min(formule.basePriceCents, ...Object.values(formule.tarifs).map((t) => t.priceCents));

/** Règles de démonstration : départ d'Abbeville, 5 km offerts, puis 5 € jusqu'à 15 km, 10 € jusqu'à 30 km, 20 € jusqu'à 50 km. */
export const DEMO_RULES = {
  depositPercent: 0, rayonVilleKm: 4, freeRadiusKm: 5, pricePerKmCents: 0, maxDistanceKm: 50, origin: { lat: 50.1054, lng: 1.8357 },
  paliers: [{ jusquaKm: 15, prixCents: 500 }, { jusquaKm: 30, prixCents: 1000 }, { jusquaKm: 50, prixCents: 2000 }],
};
