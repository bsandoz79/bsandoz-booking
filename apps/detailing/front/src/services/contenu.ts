import { http, isDemo } from './api';
import { authHttp } from './compte';

/**
 * Contenu du site modifiable par le pro (rubrique « Mon site » de l'espace pro), stocké par l'API (`GET /site`,
 * `PUT /admin/site`). Ce qui n'a jamais été modifié garde les textes par défaut ci-dessous.
 * Ne jamais inventer d'avis, de chiffres ni de coordonnées : ce qui n'est pas connu reste « [à compléter] ».
 */

export interface Etape { titre: string; texte: string }
export interface Question { question: string; reponse: string }
export interface Avis { auteur: string; note: number; texte: string; date: string }
export interface Realisation { titre: string; avant: string; apres: string }

export interface ContenuSite {
  coordonnees: { telephone: string; email: string; adresse: string; horaires: string };
  /** `photo` : adresse de la photo du haut de l'accueil (vide : photo du camion fournie avec le site). */
  accueil: { surtitre: string; titre: string; introduction: string; arguments: string[]; photo: string };
  etapes: Etape[];
  faq: Question[];
  avis: Avis[];
  realisations: Realisation[];
  /** Communes desservies, affichées dans la zone d'intervention (et utiles au référencement local). */
  communes: string[];
  legal: { responsable: string; statut: string; siret: string; adresse: string; tva: string; mediateur: string; retractation: string; conservation: string };
}

export const A_COMPLETER = '[à compléter]';

export const CONTENU_PAR_DEFAUT: ContenuSite = {
  coordonnees: { telephone: '01 02 03 04 05', email: 'contact@bsandoz.fr', adresse: 'Abbeville', horaires: 'du lundi au samedi de 8 h à 19 h, le dimanche de 10 h à 18 h' },
  accueil: {
    surtitre: 'Nettoyage intérieur · extérieur · rénovation optique à domicile',
    titre: 'Un habitacle comme au premier jour',
    introduction: 'On vient à vous, vous ne bougez pas.',
    photo: '',
    arguments: ['Eau et électricité autonomes', 'Déplacement offert : Abbeville et 5 km autour', 'Désodorisant Perfect Clean offert', 'Intervention possible en moins de 24 h'],
  },
  etapes: [
    { titre: 'Choisissez votre prestation', texte: 'Intérieur, extérieur, phares ou soin à la carte : le prix s’affiche tout de suite, le même pour tous les véhicules.' },
    { titre: 'Réservez un créneau', texte: 'Indiquez votre adresse, choisissez le jour et l’heure, payez en ligne ou sur place, sans acompte.' },
    { titre: 'Je viens chez vous', texte: 'J’arrive avec tout le matériel. Le solde se règle sur place, une fois le travail terminé.' },
  ],
  faq: [
    { question: 'Ai-je besoin de fournir l’eau ou l’électricité ?', reponse: 'Non, j’arrive avec le matériel nécessaire. Il suffit d’un emplacement où garer le véhicule.' },
    { question: 'Faut-il payer à la réservation ?', reponse: 'Non, aucun acompte n’est demandé. Vous choisissez : tout régler en ligne au moment de réserver, ou sur place une fois la prestation terminée.' },
    { question: 'Puis-je annuler ou déplacer mon rendez-vous ?', reponse: 'Oui, depuis le lien reçu par e-mail ou votre espace client. L’annulation est gratuite jusqu’à 48 h avant le rendez-vous : si vous avez payé en ligne, vous êtes intégralement remboursé.' },
    { question: 'Combien de temps dure une prestation ?', reponse: 'Cela dépend de la formule et de l’état du véhicule : de 1 h à 1 h 30 pour un Éclat, jusqu’à 3 h 30 à 5 h pour une Excellence. Pour les formules longues, je réserve la demi-journée.' },
  ],
  avis: [],
  realisations: [
    { titre: 'Intérieur Signature', avant: '', apres: '' },
    { titre: 'Extérieur Excellence', avant: '', apres: '' },
    { titre: 'Rénovation des phares', avant: '', apres: '' },
  ],
  communes: ['Abbeville', 'Saint-Valery-sur-Somme', 'Le Crotoy', 'Rue', 'Cayeux-sur-Mer', 'Friville-Escarbotin', 'Gamaches', 'Pont-Remy', 'Saint-Riquier', 'Crécy-en-Ponthieu'],
  legal: {
    // Données de démonstration, volontairement fictives : à remplacer par les vraies (crayon des pages légales ou « Mon site »).
    responsable: 'Baptiste Sandoz',
    statut: 'Entreprise individuelle (micro-entreprise) — données de démonstration',
    siret: '000 000 000 00000 (fictif, démonstration)',
    adresse: '12 rue de la Démonstration, 80100 Abbeville (adresse fictive)',
    tva: 'TVA non applicable, art. 293 B du CGI',
    mediateur: 'Médiateur de la consommation : [fictif, démonstration]',
    retractation: '[à compléter : régime applicable à faire valider (prestation de service à date déterminée, article L221-28 du Code de la consommation).]',
    conservation: '3 ans après le dernier rendez-vous (données de démonstration)',
  },
};

/** Complète le contenu enregistré avec les valeurs par défaut (rubrique par rubrique ; une liste enregistrée remplace celle par défaut). */
export function fusionner(enregistre: Partial<Record<keyof ContenuSite, unknown>>): ContenuSite {
  const resultat = { ...CONTENU_PAR_DEFAUT } as Record<string, unknown>;
  for (const [cle, defaut] of Object.entries(CONTENU_PAR_DEFAUT)) {
    const valeur = (enregistre as Record<string, unknown>)[cle];
    if (valeur === undefined || valeur === null) continue;
    if (Array.isArray(defaut)) {
      if (Array.isArray(valeur)) resultat[cle] = valeur;
    } else if (typeof valeur === 'object' && !Array.isArray(valeur)) {
      resultat[cle] = { ...defaut, ...(valeur as object) };
    }
  }
  return resultat as unknown as ContenuSite;
}

let demo: Partial<ContenuSite> = {};

export async function chargerContenu(): Promise<ContenuSite> {
  if (isDemo()) return fusionner(demo);
  return fusionner(await http<Partial<ContenuSite>>('/site'));
}

export async function enregistrerContenu(contenu: ContenuSite): Promise<ContenuSite> {
  if (isDemo()) { demo = structuredClone(contenu); return fusionner(demo); }
  return fusionner(await authHttp<Partial<ContenuSite>>('/admin/site', { method: 'PUT', body: JSON.stringify(contenu) }));
}

/** Envoie une photo (JPEG, PNG ou WebP, 5 Mo au plus) et renvoie son adresse publique. */
export async function envoyerPhoto(fichier: File): Promise<string> {
  if (fichier.size > 5 * 1024 * 1024) throw new Error('La photo dépasse 5 Mo : réduisez-la avant de l’envoyer.');
  if (isDemo()) return URL.createObjectURL(fichier);
  const donnees = new FormData();
  donnees.append('fichier', fichier);
  return (await authHttp<{ name: string; url: string }>('/admin/medias', { method: 'POST', body: donnees })).url;
}
