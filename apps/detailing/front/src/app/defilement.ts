/**
 * Fait défiler la page jusqu'à l'élément `id`, en l'attendant s'il n'est pas encore affiché (contenu chargé depuis
 * l'API, partie suivante d'un formulaire). Défilement doux, sauf si le visiteur a demandé moins d'animations.
 * Renvoie une fonction d'annulation.
 */
export function defilerVers(id: string, attenteMaxMs = 3000): () => void {
  const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let essais = 0;
  const minuterie = window.setInterval(() => {
    // Page fermée entre-temps (changement de page, fin d'un test) : on arrête.
    if (typeof document === 'undefined') { window.clearInterval(minuterie); return; }
    const cible = document.getElementById(id);
    if (cible) { cible.scrollIntoView?.({ behavior: reduit ? 'auto' : 'smooth', block: 'start' }); window.clearInterval(minuterie); }
    else if (++essais * 100 > attenteMaxMs) window.clearInterval(minuterie);
  }, 100);
  return () => window.clearInterval(minuterie);
}
