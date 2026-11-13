const sansAccents = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtre une liste par texte (sans accents ni majuscules) et par catégorie (vide : toutes). */
export function filtrer<T>(liste: T[], recherche: string, categorie: string, texte: (e: T) => string, cat: (e: T) => string): T[] {
  const q = sansAccents(recherche.trim());
  return liste.filter((e) => (!categorie || cat(e) === categorie) && (!q || sansAccents(texte(e)).includes(q)));
}
