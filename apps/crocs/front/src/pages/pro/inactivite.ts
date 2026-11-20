import { useEffect } from 'react';

/** Déconnexion après 30 minutes sans toucher l'espace (téléphone laissé ouvert, appli rouverte plus tard). */
export const DELAI_INACTIVITE = 30 * 60 * 1000;
const CLE = 'crocs-pro-derniere-activite';

const lire = () => {
  try {
    return Number(localStorage.getItem(CLE)) || null;
  } catch {
    return null;
  }
};

export const noterActivite = () => {
  try {
    localStorage.setItem(CLE, String(Date.now()));
  } catch {
    /* stockage indisponible : la session suit alors seulement le serveur */
  }
};

export const oublierActivite = () => {
  try {
    localStorage.removeItem(CLE);
  } catch {
    /* rien à oublier */
  }
};

/** Dernière activité connue datant de plus de 30 minutes. */
export const inactifTropLongtemps = (maintenant = Date.now()) => {
  const derniere = lire();
  return derniere !== null && maintenant - derniere > DELAI_INACTIVITE;
};

/**
 * Pendant la session : chaque toucher ou frappe compte comme une activité ; toutes les 30 s, et au retour sur
 * l'appli, on vérifie le délai et on appelle `onExpire` s'il est dépassé.
 */
export function useInactivite(actif: boolean, onExpire: () => void) {
  useEffect(() => {
    if (!actif) return;
    noterActivite();
    const verifier = () => { if (inactifTropLongtemps()) onExpire(); };
    const visible = () => { if (document.visibilityState === 'visible') verifier(); };
    // Une vérification avant de compter l'activité : un geste après 30 minutes ne prolonge pas une session expirée.
    const activite = () => {
      if (inactifTropLongtemps()) onExpire();
      else noterActivite();
    };
    const minuteur = window.setInterval(verifier, 30_000);
    window.addEventListener('pointerdown', activite);
    window.addEventListener('keydown', activite);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(minuteur);
      window.removeEventListener('pointerdown', activite);
      window.removeEventListener('keydown', activite);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [actif, onExpire]);
}
