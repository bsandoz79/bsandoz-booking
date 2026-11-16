import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { formatEuros } from '@bsandoz/ui';
import { IconeTelephone } from '../../components/Telephone/Telephone';
import { lienTel } from '../../components/Telephone/numeroTelephone';
import { CATEGORIES, estCombinee, prixMin, type Formule } from '../../data/demo';
import { HERO_SCENES } from '../../data/heroScenes';
import styles from './HeroScenes.module.css';

const entre = (p: number, [debut, fin]: readonly [number, number]) => Math.min(1, Math.max(0, (p - debut) / (fin - debut)));
const moinsDAnimations = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Haut de l'accueil façon « reel », piloté par le défilement : la scène reste à l'écran pendant qu'on fait défiler.
 * Voiture boueuse → la mousse coule de haut en bas → une barre de lumière rince de gauche à droite → on se rapproche →
 * porte du garage et lumière dorée ; de grands titres s'enchaînent ; à la fin, le texte de l'accueil arrive à gauche et
 * le panneau « Réserver votre lavage » à droite (sous le texte sur téléphone).
 * Réglages (images, moments, titres) : data/heroScenes.ts. « Moins d'animations » ou mode modification : directement la
 * fin, sans section épinglée.
 */
export function HeroScenes({ surtitre, titre, introduction, points, telephone, formules, statique = false }: {
  surtitre: string; titre: string; introduction: string; points: string[]; telephone?: string; formules: Formule[]; statique?: boolean;
}) {
  const section = useRef<HTMLElement>(null);
  const [fixe] = useState(moinsDAnimations);
  const [etape, setEtape] = useState(-1);
  const [final, setFinal] = useState(false);
  const simple = fixe || statique;

  useEffect(() => {
    const el = section.current;
    if (!el || simple) return;
    let attente = 0;
    const { moments } = HERO_SCENES;
    const calculer = () => {
      attente = 0;
      const hauteur = el.offsetHeight - window.innerHeight;
      const p = hauteur > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / hauteur)) : 1;
      const valeurs: Record<string, number> = {
        '--avance': p,
        '--depart': 1.06 - 0.06 * entre(p, [0, moments.mousse[1]]),
        '--mousse': entre(p, moments.mousse) * 100,
        '--rincage': entre(p, moments.rincage) * 100,
        '--zoom': 1 + 0.14 * entre(p, moments.zoom),
        '--garage': entre(p, moments.garage),
      };
      for (const [cle, v] of Object.entries(valeurs)) el.style.setProperty(cle, String(Math.round(v * 1000) / 1000));
      setEtape(HERO_SCENES.etapes.findIndex((e) => p >= e.de && p < e.a));
      setFinal(p >= HERO_SCENES.final);
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

  // Panneau « Réserver » : les catégories proposées, avec leur prix « à partir de ».
  const categories = CATEGORIES.map((c) => {
    const liste = formules.filter((f) => f.category === c.value);
    if (liste.length === 0) return null;
    const premiere = liste[0];
    const prix = Math.min(...liste.map((f) => prixMin(f, formules)));
    return { ...c, prix, lien: liste.length === 1 || estCombinee(premiere) ? `/reserver?formule=${encodeURIComponent(premiere.id)}` : '/reserver' };
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  const { images } = HERO_SCENES;
  const fin = final || simple;
  return (
    <section ref={section} className={`${styles.hero} ${simple ? styles.simple : ''} ${fin ? styles.final : ''}`}
      style={{ '--ecrans': HERO_SCENES.ecrans } as CSSProperties} aria-labelledby="titre-accueil">
      <div className={styles.scene}>
        <div className={styles.images} aria-hidden="true">
          {!simple && (
            <>
              <img className={`${styles.image} ${styles.boue}`} src={images.boue} alt="" fetchPriority="high" />
              <img className={`${styles.image} ${styles.mousse}`} src={images.mousse} alt="" />
              <div className={styles.propre}>
                <img className={styles.image} src={images.propre} alt="" />
              </div>
              <span className={styles.barre} />
            </>
          )}
          <img className={`${styles.image} ${styles.garage}`} src={images.garage} alt="" loading={simple ? 'eager' : 'lazy'} />
        </div>
        <div className={styles.voile} aria-hidden="true" />

        {!simple && HERO_SCENES.etapes.map((e, i) => (
          <p key={e.texte} className={`${styles.etape} ${etape === i ? styles.etapeVisible : ''}`} aria-hidden="true">
            {e.texte.split('\n').map((ligne, j) => <Fragment key={j}>{j > 0 && <br />}{ligne}</Fragment>)}
          </p>
        ))}
        {!simple && <div className={styles.progression} aria-hidden="true"><span /></div>}

        <div className={`container ${styles.fin}`}>
          <div className={styles.texte}>
            <p className={styles.surtitre}>{surtitre}</p>
            <h1 id="titre-accueil" className={styles.titre} aria-label={titre}>
              {titre.split(' ').map((mot, i) => (
                <Fragment key={`${i}-${mot}`}><span aria-hidden="true" className={styles.mot} style={{ '--i': i } as CSSProperties}>{mot}</span>{' '}</Fragment>
              ))}
            </h1>
            <p className={styles.phrase}>{introduction}</p>
            {points.length > 0 && <ul className={styles.points}>{points.map((a) => <li key={a}>{a}</li>)}</ul>}
          </div>

          <aside className={styles.panneau} aria-label="Réserver votre lavage">
            <p className={styles.panneauTitre}>Réserver votre lavage</p>
            <ul className={styles.choix}>
              {categories.map((c) => (
                <li key={c.value}>
                  <Link to={c.lien} className={styles.choixLien}>
                    <span>{c.label}</span>
                    <span className={styles.choixPrix}>dès {formatEuros(c.prix)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/reserver" className={`btn ${styles.reserver}`}>Choisir mon créneau</Link>
            {telephone && <a href={lienTel(telephone)} className={styles.appel} aria-label={`Appeler le ${telephone}`}><IconeTelephone /> {telephone}</a>}
          </aside>
        </div>
      </div>
    </section>
  );
}
