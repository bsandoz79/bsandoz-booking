/**
 * Cabinet d'avocat FICTIF en droit pénal, pour montrer un site vitrine d'avocat (démonstration de Baptiste Sandoz).
 * Baptiste Sandoz n'est pas avocat : nom réel, tout le reste est imaginé et le site le dit partout (bandeau, pied de page,
 * mentions légales). Téléphone dans une tranche réservée à la fiction par l'Arcep, e-mail en example.com (domaine réservé).
 * Les juridictions citées existent (Abbeville, Amiens) ; les règles de procédure citées sont celles du droit français.
 */
import { photos, type Photo } from './photos';

export const cabinet = {
  nom: 'Baptiste Sandoz',
  titre: 'Maître Baptiste Sandoz',
  profession: 'Avocat pénaliste',
  sousTitre: 'Avocat au barreau d’Abbeville (fictif) · Droit pénal et droit routier',
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
  { ancre: 'domaines', libelle: 'Domaines' },
  { ancre: 'procedure', libelle: 'La procédure' },
  { ancre: 'juridictions', libelle: 'Juridictions' },
  { ancre: 'honoraires', libelle: 'Honoraires' },
  { ancre: 'contact', libelle: 'Contact' },
];

export const accueil = {
  surtitre: 'Cabinet de droit pénal · Abbeville et Amiens',
  photo: photos.abbevilleEntree,
  paragraphes: [
    'Défense des personnes mises en cause, assistance des victimes, contentieux du permis de conduire : le cabinet intervient à chaque stade de la procédure pénale, de la garde à vue jusqu’à l’audience devant la cour d’appel.',
    'Il plaide devant le tribunal judiciaire d’Abbeville, le tribunal judiciaire d’Amiens, la cour d’appel d’Amiens et la cour d’assises de la Somme.',
  ],
  boutonRdv: 'Prendre rendez-vous',
  boutonDomaines: 'Domaines d’intervention',
};

/** Encadré d'urgence : la garde à vue. Droit à l'avocat dès le début de la mesure (article 63-3-1 du code de procédure pénale). */
export const urgence = {
  titre: 'Garde à vue : un proche vient d’être interpellé ?',
  texte: 'Dès le début de la garde à vue, la personne peut demander à être assistée par un avocat qu’elle désigne. Elle peut donner le nom de Maître Sandoz à l’officier de police judiciaire, qui prévient le cabinet. Entretien confidentiel de trente minutes, puis présence aux auditions.',
  lien: 'Joindre la permanence',
};

export const parcours = {
  surtitre: 'Le cabinet',
  titre: 'Un avocat à vos côtés, du commissariat à la salle d’audience',
  photo: photos.saintVulfran,
  note: 'Parcours imaginé pour la démonstration.',
  paragraphes: [
    'Inscrit au barreau d’Abbeville, j’exerce une activité dominante en droit pénal. J’assiste aussi bien la personne poursuivie que la victime, devant toutes les juridictions pénales de la Somme.',
    'Le cabinet se trouve au centre d’Abbeville, à quelques minutes du tribunal judiciaire. Je me déplace au commissariat, à la gendarmerie et dans les juridictions du ressort de la cour d’appel d’Amiens (Somme, Oise, Aisne).',
    'Chaque dossier commence par une lecture complète de la procédure : procès-verbaux d’audition, expertises, réquisitions. Une nullité de procédure, un délai dépassé ou une preuve contestable peuvent changer l’issue d’une affaire.',
  ],
  serment: 'Je jure, comme avocat, d’exercer mes fonctions avec dignité, conscience, indépendance, probité et humanité.',
  sermentSource: 'Serment de l’avocat, article 3 de la loi du 31 décembre 1971',
  precision: 'Activité dominante ne veut pas dire « spécialiste » : ce titre est réservé aux avocats titulaires d’un certificat de spécialisation délivré par le Conseil national des barreaux.',
};

export interface Domaine {
  numero: string;
  titre: string;
  intro: string;
  points: string[];
}

export const domaines = {
  surtitre: 'Expertise',
  titre: 'Domaines d’intervention',
  liste: [
    {
      numero: '01',
      titre: 'Défense pénale',
      intro: 'Vous êtes convoqué, poursuivi ou mis en examen.',
      points: [
        'Garde à vue et audition libre',
        'Comparution immédiate',
        'Tribunal correctionnel et tribunal de police',
        'Comparution sur reconnaissance préalable de culpabilité (CRPC)',
        'Instruction : mise en examen, détention provisoire, demande de mise en liberté',
        'Cour criminelle départementale et cour d’assises',
      ],
    },
    {
      numero: '02',
      titre: 'Droit des victimes',
      intro: 'Vous avez subi une infraction et souhaitez être reconnu et indemnisé.',
      points: [
        'Dépôt de plainte et plainte avec constitution de partie civile',
        'Constitution de partie civile à l’audience',
        'Évaluation du préjudice corporel et moral',
        'Indemnisation devant la CIVI (commission d’indemnisation des victimes d’infractions)',
        'Violences, accidents de la route, escroqueries',
      ],
    },
    {
      numero: '03',
      titre: 'Droit routier',
      intro: 'Votre permis de conduire est menacé.',
      points: [
        'Rétention et suspension administrative du permis',
        'Conduite sous l’empire d’un état alcoolique ou après usage de stupéfiants',
        'Grand excès de vitesse et délit de fuite',
        'Annulation du permis et retrait de points',
        'Contestation d’un avis de contravention',
      ],
    },
    {
      numero: '04',
      titre: 'Exécution des peines',
      intro: 'Une condamnation a été prononcée : sa mise en œuvre peut encore être discutée.',
      points: [
        'Aménagement de peine devant le juge de l’application des peines',
        'Détention à domicile sous surveillance électronique',
        'Semi-liberté et libération conditionnelle',
        'Confusion de peines et réhabilitation',
      ],
    },
  ] satisfies Domaine[],
};

export interface Etape {
  titre: string;
  texte: string;
}

/** Les grandes étapes d'une affaire pénale (procédure française). */
export const procedure = {
  surtitre: 'Comprendre',
  titre: 'Les étapes d’une procédure pénale',
  intro: 'Savoir où en est votre dossier, c’est savoir ce qui peut encore être fait. À chaque étape, le cabinet vous explique vos droits et les choix possibles.',
  etapes: [
    { titre: 'L’enquête', texte: 'Audition libre ou garde à vue, perquisition, expertises. L’avocat assiste aux auditions et peut présenter des observations écrites, jointes à la procédure.' },
    { titre: 'Les poursuites', texte: 'Le procureur de la République décide : classement sans suite, alternative aux poursuites, convocation devant le tribunal, comparution immédiate ou ouverture d’une information judiciaire.' },
    { titre: 'L’audience', texte: 'Accès au dossier, examen des nullités de procédure, préparation des témoins et des pièces, puis plaidoirie devant la juridiction de jugement.' },
    { titre: 'Le jugement et les recours', texte: 'Relaxe, acquittement ou condamnation. En matière correctionnelle, le délai d’appel est de dix jours à compter du jugement : il ne faut pas attendre.' },
    { titre: 'L’exécution', texte: 'Paiement de l’amende, sursis, travail d’intérêt général, aménagement de la peine d’emprisonnement devant le juge de l’application des peines.' },
  ] satisfies Etape[],
};

export interface Juridiction {
  nom: string;
  lieu: string;
  texte: string;
  photo: Photo;
}

/** Juridictions réelles où un avocat d'Abbeville plaide (photos libres de droits, voir les mentions légales). */
export const juridictions = {
  surtitre: 'Où le cabinet plaide',
  titre: 'Les juridictions de la Somme',
  liste: [
    {
      nom: 'Tribunal judiciaire d’Abbeville',
      lieu: 'Abbeville',
      texte: 'Tribunal correctionnel, tribunal de police et juge des libertés et de la détention.',
      photo: photos.abbevillePalais,
    },
    {
      nom: 'Palais de justice d’Amiens',
      lieu: 'Amiens',
      texte: 'Tribunal judiciaire d’Amiens et sessions de la cour d’assises de la Somme et de la cour criminelle départementale.',
      photo: photos.amiensPalais,
    },
    {
      nom: 'Cour d’appel d’Amiens',
      lieu: 'Amiens',
      texte: 'Chambre des appels correctionnels et chambre de l’instruction, pour les affaires de la Somme, de l’Oise et de l’Aisne.',
      photo: photos.amiensCourAppel,
    },
  ] satisfies Juridiction[],
  note: 'Photos de bâtiments réels, sans lien avec ce cabinet fictif.',
};

export const honoraires = {
  surtitre: 'Transparence',
  titre: 'Honoraires',
  points: [
    { titre: 'Une convention écrite', texte: 'Une convention d’honoraires est signée avant toute intervention, sauf urgence, comme l’impose la loi (article 10 de la loi du 31 décembre 1971). Elle fixe le montant ou son mode de calcul.' },
    { titre: 'Forfait ou temps passé', texte: 'Forfait pour une garde à vue ou une audience, honoraires au temps passé pour une instruction longue. Un honoraire de résultat peut s’y ajouter, jamais seul.' },
    { titre: 'Aide juridictionnelle', texte: 'Selon vos ressources, l’État peut prendre en charge tout ou partie des honoraires. Le cabinet accepte les dossiers à l’aide juridictionnelle.' },
    { titre: 'Protection juridique', texte: 'Votre contrat d’assurance (habitation, automobile, carte bancaire) peut comprendre une protection juridique : pensez à la vérifier.' },
  ],
};

export const contact = {
  surtitre: 'Rendez-vous',
  titre: 'Contact et prise de rendez-vous',
  intro: 'Le cabinet reçoit sur rendez-vous, au cabinet ou en visioconférence. Tout ce que vous confiez est couvert par le secret professionnel. En cas de garde à vue, appelez directement.',
};

export const piedDePage = {
  avertissement: 'Les informations de ce site sont générales et ne constituent pas un conseil juridique personnalisé.',
  realisation: 'Site fictif réalisé par Baptiste Sandoz, développeur web',
};
