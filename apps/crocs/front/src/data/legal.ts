import { crocs } from './crocs';

/** Information manquante, à demander au patron (jamais inventée). */
const A_COMPLETER = (quoi: string) => `[à compléter : ${quoi}]`;

export interface SectionLegale {
  titre: string;
  paragraphes: string[];
}

/**
 * Mentions légales et données personnelles de Croc's (loi pour la confiance dans l'économie numérique, art. 6 ; RGPD).
 * Hébergeur : informations publiées sur la page d'accueil d'o2switch (relevées le 20/11/2026).
 */
export const mentionsLegales: SectionLegale[] = [
  {
    titre: 'Éditeur du site',
    paragraphes: [
      `${crocs.nom}, ${crocs.activite.toLowerCase()}, ${crocs.adresse}, ${crocs.ville}. Téléphone : ${crocs.telephone}.`,
      `Raison sociale et forme : ${A_COMPLETER('nom de l’entreprise et forme juridique (EI, SARL…)')}. SIRET : ${A_COMPLETER('numéro SIRET')}.`,
      `Directeur de la publication : ${A_COMPLETER('nom du responsable')}.`,
    ],
  },
  {
    titre: 'Hébergeur',
    paragraphes: [
      `o2switch, SAS au capital de 100 000 €, RCS Clermont-Ferrand, SIRET 510 909 807 00032. Adresse : ${A_COMPLETER('adresse de l’hébergeur')}. Téléphone : 04 44 44 60 40. Site : www.o2switch.fr.`,
    ],
  },
  {
    titre: 'Réalisation',
    paragraphes: ['Site conçu et réalisé par Baptiste Sandoz, développeur web : bsandoz.fr.'],
  },
  {
    titre: 'Données personnelles',
    paragraphes: [
      'Ce site ne vous demande aucune information pour être consulté. Il n’utilise ni cookie de suivi, ni outil de mesure d’audience, ni publicité : aucun bandeau de consentement n’est donc nécessaire.',
      'Temps de trajet : si vous utilisez votre position, le calcul se fait dans votre navigateur et votre position n’est envoyée à personne. Si vous tapez une adresse, elle est envoyée à la Base Adresse Nationale (api-adresse.data.gouv.fr, service public de l’État) pour la situer, puis n’est pas conservée par ce site.',
      'Les liens Google Maps, Waze et Plans ouvrent ces services, qui appliquent leurs propres règles de confidentialité.',
      'Espace réservé au commerce : la connexion utilise un cookie nécessaire au maintien de la session, sans autre usage.',
      `Pour toute question sur vos données, ou pour exercer vos droits (accès, rectification, effacement), adressez-vous à ${crocs.nom} : ${crocs.adresse}, ${crocs.ville}, ${crocs.telephone}. Vous pouvez aussi saisir la CNIL (cnil.fr).`,
    ],
  },
  {
    titre: 'Avis et photos',
    paragraphes: [
      'Les avis sont ceux laissés par des clients, recopiés tels quels avec l’endroit où ils ont été publiés. Les photos et les textes du site appartiennent à leurs auteurs : toute reproduction demande leur accord.',
    ],
  },
];
