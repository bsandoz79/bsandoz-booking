import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { IconeTelephone } from '../../components/Telephone/Telephone';
import { lienTel } from '../../components/Telephone/numeroTelephone';
import { formatEuros } from '@bsandoz/ui';
import { CATEGORIES, estCombinee, prixMin, type Formule } from '../../data/demo';
import { HERO_SCENES } from '../../data/heroScenes';
import styles from './HeroScenes.module.css';

const entre = (p: number, [debut, fin]: readonly [number, number]) => Math.min(1, Math.max(0, (p - debut) / (fin - debut)));
const moinsDAnimations = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Haut de l'accueil façon « reel », piloté par le défilement : la scène reste à l'écran pendant qu'on fait défiler.
 * Voiture boueuse → la mousse coule de haut en bas → une barre de lumière rince de gauche à droite → on se rapproche →
 * porte du garage et lumière dorée ; de grands titres s'enchaînent ; à la fin, le texte de l'accueil et les boutons
 * arrivent en haut à gauche, pour laisser la voiture visible.
 * Réglages (images, moments, titres) : data/heroScenes.ts. « Moins d'animations » ou mode modification : directement la
 * fin, sans section épinglée.
 */
export function HeroScenes({ surtitre, titre, introduction, points, telephone, formules = [], statique = false }: {
  surtitre: string; titre: string; introduction: string; points: string[]; telephone?: string; formules?: Formule[]; statique?: boolean;
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
        '--mousse': entre(p, moments.mousse) * 100,
        '--rincage': entre(p, moments.rincage) * 100,
        '--garage': entre(p, moments.garage),
        '--recul': entre(p, moments.recul),
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

  // Lecture automatique à l'arrivée : la page défile toute seule à travers la scène (le défilement pilote tout, donc
  // remonter rejoue la scène à l'envers). Toujours depuis le haut de l'accueil, même après un rechargement (le
  // navigateur remettrait sinon la page là où on l'avait laissée) ; pas si on arrive par un lien vers une section (#…).
  // Le moindre geste du visiteur (doigt, molette, touche, clic) l'arrête et lui rend la main.
  useEffect(() => {
    const el = section.current;
    if (!el || simple || window.location.hash) return;
    const restauration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const debutScene = el.getBoundingClientRect().top + window.scrollY;
    const parcours = el.offsetHeight - window.innerHeight;
    if (parcours <= 0) return;
    const { lecture } = HERO_SCENES;
    let image = 0;
    let depart = 0;
    let arrete = false;
    const adoucir = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    const duree = lecture[lecture.length - 1][0];
    // Avancement voulu à un instant donné (en secondes) : un seul mouvement, adouci au départ et à l'arrivée, qui passe
    // par les points de passage sans s'arrêter.
    const avancement = (secondes: number) => {
      const s = adoucir(secondes / duree) * duree;
      for (let i = 1; i < lecture.length; i++) {
        const [t0, p0] = lecture[i - 1];
        const [t1, p1] = lecture[i];
        if (s <= t1) return p0 + (p1 - p0) * ((s - t0) / (t1 - t0));
      }
      return lecture[lecture.length - 1][1];
    };
    const arreter = () => {
      arrete = true;
      cancelAnimationFrame(image);
      for (const type of ['wheel', 'touchstart', 'keydown', 'mousedown'] as const) window.removeEventListener(type, arreter);
    };
    const pas = (maintenant: number) => {
      if (arrete) return;
      depart ||= maintenant;
      const s = (maintenant - depart) / 1000;
      window.scrollTo(0, debutScene + avancement(Math.min(s, duree)) * parcours);
      if (s < duree) image = requestAnimationFrame(pas); else arreter();
    };
    for (const type of ['wheel', 'touchstart', 'keydown', 'mousedown'] as const) window.addEventListener(type, arreter, { passive: true });
    // Petite attente : laisser la première image s'afficher avant de démarrer.
    const attente = window.setTimeout(() => { image = requestAnimationFrame(pas); }, HERO_SCENES.attenteMs);
    return () => { window.clearTimeout(attente); arreter(); window.history.scrollRestoration = restauration; };
  }, [simple]);

  // Panneau « Réserver » (grand écran) : une catégorie choisie, ses formules ; chacune mène directement au planning de
  // la réservation, formule déjà cochée.
  const categories = CATEGORIES.filter((c) => formules.some((f) => f.category === c.value));
  const [categorie, setCategorie] = useState<string>();
  const categorieActive = categorie ?? categories[0]?.value;
  const formulesCategorie = formules.filter((f) => f.category === categorieActive);
  const lien = (f: Formule) => `/reserver?formule=${encodeURIComponent(f.id)}${estCombinee(f) ? '' : '&etape=creneau'}`;

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

        <div className={styles.fin}>
          <div className={styles.texte}>
            <p className={styles.surtitre}>{surtitre}</p>
            <h1 id="titre-accueil" className={styles.titre} aria-label={titre}>
              {titre.split(' ').map((mot, i) => (
                <Fragment key={`${i}-${mot}`}><span aria-hidden="true" className={styles.mot} style={{ '--i': i } as CSSProperties}>{mot}</span>{' '}</Fragment>
              ))}
            </h1>
            <p className={styles.phrase}>{introduction}</p>
            <div className={styles.boutons}>
              <Link to="/reserver" className="btn">Réserver un créneau</Link>
              {telephone && <a href={lienTel(telephone)} className={`btn ${styles.appeler}`} aria-label={`Appeler le ${telephone}`}><IconeTelephone /> {telephone}</a>}
            </div>
            {points.length > 0 && <ul className={styles.points}>{points.map((a) => <li key={a}>{a}</li>)}</ul>}
          </div>
        </div>

        {categories.length > 0 && (
          <aside className={styles.panneau} aria-label="Réserver votre lavage">
            <p className={styles.panneauTitre}>Réserver votre lavage</p>
            <div className={styles.categories} role="group" aria-label="Catégorie">
              {categories.map((c) => (
                <button key={c.value} type="button" className={styles.categorie} aria-pressed={c.value === categorieActive} onClick={() => setCategorie(c.value)}>
                  {c.label.replace(/^Nettoyage /, '').replace(/^./, (l) => l.toUpperCase())}
                </button>
              ))}
            </div>
            <ul className={styles.formules}>
              {formulesCategorie.map((f) => (
                <li key={f.id}>
                  <Link to={lien(f)} className={styles.formule}>
                    <span>{f.name}</span>
                    <span className={styles.prix}>{estCombinee(f) ? 'dès ' : ''}{formatEuros(prixMin(f, formules))}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className={styles.panneauAide}>Choisissez une formule : vous arrivez directement au choix du créneau.</p>
          </aside>
        )}
      </div>
    </section>
  );
}
