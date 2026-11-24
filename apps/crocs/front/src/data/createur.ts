/** Créateur du site, à appeler en cas de problème (affiché dans l'espace du patron ; numéro déjà public sur bsandoz.fr). */
export const createur = {
  nom: 'Baptiste Sandoz',
  telephone: '07 69 28 78 37',
  telephoneLien: 'tel:+33769287837',
  /**
   * Lien « laisser un avis » de sa fiche Google (Google Business Profile > Demander des avis > copier le lien).
   * Vide : la demande d'avis n'est pas affichée dans l'espace pro.
   */
  avisGoogle: '',
  /** Son site et son portfolio (bas de l'onglet « Coûts »). */
  liens: [
    { nom: 'Mon site', adresse: 'bsandoz.fr', url: 'https://bsandoz.fr' },
    { nom: 'Mon portfolio', adresse: 'portfolio.bsandoz.fr', url: 'https://portfolio.bsandoz.fr' },
  ],
};
