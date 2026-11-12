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
  accueil: { surtitre: string; titre: string; introduction: string; arguments: string[] };
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
    surtitre: 'Votre voiture comme neuve, sans bouger de chez vous',
    titre: 'Nettoyage de voiture à domicile à Abbeville',
    introduction: 'Nettoyage intérieur et extérieur, rénovation des phares : je viens à votre adresse, autonome en eau et en électricité. Réservez votre créneau en ligne en quelques minutes.',
    arguments: ['Autonome en eau et en électricité', 'Déplacement offert dans un rayon de 5 km', 'Acompte en ligne, solde sur place'],
  },
  etapes: [
    { titre: 'Choisissez votre prestation', texte: 'Intérieur, extérieur, phares ou soin à la carte : le prix s’affiche tout de suite, le même pour tous les véhicules.' },
    { titre: 'Réservez un créneau', texte: 'Indiquez votre adresse, choisissez le jour et l’heure, réglez l’acompte en ligne.' },
    { titre: 'Je viens chez vous', texte: 'J’arrive avec tout le matériel. Le solde se règle sur place, une fois le travail terminé.' },
  ],
  faq: [
    { question: 'Ai-je besoin de fournir l’eau ou l’électricité ?', reponse: 'Non, j’arrive avec le matériel nécessaire. Il suffit d’un emplacement où garer le véhicule.' },
    { question: 'Comment fonctionne l’acompte ?', reponse: 'Un acompte de 30 % est demandé en ligne pour confirmer le rendez-vous. Le solde se règle sur place.' },
    { question: 'Puis-je annuler ou déplacer mon rendez-vous ?', reponse: 'Oui, depuis le lien reçu par e-mail ou votre espace client. L’annulation est gratuite jusqu’à 48 h avant le rendez-vous : l’acompte vous est alors remboursé.' },
    { question: 'Combien de temps dure une prestation ?', reponse: 'Cela dépend de la formule et de l’état du véhicule : de 1 h pour un Éclat à 5 h pour une Excellence. Pour les formules longues, je réserve la demi-journée.' },
  ],
  avis: [],
  realisations: [
    { titre: 'Intérieur Signature', avant: '', apres: '' },
    { titre: 'Extérieur Excellence', avant: '', apres: '' },
    { titre: 'Rénovation des phares', avant: '', apres: '' },
  ],
  communes: ['Abbeville', 'Saint-Valery-sur-Somme', 'Le Crotoy', 'Rue', 'Cayeux-sur-Mer', 'Friville-Escarbotin', 'Gamaches', 'Pont-Remy', 'Saint-Riquier', 'Crécy-en-Ponthieu'],
  legal: {
    responsable: A_COMPLETER, statut: A_COMPLETER, siret: A_COMPLETER, adresse: A_COMPLETER, tva: A_COMPLETER, mediateur: A_COMPLETER,
    retractation: '[à compléter : régime applicable à faire valider (prestation de service à date déterminée, article L221-28 du Code de la consommation).]',
    conservation: A_COMPLETER,
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
