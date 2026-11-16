import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { formatEuros } from '@bsandoz/ui';
import { IconeTelephone } from '../../components/Telephone/Telephone';
import { lienTel } from '../../components/Telephone/numeroTelephone';
import { CATEGORIES, estCombinee, prixMin, type Formule } from '../../data/demo';
import { HERO_VIDEO } from '../../data/heroVideo';
import styles from './HeroVideo.module.css';

const entre = (p: number, debut: number, fin: number) => Math.min(1, Math.max(0, (p - debut) / (fin - debut)));
const moinsDAnimations = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Haut de l'accueil façon « reel », piloté par le défilement : la scène reste à l'écran pendant qu'on fait défiler, la
 * vidéo avance (et recule) avec le défilement, de grands titres s'enchaînent par étape ; à la fin, le texte de l'accueil
 * arrive à gauche et le panneau « Réserver votre lavage » glisse à droite (sous le texte sur téléphone).
 * Réglages (vidéo, étapes) : data/heroVideo.ts. « Moins d'animations » ou mode modification : directement la fin, sans
 * section épinglée.
 */
export function HeroVideo({ surtitre, titre, introduction, points, telephone, formules, statique = false }: {
  surtitre: string; titre: string; introduction: string; points: string[]; telephone?: string; formules: Formule[]; statique?: boolean;
}) {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [fixe] = useState(moinsDAnimations);
  const [etape, setEtape] = useState(-1);
  const [final, setFinal] = useState(false);
  const simple = fixe || statique;

  useEffect(() => {
    const el = section.current;
    const v = video.current;
    if (!el || simple) return;
    let attente = 0;
    let cible = 0;
    let affichee = 0;
    // Le temps de la vidéo suit le défilement avec un léger amorti (pas d'à-coups sur les molettes crantées).
    const avancer = () => {
      attente = 0;
      const hauteur = el.offsetHeight - window.innerHeight;
      const p = hauteur > 0 ? entre(-el.getBoundingClientRect().top, 0, hauteur) : 1;
      setEtape(HERO_VIDEO.etapes.findIndex((e) => p >= e.de && p < e.a));
      setFinal(p >= HERO_VIDEO.final);
      el.style.setProperty('--avance', String(Math.round(p * 1000) / 1000));
      if (v && Number.isFinite(v.duration) && v.duration > 0) {
        cible = Math.min(p / HERO_VIDEO.final, 1) * (v.duration - 0.05);
        affichee += (cible - affichee) * 0.35;
        if (Math.abs(cible - affichee) < 0.01) affichee = cible;
        if (Math.abs(v.currentTime - affichee) > 0.005) v.currentTime = affichee;
        if (affichee !== cible) attente = requestAnimationFrame(avancer);
      }
    };
    const auDefilement = () => { if (!attente) attente = requestAnimationFrame(avancer); };
    v?.pause();
    v?.addEventListener('loadedmetadata', auDefilement);
    avancer();
    window.addEventListener('scroll', auDefilement, { passive: true });
    window.addEventListener('resize', auDefilement);
    return () => {
      v?.removeEventListener('loadedmetadata', auDefilement);
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

  const fin = final || simple;
  return (
    <section ref={section} className={`${styles.hero} ${simple ? styles.simple : ''} ${fin ? styles.final : ''}`}
      style={{ '--ecrans': HERO_VIDEO.ecrans } as CSSProperties} aria-labelledby="titre-accueil">
      <div className={styles.scene}>
        {simple
          ? <img className={styles.fond} src={HERO_VIDEO.fin} alt="" fetchPriority="high" />
          : <video ref={video} className={styles.fond} src={HERO_VIDEO.src} poster={HERO_VIDEO.debut} muted playsInline preload="auto" aria-hidden="true" tabIndex={-1} />}
        <div className={styles.voile} aria-hidden="true" />

        {!simple && HERO_VIDEO.etapes.map((e, i) => (
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
