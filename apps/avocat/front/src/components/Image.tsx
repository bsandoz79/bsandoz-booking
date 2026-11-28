import type { Photo } from '../data/photos';

/**
 * Photo responsive : WebP 800 ou 1600 px selon l'écran, dimensions fixées (pas de décalage au chargement),
 * chargement différé sauf pour la photo du haut de page (`prioritaire`).
 */
export function Image({ photo, sizes, prioritaire = false }: { photo: Photo; sizes: string; prioritaire?: boolean }) {
  return (
    <img
      src={photo.petite}
      srcSet={`${photo.petite} 800w, ${photo.grande} 1600w`}
      sizes={sizes}
      width={photo.largeur}
      height={photo.hauteur}
      alt={photo.alt}
      loading={prioritaire ? 'eager' : 'lazy'}
      fetchPriority={prioritaire ? 'high' : 'auto'}
      decoding="async"
    />
  );
}
