import type { RubriqueCarte } from '@bsandoz/ui';
import assiette from '../assets/pictos/assiette.svg';
import burger from '../assets/pictos/burger.svg';
import canette from '../assets/pictos/canette.svg';
import frites from '../assets/pictos/frites.svg';
import libanais from '../assets/pictos/libanais.svg';
import menu from '../assets/pictos/menu.svg';
import panini from '../assets/pictos/panini.svg';
import pilon from '../assets/pictos/pilon.svg';
import sandwich from '../assets/pictos/sandwich.svg';
import tacos from '../assets/pictos/tacos.svg';

/**
 * Données de Croc's pour la démo. Source : informations publiques (annuaires, photo de la carte en vitrine) relevées
 * le 19/11/2026, voir docs/crocs/carte-releve.md. Prix et horaires à faire valider par le patron.
 */
export const crocs = {
  nom: 'Croc’s',
  activite: 'Restauration rapide',
  adresse: '220 rue de Rouen',
  ville: '80000 Amiens',
  telephone: '03 22 90 10 22',
  telephoneLien: 'tel:+33322901022',
  /** Base Adresse Nationale (api-adresse.data.gouv.fr), score 0,98. */
  position: { lat: 49.887017, lng: 2.282462 },
  accroche: 'Kebabs, tacos, libanais, paninis et burgers, rue de Rouen à Amiens.',
  horaires: [
    { jours: 'Du lundi au samedi', heures: '11 h 30 – 14 h 30 · 18 h – 22 h 30' },
    { jours: 'Dimanche', heures: 'à confirmer' },
  ],
  /** Les annuaires ne sont pas d'accord sur le dimanche : à demander au patron. */
  horairesAConfirmer: true,
};

export const itineraires = {
  google: `https://www.google.com/maps/dir/?api=1&destination=${crocs.position.lat},${crocs.position.lng}`,
  waze: `https://waze.com/ul?ll=${crocs.position.lat},${crocs.position.lng}&navigate=yes`,
  plans: `https://maps.apple.com/?daddr=${crocs.position.lat},${crocs.position.lng}`,
};

/** Avis publiés sur Restaurant Guru, cités tels quels (à garder seulement avec l'accord du patron). */
export const avis = [
  { auteur: 'Amanda', note: 5, quand: 'il y a environ 6 ans', texte: 'J’adore ça fait plusieurs année que j’y vais, je n’ai jamais été déçue. Très bon et propre, ils sont très agréable. Je recommande.' },
  { auteur: 'Lea', note: 5, quand: 'il y a environ 2 ans', texte: 'Merci pour ce tacos D’Halloween incroyable' },
  { auteur: 'Claire', note: 5, quand: 'il y a environ 3 ans', texte: 'Très bon snack' },
];

let n = 0;
const a = (nom: string, prixCents: number, description?: string) => ({ id: `a${++n}`, nom, prixCents, description });
const r = (pictogramme: string, nom: string, articles: ReturnType<typeof a>[], note?: string): RubriqueCarte => ({ id: `r${++n}`, nom, pictogramme, articles, note });

/** Carte relevée sur la photo de la carte en vitrine (prix à faire valider). */
export const carte: RubriqueCarte[] = [
  r(sandwich, 'Les Sandwichs', [a('Kebab', 550, 'Poulet-dinde'), a('Steak', 500), a('Chicken chika', 600)], 'Avec frites : + 1 €'),
  r(libanais, 'Les Libanais', [a('Classic', 550, 'Poulet-dinde'), a('Royal', 650, 'Steak, veau-dinde'), a('Chicken chika / Savoyard', 600)], 'Avec frites : + 1 €'),
  r(menu, 'Les Menus', [a('Menu Kebab', 750, 'Kebab, frites, boisson 33 cl'), a('Menu Libanais', 750, 'Libanais, frites, boisson 33 cl'), a('Menu Enfant', 400, '4 nuggets, frites, boisson')]),
  r(tacos, 'Les Tacos', [a('1 viande', 650), a('2 viandes', 750), a('3 viandes', 900)], 'Kebab, nuggets, poulet ou steak'),
  r(assiette, 'Les Assiettes', [a('Kebab', 850, 'Poulet-dinde'), a('Steak', 850, '2 × 100 g'), a('3 Merguez', 800), a('Chicken chika', 900), a('Viande + frites', 850), a('Mixte', 1000, 'Steak et kebab')]),
  r(burger, 'Les Burgers', [a('Burger simple', 450), a('Double steak', 600), a('Triple steak', 800), a('Chicken burger', 500), a('Mega burger', 600)], 'Avec frites + boisson 33 cl : + 2 €'),
  r(panini, 'Les Paninis', [a('Steak', 500), a('Kebab', 500), a('3 Fromages', 500), a('Brochette poulet', 500), a('Fricadelle', 500), a('Mexicanos', 500), a('Thon', 500), a('Fish', 500), a('Chicken chika', 500)], 'En menu (boisson 33 cl + frites) : 7 € · Avec frites : + 1 €'),
  r(pilon, 'Nuggets et Wings', [a('Nuggets 6 pièces', 400), a('Nuggets 10 pièces', 600), a('Wings 5 pièces', 600), a('Wings 10 pièces', 1000)], 'Avec frites : + 1 €'),
  r(frites, 'À côté', [a('Barquette de viande', 600), a('Frites petite', 250), a('Frites grande', 300), a('Supplément viande', 150), a('Supplément fromage', 50)]),
  r(canette, 'Les Boissons', [a('Canette 33 cl', 150), a('Bouteille 50 cl', 200), a('Bouteille 1,5 l', 300), a('Eau 33 cl', 100), a('Café', 100)]),
];
