import abbevilleEntree800 from '../assets/photos/abbeville-entree-800.webp';
import abbevilleEntree1600 from '../assets/photos/abbeville-entree-1600.webp';
import abbevillePalais800 from '../assets/photos/abbeville-palais-justice-800.webp';
import abbevillePalais1600 from '../assets/photos/abbeville-palais-justice-1600.webp';
import saintVulfran800 from '../assets/photos/abbeville-saint-vulfran-800.webp';
import saintVulfran1600 from '../assets/photos/abbeville-saint-vulfran-1600.webp';
import amiensCourAppel800 from '../assets/photos/amiens-cour-appel-800.webp';
import amiensCourAppel1600 from '../assets/photos/amiens-cour-appel-1600.webp';
import amiensPalais800 from '../assets/photos/amiens-palais-justice-800.webp';
import amiensPalais1600 from '../assets/photos/amiens-palais-justice-1600.webp';

/**
 * Photos des palais de justice d'Abbeville et d'Amiens (Wikimedia Commons, licence CC BY-SA 4.0), en WebP 800 et
 * 1600 px. Elles montrent de vraies juridictions, sans aucun lien avec ce cabinet fictif.
 */
export interface Photo {
  petite: string;
  grande: string;
  largeur: number;
  hauteur: number;
  alt: string;
  credit: { titre: string; auteur: string; licence: string; licenceUrl: string; source: string };
}

const CC_BY_SA_4 = { licence: 'CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' };

export const photos = {
  abbevilleEntree: {
    petite: abbevilleEntree800,
    grande: abbevilleEntree1600,
    largeur: 1600,
    hauteur: 2400,
    alt: 'Façade en pierre d’un palais de justice d’Abbeville, en noir et blanc : l’inscription « Palais de justice » au-dessus d’une grande porte en bois.',
    credit: { titre: 'Abbeville, 80-Fr, palais de justice', auteur: 'Marie-Claude Bastien Saint-Vanne', ...CC_BY_SA_4, source: 'https://commons.wikimedia.org/wiki/File:Abbeville,_80-Fr,_palais_de_justice.jpg' },
  },
  abbevillePalais: {
    petite: abbevillePalais800,
    grande: abbevillePalais1600,
    largeur: 1600,
    hauteur: 1067,
    alt: 'Le palais de justice d’Abbeville, long bâtiment en pierre claire, vu depuis le carrefour.',
    credit: { titre: 'Abbeville, 80, Fr Palais de Justice', auteur: 'APictche', ...CC_BY_SA_4, source: 'https://commons.wikimedia.org/wiki/File:Abbeville,_80,_Fr_Palais_de_Justice.jpg' },
  },
  amiensPalais: {
    petite: amiensPalais800,
    grande: amiensPalais1600,
    largeur: 1600,
    hauteur: 1200,
    alt: 'Le palais de justice d’Amiens : fronton sculpté et colonnade, inscription « Palais de justice ».',
    credit: { titre: 'Palais Justice - Amiens (FR80) - 2021-05-30 - 5', auteur: 'Chabe01', ...CC_BY_SA_4, source: 'https://commons.wikimedia.org/wiki/File:Palais_Justice_-_Amiens_(FR80)_-_2021-05-30_-_5.jpg' },
  },
  amiensCourAppel: {
    petite: amiensCourAppel800,
    grande: amiensCourAppel1600,
    largeur: 1600,
    hauteur: 1098,
    alt: 'Façade de la cour d’appel d’Amiens, en pierre et brique, avec l’inscription « Cour d’appel » sous le fronton.',
    credit: { titre: 'Amiens Cour d’Appel', auteur: 'Zairon', ...CC_BY_SA_4, source: 'https://commons.wikimedia.org/wiki/File:Amiens_Cour_d%27Appel.jpg' },
  },
  saintVulfran: {
    petite: saintVulfran800,
    grande: saintVulfran1600,
    largeur: 1600,
    hauteur: 1200,
    alt: 'La collégiale Saint-Vulfran, au centre d’Abbeville.',
    credit: { titre: 'Abbeville - Eglise Saint-Vulfran - Parvis Saint-Vulfran - ancienne Collégiale (42-2016) P1040201cr', auteur: 'BUFO88', ...CC_BY_SA_4, source: 'https://commons.wikimedia.org/wiki/File:Abbeville_-_Eglise_Saint-Vulfran_-_Parvis_Saint-Vulfran_-_ancienne_Coll%C3%A9giale_(42-2016)_P1040201cr.jpg' },
  },
} satisfies Record<string, Photo>;
