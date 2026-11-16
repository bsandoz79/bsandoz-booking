import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { SCENE_INTERIEUR, imageCourante } from '../../data/sceneInterieur';
import styles from './SceneInterieur.module.css';

const moinsDAnimations = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * L'intérieur, avant et après : la section reste à l'écran pendant qu'on fait défiler, et les images glissent vers la gauche,
 * une par une, avec leur grand titre (même style que la scène du haut de l'accueil). Fine barre d'avancement en bas.
 * « Moins d'animations » ou mode modification (`statique`) : une simple rangée d'images à faire glisser, sans section épinglée.
 * Réglages (images, titres, longueur) : data/sceneInterieur.ts.
 */
export function SceneInterieur({ statique = false }: { statique?: boolean }) {
  const section = useRef<HTMLElement>(null);
  const [fixe] = useState(moinsDAnimations);
  const simple = fixe || statique;
  const [courante, setCourante] = useState(0);
  const { images, titre, ecrans } = SCENE_INTERIEUR;

  useEffect(() => {
    const el = section.current;
    if (!el || simple) return;
    let attente = 0;
    const calculer = () => {
      attente = 0;
      const hauteur = el.offsetHeight - window.innerHeight;
      const p = hauteur > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / hauteur)) : 0;
      el.style.setProperty('--avance', String(Math.round(p * 1000) / 1000));
      setCourante(imageCourante(p, images.length));
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
  }, [simple, images.length]);

  const lignes = (texte: string) => texte.split('\n').map((ligne, j) => <Fragment key={j}>{j > 0 && <br />}{ligne}</Fragment>);

  if (simple) {
    return (
      <section className={styles.rangee} aria-labelledby="titre-interieur">
        <h2 id="titre-interieur" className="container">{titre}</h2>
        <ul className={styles.liste}>
          {images.map((image) => (
            <li key={image.src} className={styles.carte}>
              <img src={image.src} alt={image.alt} loading="lazy" width={1920} height={1072} />
              <p className={styles.legende}>{lignes(image.texte)}</p>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section ref={section} className={styles.scene} style={{ '--ecrans': ecrans, '--nombre': images.length } as CSSProperties}
      aria-labelledby="titre-interieur">
      <div className={styles.cadre}>
        <h2 id="titre-interieur" className={styles.srOnly}>{titre}</h2>
        <ul className={styles.piste}>
          {images.map((image, i) => (
            <li key={image.src} className={styles.panneau}>
              <img src={image.src} alt={image.alt} loading="lazy" width={1920} height={1072} />
              <p className={`${styles.titre} ${courante === i ? styles.titreVisible : ''}`} aria-hidden="true">{lignes(image.texte)}</p>
            </li>
          ))}
        </ul>
        <div className={styles.progression} aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}
