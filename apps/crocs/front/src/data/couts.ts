import { createur } from './createur';

/**
 * Ce que coûte le site de Croc's, pour le patron (onglet « Coûts » de l'espace pro).
 * Montants relevés le 24/11/2026 : nom de domaine .fr (environ 10 à 15 € par an selon le vendeur), hébergement
 * acceptant PHP, MySQL et les tâches planifiées (o2switch Grow, 84 € HT par an début 2026 ; promotions possibles),
 * tarif horaire de Baptiste Sandoz affiché sur bsandoz.fr. À revoir si les prix changent.
 */
export const couts = {
  releve: 'novembre 2026',
  intro: 'Le site vous appartient. Voici ce qu’il coûte aujourd’hui, ce que coûteraient les options, et ce que ça donne dans le temps.',
  aujourdhui: {
    titre: 'Aujourd’hui',
    lignes: [
      { poste: 'Hébergement du site, de cet espace et des photos', cout: '0 €', detail: `Hébergé par ${createur.nom}, offert pendant 1 an.` },
      { poste: 'Adresse crocs.demo.bsandoz.fr', cout: '0 €', detail: `Une adresse prêtée par ${createur.nom}.` },
      {
        poste: 'Services extérieurs',
        cout: '0 €',
        detail: 'Pas d’e-mails ni de SMS payants. Le calcul du trajet utilise un service gratuit de l’État ; Google Maps, Waze et Plans sont de simples liens.',
      },
    ],
    total: { poste: 'Total', cout: '0 € par mois' },
  },
  options: {
    titre: 'Si vous le souhaitez',
    lignes: [
      { poste: 'Un nom de domaine à votre nom (par exemple crocs-amiens.fr, s’il est libre)', cout: 'environ 10 à 15 €', duree: 'par an, à renouveler chaque année' },
      { poste: 'Votre propre hébergement (il doit accepter PHP, MySQL et les tâches planifiées)', cout: 'environ 85 à 100 €', duree: 'par an' },
      { poste: 'Une aide ou une modification que vous ne pouvez pas faire vous-même', cout: '29 €', duree: 'de l’heure' },
    ],
  },
  dansLeTemps: {
    titre: 'Dans le temps',
    lignes: [
      { periode: 'Première année', paye: '0 € d’hébergement. 10 à 15 € si vous prenez un nom de domaine.' },
      { periode: `Ensuite, toujours hébergé par ${createur.nom}`, paye: 'À décider ensemble. 10 à 15 € par an pour le nom de domaine.' },
      { periode: 'Ensuite, avec votre propre hébergement', paye: 'Environ 85 à 100 € par an, plus 10 à 15 € par an pour le nom de domaine.' },
    ],
  },
  participatif: {
    titre: 'Le prix du site',
    /** Un paragraphe par élément. Études : celles affichées sur bsandoz.fr (page À propos). */
    paragraphes: [
      'Je suis étudiant, en Mastère Expert DevOps à l’EPSI d’Arras. Je me lance à côté de mes études pour les financer. Votre site me permet aussi de prendre de l’expérience et de me faire connaître.',
      'Le prix est donc participatif : vous donnez ce que vous voulez. Si vous ne voulez rien donner, le site vous est laissé quand même.',
      'De mon côté, il me coûte du temps : la création, les mises à jour, l’aide en cas de problème. Pour vous donner un repère, je compte 29 € de l’heure quand je travaille pour un client.',
      'Si le site vous plaît, en parler autour de vous ou laisser un avis m’aide beaucoup.',
    ],
  },
  bonASavoir: `Tant que le site est hébergé par ${createur.nom}, il dépend de son compte d’hébergement. Si cet hébergement s’arrête un jour, le site devra être déplacé vers un hébergement à votre nom.`,
};
