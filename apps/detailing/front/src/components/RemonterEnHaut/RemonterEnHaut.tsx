import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './RemonterEnHaut.module.css';

/**
 * Petit bouton rond en bas à gauche pour remonter en haut de la page, visible après avoir fait défiler un écran.
 * Absent de la réservation (sa barre de paiement occupe déjà le bas de l'écran).
 */
export function RemonterEnHaut() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const suivre = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    suivre();
    window.addEventListener('scroll', suivre, { passive: true });
    return () => window.removeEventListener('scroll', suivre);
  }, []);

  if (!visible || pathname.startsWith('/reserver')) return null;

  const remonter = () => {
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduit ? 'auto' : 'smooth' });
  };

  return (
    <button type="button" className={styles.bouton} onClick={remonter} aria-label="Remonter en haut de la page" title="Remonter en haut">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}
