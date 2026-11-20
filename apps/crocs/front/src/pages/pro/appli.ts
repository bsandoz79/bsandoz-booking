/**
 * L'espace du patron s'installe comme une appli sur son téléphone (icône sur l'écran d'accueil, ouverture directe
 * sur /pro, plein écran). Le manifeste n'est ajouté que sur /pro : le site public, lui, reste un site.
 */
export function brancherAppliPro(): void {
  const ajouter = (balise: string, attributs: Record<string, string>) => {
    const el = document.createElement(balise);
    Object.entries(attributs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  };
  ajouter('link', { rel: 'manifest', href: '/pro.webmanifest' });
  ajouter('link', { rel: 'apple-touch-icon', href: '/pro-icones/apple-touch-icon.png' });
  ajouter('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  ajouter('meta', { name: 'apple-mobile-web-app-title', content: 'Croc’s Pro' });
  document.title = 'Croc’s · Espace pro';
}

/** Ouvert depuis l'icône de l'écran d'accueil (déjà installé). */
export const dejaInstallee = () =>
  (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone / iPad : pas de bouton d'installation, il faut passer par « Partager ». */
export const surIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
