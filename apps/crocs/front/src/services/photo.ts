/**
 * Réduit une photo avant l'envoi (1600 px au plus grand côté, JPEG) : une photo de téléphone de plusieurs Mo
 * passe sous la limite de 5 Mo de l'API et s'affiche vite. Navigateur sans les outils nécessaires : fichier d'origine.
 */
export async function reduirePhoto(fichier: File, cote = 1600): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return fichier;
  try {
    const image = await createImageBitmap(fichier);
    const echelle = Math.min(1, cote / Math.max(image.width, image.height));
    const toile = document.createElement('canvas');
    toile.width = Math.round(image.width * echelle);
    toile.height = Math.round(image.height * echelle);
    const dessin = toile.getContext('2d');
    if (!dessin) return fichier;
    dessin.drawImage(image, 0, 0, toile.width, toile.height);
    image.close();
    const reduite = await new Promise<Blob | null>((ok) => toile.toBlob(ok, 'image/jpeg', 0.85));
    return reduite ?? fichier;
  } catch {
    return fichier;
  }
}
