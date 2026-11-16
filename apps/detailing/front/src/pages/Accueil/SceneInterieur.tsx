import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { SCENE_INTERIEUR, cadrageCouvrant, etatScene, pointDuTrajet, trajetVitre } from '../../data/sceneInterieur';
import styles from './SceneInterieur.module.css';

const moinsDAnimations = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
const S = SCENE_INTERIEUR.moments.arret;

/**
 * L'intérieur, avant et après, piloté par le défilement (voir data/sceneInterieur.ts) :
 * entrée dans l'habitacle sale, arrêt et nettoyage au chiffon (souris ou doigt), puis sortie avec le véhicule propre.
 * Remonter rejoue le chemin à l'envers et resalit l'habitacle. Jouée pour tout le monde, pro connecté compris.
 * « Moins d'animations » : même scène, mais sans zoom (fondu enchaîné) et sans défilement automatique à la sortie.
 */
export function SceneInterieur() {
  const [douce] = useState(moinsDAnimations);
  const { titre, textes } = SCENE_INTERIEUR;
  return <SceneAnimee titre={titre} textes={textes} douce={douce} />;
}

function SceneAnimee({ titre, textes, douce }: { titre: string; textes: typeof SCENE_INTERIEUR.textes; douce: boolean }) {
  const { images, ecrans, origine, rayonChiffon, finNettoyageMs, sortieMs, chiffon, moments } = SCENE_INTERIEUR;
  const section = useRef<HTMLElement>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const masque = useRef<HTMLCanvasElement | null>(null);
  const imagePropre = useRef<HTMLImageElement | null>(null);
  const dernierPoint = useRef<{ x: number; y: number } | null>(null);
  const derniereAvance = useRef(0);
  // Arrêt dans l'habitacle (nettoyage en cours) et habitacle déjà nettoyé : en références pour les écouteurs, en état pour l'affichage.
  const arretRef = useRef(false);
  const nettoyeRef = useRef(false);
  const lectureRef = useRef(0);
  // Arrivée dans l'habitacle et dernier cran de molette : l'élan du défilement ne doit pas finir le nettoyage tout seul.
  const arriveeRef = useRef(0);
  const derniereMoletteRef = useRef(0);
  const [avance, setAvance] = useState(0);
  const [arret, setArret] = useState(false);
  // Chiffon qui finit tout seul (position dans le cadre, en %), visible pendant les allers-retours.
  const [chiffonAuto, setChiffonAuto] = useState<{ x: number; y: number } | null>(null);
  // Pendant l'arrêt, l'état du point d'arrêt (habitacle sale sous le chiffon), quel que soit l'arrondi du défilement.
  const etat = etatScene(arret ? S : avance);

  /** Position de la page où la scène s'arrête dans l'habitacle. */
  const positionArret = () => {
    const el = section.current!;
    return el.getBoundingClientRect().top + window.scrollY + S * (el.offsetHeight - window.innerHeight);
  };

  /** Redessine l'habitacle propre, seulement là où le chiffon est passé. */
  const dessiner = useCallback(() => {
    const c = toile.current;
    const m = masque.current;
    const img = imagePropre.current;
    const ctx = c?.getContext?.('2d');
    if (!c || !m || !ctx || !img?.complete || !img.naturalWidth) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, c.width, c.height);
    const r = cadrageCouvrant(img.naturalWidth, img.naturalHeight, c.width, c.height);
    ctx.drawImage(img, r.x, r.y, r.largeur, r.hauteur);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(m, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  /** Efface le nettoyage : l'habitacle redevient sale. */
  const salir = useCallback(() => {
    const m = masque.current;
    m?.getContext?.('2d')?.clearRect(0, 0, m.width, m.height);
    dessiner();
  }, [dessiner]);

  // Toile à la taille du cadre (écran haute définition compris), masque conservé au redimensionnement.
  useLayoutEffect(() => {
    const ajuster = () => {
      const c = toile.current;
      const zone = cadre.current;
      if (!c || !zone) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const largeur = Math.round(zone.clientWidth * ratio);
      const hauteur = Math.round(zone.clientHeight * ratio);
      if (c.width === largeur && c.height === hauteur) return;
      const nouveau = document.createElement('canvas');
      nouveau.width = largeur;
      nouveau.height = hauteur;
      const ancien = masque.current;
      if (ancien && ancien.width) nouveau.getContext?.('2d')?.drawImage(ancien, 0, 0, largeur, hauteur);
      masque.current = nouveau;
      c.width = largeur;
      c.height = hauteur;
      dessiner();
    };
    const img = new Image();
    img.src = images.habitaclePropre.src;
    img.onload = dessiner;
    imagePropre.current = img;
    ajuster();
    window.addEventListener('resize', ajuster);
    return () => window.removeEventListener('resize', ajuster);
  }, [dessiner, images.habitaclePropre.src]);

  /** Passe le chiffon d'un point à un autre sur le masque (cercles doux, sans trou entre deux positions). */
  const passerChiffon = useCallback((depuis: { x: number; y: number }, vers: { x: number; y: number }) => {
    const m = masque.current;
    const ctx = m?.getContext?.('2d');
    if (!m || !ctx) return;
    const r = Math.min(m.width, m.height) * rayonChiffon;
    const etapes = Math.max(1, Math.ceil(Math.hypot(vers.x - depuis.x, vers.y - depuis.y) / (r / 3)));
    for (let i = 1; i <= etapes; i++) {
      const px = depuis.x + ((vers.x - depuis.x) * i) / etapes;
      const py = depuis.y + ((vers.y - depuis.y) * i) / etapes;
      const degrade = ctx.createRadialGradient(px, py, r * 0.35, px, py, r);
      degrade.addColorStop(0, 'rgba(0,0,0,1)');
      degrade.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = degrade;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [rayonChiffon]);

  const arreterLecture = () => {
    if (lectureRef.current) cancelAnimationFrame(lectureRef.current);
    lectureRef.current = 0;
  };

  /** Sortie jouée toute seule après le nettoyage : la page défile jusqu'à la fin de la scène. Le moindre geste l'arrête. */
  const jouerSortie = useCallback(() => {
    const el = section.current;
    if (!el) return;
    const depart = window.scrollY;
    const arrivee = el.getBoundingClientRect().top + window.scrollY + moments.sortie[1] * (el.offsetHeight - window.innerHeight);
    let debut = 0;
    const pas = (t: number) => {
      debut ||= t;
      const k = Math.min(1, (t - debut) / sortieMs);
      const doux = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      window.scrollTo(0, depart + (arrivee - depart) * doux);
      lectureRef.current = k < 1 ? requestAnimationFrame(pas) : 0;
    };
    lectureRef.current = requestAnimationFrame(pas);
  }, [moments.sortie, sortieMs]);

  /**
   * Finit de nettoyer comme on lave une vitre : le chiffon fait des allers-retours de gauche à droite, du haut vers le bas,
   * en ne touchant que ce qui reste sale (ce qui est déjà propre le reste). Puis on repart : sortie avec le véhicule propre.
   */
  const finir = useCallback(() => {
    if (!arretRef.current) return;
    arretRef.current = false;
    const m = masque.current;
    const ctx = m?.getContext?.('2d');
    const conclure = () => {
      setChiffonAuto(null);
      nettoyeRef.current = true;
      setArret(false);
      if (!douce) jouerSortie();
    };
    if (!m || !ctx) { conclure(); return; }
    const trajet = trajetVitre(m.width, m.height, Math.min(m.width, m.height) * rayonChiffon);
    let debut = 0;
    let precedent = trajet[0];
    const pas = (t: number) => {
      debut ||= t;
      const k = Math.min(1, (t - debut) / finNettoyageMs);
      const point = pointDuTrajet(trajet, k);
      passerChiffon(precedent, point);
      precedent = point;
      setChiffonAuto({ x: (point.x / m.width) * 100, y: (point.y / m.height) * 100 });
      if (k < 1) { dessiner(); requestAnimationFrame(pas); return; }
      // Derniers recoins (bords) : tout est propre.
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, m.width, m.height);
      dessiner();
      conclure();
    };
    requestAnimationFrame(pas);
  }, [dessiner, douce, finNettoyageMs, jouerSortie, passerChiffon, rayonChiffon]);

  // Défilement : avancement de la scène, arrêt dans l'habitacle, et habitacle resali quand on remonte.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let attente = 0;
    const calculer = () => {
      attente = 0;
      const hauteur = el.offsetHeight - window.innerHeight;
      const p = hauteur > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / hauteur)) : 0;
      const avant = derniereAvance.current;
      if (arretRef.current) {
        // Pendant l'arrêt, on ne descend pas plus loin ; remonter (barre de défilement) libère la scène.
        if (p > S + 0.001) { window.scrollTo(0, positionArret()); return; }
        if (p < S - 0.01) { arretRef.current = false; setArret(false); }
      } else if (!nettoyeRef.current && avant < S && p >= S) {
        // On arrive dans l'habitacle en descendant : arrêt pour le nettoyage.
        arretRef.current = true;
        arriveeRef.current = performance.now();
        setArret(true);
        window.scrollTo(0, positionArret());
        derniereAvance.current = S;
        el.style.setProperty('--avance', String(S));
        setAvance(S);
        return;
      }
      if (p < S - 0.01 && nettoyeRef.current) {
        // On remonte avant l'habitacle : il se resalit, le prochain passage s'arrêtera de nouveau.
        nettoyeRef.current = false;
        salir();
      }
      if (!arretRef.current && !nettoyeRef.current && p > S) nettoyeRef.current = true; // arrivé plus loin d'un coup (lien, saut)
      derniereAvance.current = p;
      el.style.setProperty('--avance', String(Math.round(p * 1000) / 1000));
      setAvance(p);
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
  }, [salir]);

  // Pendant l'arrêt : molette ou touches vers le bas finissent le nettoyage ; vers le haut, on repart en arrière.
  // Pendant la sortie jouée toute seule : le moindre geste rend la main.
  useEffect(() => {
    const surMolette = (e: WheelEvent) => {
      if (lectureRef.current) { arreterLecture(); return; }
      if (!arretRef.current) return;
      if (e.deltaY <= 0) { arretRef.current = false; setArret(false); return; }
      e.preventDefault();
      // Il faut un nouveau geste : les crans qui arrivent en rafale (élan de la molette ou du pavé tactile) sont ignorés.
      const maintenant = performance.now();
      const enRafale = maintenant - derniereMoletteRef.current < SCENE_INTERIEUR.pauseMoletteMs;
      derniereMoletteRef.current = maintenant;
      if (enRafale || maintenant - arriveeRef.current < SCENE_INTERIEUR.pauseMoletteMs * 2) return;
      finir();
    };
    const surTouche = (e: KeyboardEvent) => {
      if (lectureRef.current) arreterLecture();
      if (!arretRef.current) return;
      if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) { e.preventDefault(); finir(); }
      if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) { arretRef.current = false; setArret(false); }
    };
    // Au doigt, la page ne défile pas pendant le nettoyage (le doigt nettoie) ; le bouton permet de continuer.
    const surDoigt = (e: TouchEvent) => { if (arretRef.current) e.preventDefault(); else if (lectureRef.current) arreterLecture(); };
    window.addEventListener('wheel', surMolette, { passive: false });
    window.addEventListener('keydown', surTouche);
    window.addEventListener('touchmove', surDoigt, { passive: false });
    return () => {
      window.removeEventListener('wheel', surMolette);
      window.removeEventListener('keydown', surTouche);
      window.removeEventListener('touchmove', surDoigt);
      arreterLecture();
    };
  }, [finir]);

  /** Le chiffon passe sous la souris (ou le doigt) : seul ce qu'il touche devient propre. */
  const frotter = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!arretRef.current) return;
    const c = toile.current;
    const m = masque.current;
    if (!c || !m) return;
    const zone = c.getBoundingClientRect();
    const point = { x: ((e.clientX - zone.left) / zone.width) * m.width, y: ((e.clientY - zone.top) / zone.height) * m.height };
    passerChiffon(dernierPoint.current ?? point, point);
    dernierPoint.current = point;
    dessiner();
  };

  const habitacle = etat.propre ? images.habitaclePropre : images.habitacleSale;
  const porte = etat.propre ? images.portePropre : images.porteSale;
  const titreActif = arret ? 'arret' : etat.titre;
  const lignes = (texte: string) => texte.split('\n').map((ligne, j) => <Fragment key={j}>{j > 0 && <br />}{ligne}</Fragment>);
  const style = { '--ecrans': ecrans, '--origine': origine, '--chiffon': `url("${chiffon}") 24 24` } as CSSProperties;

  return (
    <section ref={section} className={styles.scene} style={style} aria-labelledby="titre-interieur">
      <div ref={cadre} className={`${styles.cadre} ${arret ? styles.enArret : ''}`}>
        <h2 id="titre-interieur" className={styles.srOnly}>{titre}</h2>
        <img className={styles.image} src={habitacle.src} alt={habitacle.alt}
          style={{ opacity: etat.habitacle.opacite, transform: douce ? undefined : `scale(${etat.habitacle.echelle})` }} />
        <canvas ref={toile} className={styles.toile} aria-hidden="true" hidden={etat.propre}
          style={{ opacity: etat.habitacle.opacite, transform: douce ? undefined : `scale(${etat.habitacle.echelle})`, pointerEvents: arret ? 'auto' : 'none' }}
          onPointerMove={frotter} onPointerLeave={() => { dernierPoint.current = null; }} />
        <img className={`${styles.image} ${styles.porte}`} src={porte.src} alt={etat.porte.opacite > 0.5 ? porte.alt : ''}
          style={{ opacity: etat.porte.opacite, transform: douce ? undefined : `scale(${etat.porte.echelle})` }} />

        {(['approche', 'arret', 'sortie'] as const).map((cle) => (
          <p key={cle} className={`${styles.titre} ${titreActif === cle ? styles.titreVisible : ''}`} aria-hidden="true">{lignes(textes[cle])}</p>
        ))}
        {chiffonAuto && (
          <img className={styles.chiffonAuto} src={chiffon} alt="" aria-hidden="true"
            style={{ left: `${chiffonAuto.x}%`, top: `${chiffonAuto.y}%` }} />
        )}
        {arret && !chiffonAuto && (
          <div className={styles.consigne}>
            <p role="status">{textes.aide}</p>
            <button type="button" className={styles.passer} onClick={finir}>{textes.continuer} <span aria-hidden="true">↓</span></button>
          </div>
        )}
        <div className={styles.progression} aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}
