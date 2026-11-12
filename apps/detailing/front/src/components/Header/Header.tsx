import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink } from 'react-router-dom';
import { changerTheme, themeActuel, type Theme } from '../../app/theme';
import { regleFidelite } from '../../services/fidelite';
import styles from './Header.module.css';

/**
 * En-tête sur une seule ligne : logo, liens, bouton clair / nuit et « Réserver ». Sur téléphone, les liens passent
 * dans un menu déroulant (bouton « Menu »), refermé en choisissant un lien ou avec Échap.
 */
export function Header() {
  const [theme, setTheme] = useState<Theme>(() => themeActuel());
  const [fidelite, setFidelite] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => { regleFidelite().then((r) => setFidelite(r.actif)).catch(() => undefined); }, []);
  useEffect(() => {
    if (!ouvert) return;
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    document.addEventListener('keydown', echap);
    return () => document.removeEventListener('keydown', echap);
  }, [ouvert]);

  const basculer = () => {
    const suivant: Theme = theme === 'nuit' ? 'clair' : 'nuit';
    // L'interrupteur bascule dans la même image que la page, pour l'effet de rideau.
    changerTheme(suivant, () => flushSync(() => setTheme(suivant)));
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand}>
          <img src="/logo.png" alt="Perfect Clean" width="64" height="56" />
        </Link>
        <nav id="menu-principal" aria-label="Navigation principale" className={`${styles.nav} ${ouvert ? styles.ouvert : ''}`}
          onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOuvert(false); }}>
          <NavLink to="/#prestations">Prestations</NavLink>
          {/* Section fidélité de l'accueil : la carte du client connecté, sinon un exemple. */}
          {fidelite && <Link to="/#fidelite">Fidélité</Link>}
          <NavLink to="/mon-espace">Mon espace</NavLink>
        </nav>
        <div className={styles.actions}>
          <button type="button" className={styles.interrupteur} onClick={basculer} aria-pressed={theme === 'nuit'} title={theme === 'nuit' ? 'Passer en version claire' : 'Passer en version nuit'}>
            <span className={styles.piste} aria-hidden="true">
              <span className={styles.etoiles} />
              <span className={styles.bouton}>
                {theme === 'nuit' ? (
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></g></svg>
                )}
              </span>
            </span>
            <span className={styles.srOnly}>Version nuit</span>
          </button>
          <Link to="/reserver" className={`btn ${styles.reserver}`}>Réserver</Link>
          <button type="button" className={`${styles.rond} ${styles.menu}`} aria-expanded={ouvert} aria-controls="menu-principal" onClick={() => setOuvert(!ouvert)}>
            <span aria-hidden="true">{ouvert ? '✕' : '☰'}</span>
            <span className={styles.srOnly}>Menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
