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
