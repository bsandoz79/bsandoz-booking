import { Link, NavLink } from 'react-router-dom';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand}>
          <img src="/logo.png" alt="Perfect Clean" width="64" height="56" />
        </Link>
        <nav aria-label="Navigation principale" className={styles.nav}>
          <NavLink to="/#prestations">Prestations</NavLink>
          <NavLink to="/mon-espace">Mon espace</NavLink>
          <Link to="/reserver" className="btn">Réserver</Link>
        </nav>
      </div>
    </header>
  );
}
