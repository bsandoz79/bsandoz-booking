/**
 * Cabinet d'avocat FICTIF, pour montrer un site vitrine d'avocat (démonstration de Baptiste Sandoz).
 * Baptiste Sandoz n'est pas avocat : nom réel, tout le reste est imaginé et le site le dit partout (bandeau, pied de page,
 * mentions légales). Téléphone dans une tranche réservée à la fiction par l'Arcep, e-mail en example.com (domaine réservé).
 */
export const cabinet = {
  nom: 'Baptiste Sandoz',
  titre: 'Maître Baptiste Sandoz',
  profession: 'Avocat',
  sousTitre: 'Avocat fictif · Abbeville et toute la Somme',
  bandeau: 'Site fictif, réalisé pour démonstration par Baptiste Sandoz, développeur web. Baptiste Sandoz n’est pas avocat : aucune prestation juridique n’est proposée ici.',
  createurLien: 'https://bsandoz.fr',
  telephone: '03 53 01 42 17',
  telephoneLien: 'tel:+33353014217',
  email: 'maitre.sandoz@example.com',
  adresse: '12 place de l’Exemple',
  ville: '80100 Abbeville',
  adresseNote: 'adresse fictive',
  horaires: 'Du lundi au vendredi, 9 h – 12 h · 14 h – 18 h, sur rendez-vous',
};

export const menu = [
  { ancre: 'cabinet', libelle: 'Le cabinet' },
  { ancre: 'parcours', libelle: 'Mon parcours' },
  { ancre: 'domaines', libelle: 'Domaines d’intervention' },
  { ancre: 'contact', libelle: 'Contact' },
];

export const accueil = {
  surtitre: 'Cabinet d’avocat · Abbeville',
  paragraphes: [
    'J’accompagne les particuliers, les artisans et les petites entreprises dans leurs projets numériques et leurs contrats : création d’un site, vente en ligne, droits sur une marque ou sur des photos, impayés d’un client.',
    'Ma méthode : vous écouter, vous expliquer simplement où vous en êtes, puis vous proposer la solution la plus courte, à l’amiable chaque fois que c’est possible.',
    'Mieux vaut un bon contrat qu’un long procès : je vous aide aussi à prévenir les litiges, avant qu’ils n’arrivent.',
  ],
  boutonRdv: 'Prendre rendez-vous',
  boutonDomaines: 'Domaines d’intervention',
};

export const parcours = {
  surtitre: 'Parcours',
  titre: 'Mon parcours',
  note: 'Parcours imaginé pour la démonstration.',
  paragraphes: [
    'Formé au droit privé puis au droit du numérique, j’ai d’abord travaillé aux côtés d’entreprises du web avant d’ouvrir mon cabinet à Abbeville.',
    'Cette double culture, juridique et technique, me permet de comprendre vos outils (site, boutique en ligne, logiciel) aussi bien que vos contrats.',
    'Je reçois au cabinet, en visio ou par téléphone, et je me déplace dans toute la Somme.',
  ],
};

export interface Domaine {
  numero: string;
  titre: string;
  points: string[];
}

export const domaines = {
  surtitre: 'Expertise',
  titre: 'Domaines d’intervention',
  liste: [
    {
      numero: '01',
      titre: 'Droit du numérique',
      points: [
        'Contrats de création de site et de logiciel',
        'Conditions générales de vente en ligne',
        'Mise en conformité RGPD',
        'Noms de domaine et litiges avec un prestataire web',
        'Mentions légales et obligations d’un site',
      ],
    },
    {
      numero: '02',
      titre: 'Droit des contrats',
      points: [
        'Rédaction et relecture de contrats',
        'Factures impayées et recouvrement',
        'Mise en demeure et négociation amiable',
        'Rupture d’un contrat et indemnisation',
        'Litiges entre artisans, clients et fournisseurs',
      ],
    },
    {
      numero: '03',
      titre: 'Propriété intellectuelle',
      points: [
        'Dépôt et protection de marque',
        'Droits d’auteur sur textes, photos et logos',
        'Cession de droits à la fin d’un projet',
        'Contrefaçon et copie de site',
        'Licences d’utilisation',
      ],
    },
  ] satisfies Domaine[],
};

export const contact = {
  surtitre: 'Rendez-vous',
  titre: 'Contact et prise de rendez-vous',
  intro: 'Le cabinet reçoit uniquement sur rendez-vous. Appelez ou écrivez : une réponse vous est apportée sous 48 heures ouvrées.',
};

export const piedDePage = {
  avertissement: 'Les informations de ce site sont générales et ne constituent pas un conseil juridique personnalisé.',
  realisation: 'Site fictif réalisé par Baptiste Sandoz, développeur web',
};
