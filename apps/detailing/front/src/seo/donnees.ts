/**
 * Données du référencement local (Abbeville et alentours). Fichier SANS import : il est lu à la fois par le site
 * et par `scripts/prerender.ts` (pages HTML générées au build pour les moteurs de recherche).
 * Prix et horaires à garder alignés sur le catalogue (`data/demo.ts`) et les horaires de l'API.
 */

export interface Commune { slug: string; nom: string; codePostal: string }

/** Communes desservies (départ d'Abbeville, 50 km au plus) : une page par commune. */
export const COMMUNES: Commune[] = [
  { slug: 'abbeville', nom: 'Abbeville', codePostal: '80100' },
  { slug: 'saint-valery-sur-somme', nom: 'Saint-Valery-sur-Somme', codePostal: '80230' },
  { slug: 'le-crotoy', nom: 'Le Crotoy', codePostal: '80550' },
  { slug: 'rue', nom: 'Rue', codePostal: '80120' },
  { slug: 'cayeux-sur-mer', nom: 'Cayeux-sur-Mer', codePostal: '80410' },
  { slug: 'friville-escarbotin', nom: 'Friville-Escarbotin', codePostal: '80130' },
  { slug: 'feuquieres-en-vimeu', nom: 'Feuquières-en-Vimeu', codePostal: '80210' },
  { slug: 'gamaches', nom: 'Gamaches', codePostal: '80220' },
  { slug: 'pont-remy', nom: 'Pont-Remy', codePostal: '80580' },
  { slug: 'hallencourt', nom: 'Hallencourt', codePostal: '80490' },
  { slug: 'saint-riquier', nom: 'Saint-Riquier', codePostal: '80135' },
  { slug: 'ailly-le-haut-clocher', nom: 'Ailly-le-Haut-Clocher', codePostal: '80690' },
  { slug: 'crecy-en-ponthieu', nom: 'Crécy-en-Ponthieu', codePostal: '80150' },
  { slug: 'long', nom: 'Long', codePostal: '80510' },
  { slug: 'mareuil-caubert', nom: 'Mareuil-Caubert', codePostal: '80132' },
  { slug: 'drucat', nom: 'Drucat', codePostal: '80132' },
];

export const ENTREPRISE = {
  nom: 'Perfect Clean',
  ville: 'Abbeville',
  codePostal: '80100',
  region: 'Hauts-de-France',
  /** Centre d'Abbeville (point de départ affiché aux moteurs, pas une adresse personnelle). */
  geo: { latitude: 50.1054, longitude: 1.8357 },
  rayonKm: 50,
  fourchettePrix: '25 € – 89 €',
  horaires: [
    { jours: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], ouverture: '08:00', fermeture: '19:00' },
    { jours: ['Sunday'], ouverture: '10:00', fermeture: '18:00' },
  ],
};

/** Prestations phares mises en avant dans les pages et les données structurées. */
export const PRESTATIONS_SEO = [
  { nom: 'Nettoyage intérieur de voiture', detail: 'aspiration, sièges, moquettes, plastiques, vitres', aPartirDe: 29 },
  { nom: 'Lavage extérieur à la main', detail: 'mousse active, jantes, vitres, finitions', aPartirDe: 25 },
  { nom: 'Rénovation des phares', detail: 'phares clairs sans remplacement, la paire', aPartirDe: 45 },
  { nom: 'Shampoing des sièges et moquettes', detail: 'injecteur-extracteur', aPartirDe: 35 },
  { nom: 'Traitement céramique des vitres', detail: 'effet déperlant', aPartirDe: 35 },
];

export const MOTS_CLES = 'nettoyage voiture Abbeville, lavage auto à domicile Abbeville, nettoyage intérieur voiture Abbeville, detailing Abbeville, lavage voiture à domicile Somme, nettoyage auto Baie de Somme';

export interface PageSeo { chemin: string; titre: string; description: string; h1: string; texte: string }

const titreCommune = (c: Commune) => `Nettoyage voiture à domicile ${c.nom} | Perfect Clean`;

export function pageCommune(c: Commune): PageSeo {
  return {
    chemin: `/nettoyage-voiture/${c.slug}`,
    titre: titreCommune(c),
    description: `Nettoyage de voiture à domicile à ${c.nom} : intérieur dès 29 €, extérieur à la main dès 25 €, phares 45 €. Autonome en eau et électricité.`,
    h1: `Nettoyage de voiture à domicile à ${c.nom}`,
    texte: `Perfect Clean se déplace à ${c.nom} (${c.codePostal}) et dans les environs d’Abbeville pour nettoyer votre voiture chez vous ou au travail : nettoyage intérieur, lavage extérieur à la main, rénovation des phares et soins à la carte. Matériel autonome en eau et en électricité, prix affiché avant de réserver, créneau choisi en ligne.`,
  };
}

/** Pages publiques générées au build (titre, description, contenu lisible sans JavaScript). */
export const PAGES_SEO: PageSeo[] = [
  {
    chemin: '/',
    titre: 'Nettoyage voiture à domicile à Abbeville | Perfect Clean',
    description: 'Nettoyage de voiture à domicile à Abbeville et alentours : intérieur dès 29 €, extérieur à la main dès 25 €, phares 45 €. Réservation en ligne.',
    h1: 'Nettoyage de voiture à domicile à Abbeville',
    texte: 'Nettoyage intérieur et extérieur, rénovation des phares, shampoing des sièges : Perfect Clean vient chez vous à Abbeville et dans un rayon de 50 km, autonome en eau et en électricité. Le prix s’affiche tout de suite, le même pour tous les véhicules, et vous réservez votre créneau en ligne.',
  },
  {
    chemin: '/reserver',
    titre: 'Réserver un nettoyage de voiture à domicile – Abbeville | Perfect Clean',
    description: 'Choisissez votre prestation, votre adresse et votre créneau : nettoyage de voiture à domicile à Abbeville et alentours, acompte en ligne, solde sur place.',
    h1: 'Réserver un nettoyage de voiture à domicile',
    texte: 'Choisissez la prestation (intérieur, extérieur, phares ou soin à la carte), indiquez votre adresse pour calculer le déplacement, puis le jour et l’heure qui vous conviennent.',
  },
  ...COMMUNES.map(pageCommune),
  { chemin: '/mentions-legales', titre: 'Mentions légales | Perfect Clean', description: 'Mentions légales du site Perfect Clean, nettoyage de voiture à domicile à Abbeville.', h1: 'Mentions légales', texte: '' },
  { chemin: '/cgv', titre: 'Conditions générales de vente | Perfect Clean', description: 'Conditions générales de vente : prix, acompte, annulation et déroulement des prestations de nettoyage de voiture à domicile.', h1: 'Conditions générales de vente', texte: '' },
  { chemin: '/confidentialite', titre: 'Politique de confidentialité | Perfect Clean', description: 'Données personnelles collectées lors d’une réservation et vos droits.', h1: 'Politique de confidentialité', texte: '' },
];

/** Données structurées schema.org (entreprise locale de lavage automobile), insérées dans chaque page publique. */
export function donneesStructurees(urlSite: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoWash',
    name: ENTREPRISE.nom,
    url: urlSite,
    image: `${urlSite}/icon-512.png`,
    description: 'Nettoyage et lavage de voiture à domicile à Abbeville et alentours : intérieur, extérieur, rénovation des phares.',
    priceRange: ENTREPRISE.fourchettePrix,
    address: { '@type': 'PostalAddress', addressLocality: ENTREPRISE.ville, postalCode: ENTREPRISE.codePostal, addressRegion: ENTREPRISE.region, addressCountry: 'FR' },
    geo: { '@type': 'GeoCoordinates', ...ENTREPRISE.geo },
    areaServed: [
      { '@type': 'GeoCircle', geoMidpoint: { '@type': 'GeoCoordinates', ...ENTREPRISE.geo }, geoRadius: ENTREPRISE.rayonKm * 1000 },
      ...COMMUNES.map((c) => ({ '@type': 'City', name: c.nom })),
    ],
    openingHoursSpecification: ENTREPRISE.horaires.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.jours, opens: h.ouverture, closes: h.fermeture })),
    makesOffer: PRESTATIONS_SEO.map((p) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: p.nom, description: p.detail },
      priceSpecification: { '@type': 'PriceSpecification', minPrice: p.aPartirDe, priceCurrency: 'EUR' },
    })),
  };
}
