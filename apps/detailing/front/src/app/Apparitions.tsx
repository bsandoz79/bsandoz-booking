import { useEffect } from 'react';

/**
 * Apparition au défilement : tout élément marqué `data-apparition` glisse doucement en place quand il entre à l'écran
 * (délai facultatif par la variable CSS --delai, pour une cascade). Sans IntersectionObserver ou si le visiteur demande
 * moins d'animations, rien n'est masqué : le contenu reste toujours visible (page pré-générée, moteurs de recherche).
 */
export function Apparitions() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const racine = document.documentElement;
    racine.classList.add('anim');

    const observateur = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observateur.unobserve(e.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    const observer = (noeud: ParentNode) => noeud.querySelectorAll?.('[data-apparition]:not(.visible)').forEach((el) => observateur.observe(el));
    observer(document);
    // Contenu ajouté plus tard (catalogue chargé depuis l'API, changement de page).
    const mutations = new MutationObserver((liste) => {
      for (const m of liste) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches('[data-apparition]:not(.visible)')) observateur.observe(n);
          observer(n);
        });
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => { observateur.disconnect(); mutations.disconnect(); racine.classList.remove('anim'); };
  }, []);
  return null;
}
