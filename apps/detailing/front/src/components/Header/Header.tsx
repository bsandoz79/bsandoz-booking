import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink } from 'react-router-dom';
import { changerTheme, themeActuel, type Theme } from '../../app/theme';
import { regleFidelite } from '../../services/fidelite';
import { IconeTelephone } from '../Telephone/Telephone';
import { lienTel, useTelephone } from '../Telephone/numeroTelephone';
import { useModeEdition } from '../../app/modeEditionContexte';
import { Icone } from '../Icone/Icone';
import { Installer } from '../Installer/Installer';
import styles from './Header.module.css';

/**
 * En-tête minimal, sur une ligne à toutes les tailles d'écran : logo, « Réserver », téléphone, thème clair / nuit et
 * menu. Le menu (Prestations, Fidélité, Pro, Mon espace, et pour le pro : Espace pro, Installer l'application) se déroule sous la barre ; il se referme en
 * choisissant un lien, avec Échap ou en cliquant ailleurs.
 */
export function Header() {
  const [theme, setTheme] = useState<Theme>(() => themeActuel());
  const [fidelite, setFidelite] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const telephone = useTelephone();
  // Compte pro connecté : accès direct à l'espace pro, bien distinct des autres liens.
  const { peutModifier: pro } = useModeEdition();
  useEffect(() => { regleFidelite().then((r) => setFidelite(r.actif)).catch(() => undefined); }, []);
  useEffect(() => {
    if (!ouvert) return;
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    const ailleurs = (e: MouseEvent) => {
      const cible = e.target as HTMLElement;
      if (!cible.closest('#menu-principal') && !cible.closest('[aria-controls="menu-principal"]')) setOuvert(false);
    };
    document.addEventListener('keydown', echap);
    document.addEventListener('click', ailleurs);
    return () => { document.removeEventListener('keydown', echap); document.removeEventListener('click', ailleurs); };
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
        {/* Barre minimale : Réserver, téléphone, thème et menu ; tous les liens sont dans le menu. */}
        <div className={styles.actions}>
          <Link to="/reserver" className={`btn ${styles.reserver}`}>Réserver</Link>
          {telephone && (
            <a href={lienTel(telephone)} className={styles.appel} aria-label={`Appeler le ${telephone}`} title={`Appeler le ${telephone}`}>
              <IconeTelephone />
            </a>
          )}
          <button type="button" className={styles.astre} onClick={basculer} aria-pressed={theme === 'nuit'} title={theme === 'nuit' ? 'Passer en version claire' : 'Passer en version nuit'}>
            {/* Une roue porte le soleil (en haut) et la lune (en bas) : elle tourne d'un demi-tour, le soleil se couche et
                la lune se lève pendant que le ciel s'assombrit. */}
            <span className={styles.ciel} aria-hidden="true">
              <span className={styles.etoiles} />
              <span className={styles.roue}>
                <svg className={styles.soleil} viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></g></svg>
                <svg className={styles.lune} viewBox="0 0 24 24" width="20" height="20"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" /></svg>
              </span>
            </span>
            <span className={styles.srOnly}>Version nuit</span>
          </button>
          <button type="button" className={`${styles.rond} ${styles.menu}`} aria-expanded={ouvert} aria-controls="menu-principal" onClick={() => setOuvert(!ouvert)}>
            <span aria-hidden="true">{ouvert ? '✕' : '☰'}</span>
            <span className={styles.srOnly}>Menu</span>
          </button>
        </div>
        <nav id="menu-principal" aria-label="Navigation principale" className={`${styles.nav} ${ouvert ? styles.ouvert : ''}`}
          onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOuvert(false); }}>
          <Link to="/#prestations">Prestations</Link>
          {/* Section fidélité de l'accueil : la carte du client connecté, sinon un exemple. */}
          {fidelite && <Link to="/#fidelite">Fidélité</Link>}
          <NavLink to="/professionnels">Pro</NavLink>
          <NavLink to="/mon-espace" className={styles.lienCompte}><Icone nom="utilisateur" taille={18} /> Mon espace</NavLink>
          {pro && <NavLink to="/pro" className={styles.espacePro}><Icone nom="tableau" taille={18} /> Espace pro</NavLink>}
          {/* Compte pro seulement : ajouter le site sur l'écran d'accueil du téléphone (masqué s'il est déjà installé). */}
          {pro && <Installer className={styles.installer} onAction={() => setOuvert(false)} />}
        </nav>
      </div>
    </header>
  );
}
