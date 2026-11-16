import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { IconeTelephone } from '../../components/Telephone/Telephone';
import { lienTel } from '../../components/Telephone/numeroTelephone';
import styles from './HeroDefilement.module.css';

/** Avancement entre deux points du défilement (0 avant, 1 après). */
const entre = (p: number, debut: number, fin: number) => Math.min(1, Math.max(0, (p - debut) / (fin - debut)));
const moinsDAnimations = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Avancement à partir duquel le texte final arrive. */
const SEUIL_TEXTE = 0.8;

/**
 * Haut de l'accueil piloté par le défilement, façon « reel » : la section reste à l'écran pendant qu'on fait défiler.
 *  1. « Faites défiler pour nettoyer » : l'habitacle sale, qu'une barre de lumière nettoie au fil du défilement ;
 *  2. « Regardez de plus près » : un phare jauni, rénové de la même façon ;
 *  3. le titre, la phrase, les boutons et les points forts arrivent ; la suite du site vient ensuite.
 * Photos avant / après de vraies prestations, même cadrage. « Moins d'animations » ou mode modification : directement
 * l'étape 3 (photo « après », texte), sans section épinglée.
 */
export function HeroDefilement({ surtitre, titre, introduction, points, telephone, statique = false }: {
  surtitre: string; titre: string; introduction: string; points: string[]; telephone?: string; statique?: boolean;
}) {
  const section = useRef<HTMLElement>(null);
  const [fixe] = useState(moinsDAnimations);
  const [texte, setTexte] = useState(false);
  const simple = fixe || statique;

  useEffect(() => {
    const el = section.current;
    if (!el || simple) return;
    let attente = 0;
    const calculer = () => {
      attente = 0;
      const hauteur = el.offsetHeight - window.innerHeight;
      const p = hauteur > 0 ? entre(-el.getBoundingClientRect().top, 0, hauteur) : 1;
      const valeurs: Record<string, number> = {
        '--invite': 1 - entre(p, 0, 0.06),
        '--interieur': entre(p, 0.04, 0.42) * 100,
        '--phare': entre(p, 0.42, 0.5),
        '--zoom': 1.18 - 0.18 * entre(p, 0.42, 0.62),
        '--phare-net': entre(p, 0.52, 0.76) * 100,
        '--detail': entre(p, 0.44, 0.5) * (1 - entre(p, 0.74, 0.8)),
      };
      for (const [cle, v] of Object.entries(valeurs)) el.style.setProperty(cle, String(Math.round(v * 1000) / 1000));
      setTexte(p >= SEUIL_TEXTE);
    };
    const auDefilement = () => { if (!attente) attente = requestAnimationFrame(calculer); };
    calculer();
    window.addEventListener('scroll', auDefilement, { passive: true });
    window.addEventListener('resize', auDefilement);
    return () => {
      window.removeEventListener('scroll', auDefilement);
      window.removeEventListener('resize', auDefilement);
      if (attente) cancelAnimationFrame(attente);
    };
  }, [simple]);

  return (
    <section ref={section} className={`${styles.hero} ${simple ? styles.simple : ''} ${texte || simple ? styles.revele : ''}`} aria-labelledby="titre-accueil">
      <div className={styles.scene}>
        {/* Étape 1 : habitacle, nettoyé de gauche à droite par la barre de lumière. */}
        <div className={styles.couche} aria-hidden="true">
          <img className={`${styles.photo} ${styles.interieur}`} src="/defilement/interieur-avant.jpg" alt="" fetchPriority="high" />
          <img className={`${styles.photo} ${styles.interieur} ${styles.net}`} src="/defilement/interieur-apres.jpg" alt=""
            style={{ clipPath: 'inset(0 calc(100% - var(--interieur, 0) * 1%) 0 0)' } as CSSProperties} />
          <span className={styles.barre} style={{ left: 'calc(var(--interieur, 0) * 1%)', opacity: 'calc(min(var(--interieur, 0), 100 - var(--interieur, 0)) / 4)' } as CSSProperties} />
        </div>
        {/* Étape 2 : le phare, qui arrive en se rapprochant puis se rénove. */}
        <div className={`${styles.couche} ${styles.phare}`} aria-hidden="true">
          <img className={styles.photo} src="/defilement/phare-avant.jpg" alt="" loading="lazy" />
          <img className={`${styles.photo} ${styles.net}`} src="/defilement/phare-apres.jpg" alt="" loading="lazy"
            style={{ clipPath: 'inset(0 calc(100% - var(--phare-net, 0) * 1%) 0 0)' } as CSSProperties} />
          <span className={styles.barre} style={{ left: 'calc(var(--phare-net, 0) * 1%)', opacity: 'calc(min(var(--phare-net, 0), 100 - var(--phare-net, 0)) / 4)' } as CSSProperties} />
        </div>
        <div className={styles.voile} aria-hidden="true" />

        <p className={styles.invite} aria-hidden="true">Faites défiler<br />pour nettoyer.</p>
        <p className={styles.detail} aria-hidden="true">Regardez<br />de plus près.</p>

        <div className={`container ${styles.contenu}`}>
          <p className={styles.surtitre}>{surtitre}</p>
          {/* Titre révélé mot par mot (lu normalement par les lecteurs d'écran). */}
          <h1 id="titre-accueil" className={styles.titre} aria-label={titre}>
            {titre.split(' ').map((mot, i) => (
              <Fragment key={`${i}-${mot}`}><span aria-hidden="true" className={styles.mot} style={{ '--i': i } as CSSProperties}>{mot}</span>{' '}</Fragment>
            ))}
          </h1>
          <p className={styles.phrase} style={{ '--d': '500ms' } as CSSProperties}>{introduction}</p>
          <div className={styles.boutons} style={{ '--d': '650ms' } as CSSProperties}>
            <Link to="/reserver" className="btn">Réserver un créneau</Link>
            {telephone && <a href={lienTel(telephone)} className={`btn ${styles.appeler}`} aria-label={`Appeler le ${telephone}`}><IconeTelephone /> {telephone}</a>}
          </div>
          {points.length > 0 && (
            <ul className={styles.points} style={{ '--d': '800ms' } as CSSProperties}>
              {points.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
