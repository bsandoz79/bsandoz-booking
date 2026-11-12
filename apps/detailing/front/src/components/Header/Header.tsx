import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { appliquerTheme, themeActuel, type Theme } from '../../app/theme';
import { regleFidelite } from '../../services/fidelite';
import styles from './Header.module.css';

export function Header() {
  const [theme, setTheme] = useState<Theme>(() => themeActuel());
  const [fidelite, setFidelite] = useState(false);
  useEffect(() => { regleFidelite().then((r) => setFidelite(r.actif)).catch(() => undefined); }, []);
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
        <button type="button" className={styles.theme} onClick={basculer} aria-pressed={theme === 'nuit'} title={theme === 'nuit' ? 'Passer en version claire' : 'Passer en version nuit'}>
          <span aria-hidden="true">{theme === 'nuit' ? '☀' : '☾'}</span>
          <span className={styles.srOnly}>Version nuit</span>
        </button>
        <nav aria-label="Navigation principale" className={styles.nav}>
          <NavLink to="/#prestations">Prestations</NavLink>
          {/* Section fidélité de l'accueil : la carte du client connecté, sinon un exemple. */}
          {fidelite && <Link to="/#fidelite">Fidélité</Link>}
          <NavLink to="/mon-espace">Mon espace</NavLink>
          <Link to="/reserver" className="btn">Réserver</Link>
        </nav>
      </div>
    </header>
  );
}
