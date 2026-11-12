import { useEffect } from 'react';

/** Titre, description et adresse canonique de la page affichée (navigation dans le site sans rechargement). */
export function useSeo(titre: string, description?: string) {
  useEffect(() => {
    document.title = titre;
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
    const canonique = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonique) canonique.href = `${window.location.origin}${window.location.pathname === '/' ? '/' : window.location.pathname.replace(/\/$/, '')}`;
  }, [titre, description]);
}
