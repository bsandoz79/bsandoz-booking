import { useEffect, useState } from 'react';

/** Invitation d'installation proposée par le navigateur (Chrome, Edge, Samsung Internet… ; pas Safari). */
interface InvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let invitation: InvitationInstallation | null = null;
let installe = false;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

/**
 * À appeler au démarrage : le navigateur n'envoie l'invitation qu'une fois, souvent avant l'affichage du menu.
 * On la garde pour le bouton « Installer l'application ».
 */
export function ecouterInstallation(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invitation = e as InvitationInstallation;
    prevenir();
  });
  window.addEventListener('appinstalled', () => { installe = true; invitation = null; prevenir(); });
}

/** Le site est-il déjà ouvert comme une application (depuis l'icône de l'écran d'accueil) ? */
export function ouvertCommeApplication(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  return standalone || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone ou iPad (Safari n'a pas d'invitation : il faut passer par le bouton Partager). */
export function estAppareilApple(agent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
}

/**
 * État de l'installation : `visible` si le bouton a un sens (pas déjà installé), `installer()` ouvre l'invitation du
 * navigateur quand elle existe et renvoie `false` sinon (il faut alors expliquer la marche à suivre).
 */
export function useInstallation(): { visible: boolean; directe: boolean; installer: () => Promise<boolean> } {
  const [, rafraichir] = useState(0);
  useEffect(() => {
    const f = () => rafraichir((n) => n + 1);
    abonnes.add(f);
    return () => { abonnes.delete(f); };
  }, []);
  const installer = async () => {
    if (!invitation) return false;
    const courante = invitation;
    await courante.prompt();
    const { outcome } = await courante.userChoice;
    if (outcome === 'accepted') { installe = true; invitation = null; prevenir(); }
    return true;
  };
  return { visible: !installe && !ouvertCommeApplication(), directe: invitation !== null, installer };
}
