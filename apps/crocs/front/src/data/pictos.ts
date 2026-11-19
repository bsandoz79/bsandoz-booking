import type { IconeCarte } from '@bsandoz/ui';
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

/** Pictogrammes dessinés pour les rubriques de la carte : la clé est enregistrée par l'API (`icone`). */
export const pictos: IconeCarte[] = [
  { cle: 'sandwich', nom: 'Sandwich', url: sandwich },
  { cle: 'libanais', nom: 'Galette roulée', url: libanais },
  { cle: 'menu', nom: 'Menu (boisson et frites)', url: menu },
  { cle: 'tacos', nom: 'Tacos', url: tacos },
  { cle: 'assiette', nom: 'Assiette', url: assiette },
  { cle: 'burger', nom: 'Burger', url: burger },
  { cle: 'panini', nom: 'Panini', url: panini },
  { cle: 'pilon', nom: 'Pilon de poulet', url: pilon },
  { cle: 'frites', nom: 'Frites', url: frites },
  { cle: 'canette', nom: 'Canette', url: canette },
];

export const urlPicto = (cle: string | null | undefined) => pictos.find((p) => p.cle === cle)?.url;
