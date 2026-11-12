/**
 * Version claire / nuit. Le choix du visiteur est enregistré dans le navigateur ; sans choix, on suit le réglage du
 * téléphone ou de l'ordinateur. Le thème est posé avant l'affichage par le script de index.html (pas de flash).
 */
export type Theme = 'clair' | 'nuit';

const CLE = 'theme';
const COULEUR_BARRE: Record<Theme, string> = { clair: '#0f1b2d', nuit: '#060d18' };

export function themeActuel(): Theme {
  return document.documentElement.dataset.theme === 'nuit' ? 'nuit' : 'clair';
}

export function appliquerTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COULEUR_BARRE[theme]);
  try { localStorage.setItem(CLE, theme); } catch { /* navigation privée : choix non mémorisé */ }
}

/**
 * Change de thème avec un effet de rideau (View Transitions) : vers la nuit, le nouveau thème s'ouvre de gauche à
 * droite ; vers le clair, de droite à gauche. `majInterface` met à jour l'affichage React dans la transition.
 * Sans prise en charge du navigateur, ou si le visiteur demande moins d'animations : changement immédiat.
 */
export function changerTheme(theme: Theme, majInterface: () => void = () => undefined): void {
  const racine = document.documentElement;
  const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const appliquer = () => { appliquerTheme(theme); majInterface(); };
  if (reduit || typeof document.startViewTransition !== 'function') { appliquer(); return; }

  racine.dataset.rideau = theme;
  const transition = document.startViewTransition(appliquer);
  void transition.finished.finally(() => { delete racine.dataset.rideau; });
}
