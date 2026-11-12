import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { appliquerTheme, themeActuel, type Theme } from '../../app/theme';
import styles from './Header.module.css';

export function Header() {
  const [theme, setTheme] = useState<Theme>(() => themeActuel());
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
        <nav aria-label="Navigation principale" className={styles.nav}>
          <NavLink to="/#prestations">Prestations</NavLink>
          <NavLink to="/mon-espace">Mon espace</NavLink>
          <button type="button" className={styles.theme} onClick={basculer} aria-pressed={theme === 'nuit'} title={theme === 'nuit' ? 'Passer en version claire' : 'Passer en version nuit'}>
            <span aria-hidden="true">{theme === 'nuit' ? '☀' : '☾'}</span>
            <span className={styles.srOnly}>Version nuit</span>
          </button>
          <Link to="/reserver" className="btn">Réserver</Link>
        </nav>
      </div>
    </header>
  );
}
