import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { appliquerTheme, themeActuel, type Theme } from '../../app/theme';
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
    appliquerTheme(suivant);
    setTheme(suivant);
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
          <button type="button" className={styles.rond} onClick={basculer} aria-pressed={theme === 'nuit'} title={theme === 'nuit' ? 'Passer en version claire' : 'Passer en version nuit'}>
            <span aria-hidden="true">{theme === 'nuit' ? '☀' : '☾'}</span>
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
