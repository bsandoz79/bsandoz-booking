import { cabinet } from './cabinet';
import { photos } from './photos';

export interface SectionLegale {
  titre: string;
  paragraphes: string[];
}

export interface PageLegale {
  titre: string;
  intro: string;
  sections: SectionLegale[];
}

/** Hébergeur : page d'accueil d'o2switch et annuaire des entreprises (relevés le 20/11/2026, comme pour Croc's). */
const HEBERGEUR =
  'o2switch, SAS au capital de 100 000 €, RCS Clermont-Ferrand, SIRET 510 909 807 00032. Siège : chemin des Pardiaux, 63000 Clermont-Ferrand. Téléphone : 04 44 44 60 40. Site : www.o2switch.fr.';

export const mentionsLegales: PageLegale = {
  titre: 'Mentions légales',
  intro: 'Ce site est une démonstration : le cabinet, l’adresse, le téléphone et l’e-mail sont fictifs.',
  sections: [
    {
      titre: 'Nature du site',
      paragraphes: [
        cabinet.bandeau,
        'Le cabinet, le parcours et l’inscription au barreau sont imaginés pour montrer à quoi peut ressembler le site d’un cabinet d’avocat en droit pénal. Les juridictions citées et les règles de procédure décrites sont réelles, mais présentées de façon générale.',
      ],
    },
    {
      titre: 'Éditeur du site',
      paragraphes: [
        'Baptiste Sandoz, développeur web (création de sites internet).',
        'Directeur de la publication : Baptiste Sandoz. Contact : bsandoz.fr.',
      ],
    },
    { titre: 'Hébergeur', paragraphes: [HEBERGEUR] },
    {
      titre: 'Propriété intellectuelle',
      paragraphes: ['Les textes et la mise en page de ce site appartiennent à Baptiste Sandoz. Leur reproduction sans autorisation est interdite. Les photographies restent la propriété de leurs auteurs (voir « Crédits photos »).'],
    },
    {
      titre: 'Crédits photos',
      paragraphes: [
        'Photographies de Wikimedia Commons, publiées sous licence libre et redimensionnées pour ce site. Elles montrent des bâtiments réels (palais de justice d’Abbeville et d’Amiens, collégiale Saint-Vulfran), sans aucun lien avec ce cabinet fictif.',
        ...Object.values(photos).map((p) => `« ${p.credit.titre} », ${p.credit.auteur}, ${p.credit.licence} (${p.credit.licenceUrl}). Source : ${p.credit.source}`),
      ],
    },
    {
      titre: 'Données personnelles',
      paragraphes: ['Leur traitement est décrit dans la politique de confidentialité.'],
    },
    { titre: 'Droit applicable', paragraphes: ['Ce site est soumis au droit français.'] },
  ],
};

export const confidentialite: PageLegale = {
  titre: 'Politique de confidentialité',
  intro: 'Ce site ne collecte aucune donnée personnelle.',
  sections: [
    {
      titre: 'Données collectées',
      paragraphes: [
        'Ce site ne comporte ni formulaire, ni espace client, ni commentaires. Il ne vous demande aucune information pour être consulté.',
        'Le téléphone et l’e-mail affichés sont fictifs : n’y envoyez aucune information.',
      ],
    },
    {
      titre: 'Cookies et mesure d’audience',
      paragraphes: ['Aucun cookie, aucun outil de mesure d’audience, aucune publicité : aucun bandeau de consentement n’est donc nécessaire.'],
    },
    {
      titre: 'Hébergement',
      paragraphes: [
        `Comme tout hébergeur, ${HEBERGEUR.split(',')[0]} enregistre des journaux techniques (adresse IP, page demandée, date) pour la sécurité du serveur.`,
      ],
    },
    {
      titre: 'Vos droits',
      paragraphes: ['Pour toute question, contactez Baptiste Sandoz par bsandoz.fr. Vous pouvez aussi saisir la CNIL (cnil.fr).'],
    },
  ],
};
