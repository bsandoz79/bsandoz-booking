import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { formatEuros } from '../PriceSummary';
import styles from './Carte.module.css';

export interface ArticleCarte {
  id: string;
  nom: string;
  description?: string;
  /** Prix en centimes. */
  prixCents: number;
  /** Ancien prix en centimes, affiché barré (changement récent) ; null ou absent : rien. */
  prixBarreCents?: number | null;
  nouveau?: boolean;
  epuise?: boolean;
  /** Adresse de la photo, déjà complète. */
  photo?: string | null;
}

export interface RubriqueCarte {
  id: string;
  nom: string;
  /** Précision sous la rubrique (ex. un supplément). */
  note?: string;
  /** Pictogramme décoratif (adresse d'une image d'un seul ton, teintée par la couleur --bs-carte-trait). */
  pictogramme?: string;
  articles: ArticleCarte[];
}

export interface CarteLibelles {
  nouveau: string;
  epuise: string;
  ancienPrix: string;
  nouveauPrix: string;
  /** Pagination d'une carte ajustée trop longue. « {n} » et « {total} » sont remplacés. */
  pages: string;
  page: string;
  pagePrecedente: string;
  pageSuivante: string;
}

export interface CarteProps {
  rubriques: RubriqueCarte[];
  /** Titre de la carte, pour les lecteurs d'écran (et affiché si `titreVisible`). */
  titre: string;
  titreVisible?: boolean;
  /** Nom du sommaire (ex. « Aller à une rubrique ») : s'il est donné, les rubriques sont listées en liens en haut. */
  sommaire?: string;
  /** Carte serrée (4 colonnes sur grand écran) pour la voir en entier sans défiler ; le sommaire n'y est utile que sur téléphone. */
  compacte?: boolean;
  /**
   * Avec `compacte`, sur grand écran : la carte tient toujours dans la hauteur `--bs-carte-hauteur-max` (thème).
   * Trop longue, elle rapetisse (jusqu'à 80 %), puis se sépare en pages avec des boutons.
   */
  ajustee?: boolean;
  libelles?: Partial<CarteLibelles>;
}

const LIBELLES: CarteLibelles = {
  nouveau: 'Nouveau', epuise: 'Épuisé', ancienPrix: 'Ancien prix', nouveauPrix: 'Nouveau prix',
  pages: 'Pages de la carte', page: 'Page {n} sur {total}', pagePrecedente: 'Page précédente', pageSuivante: 'Page suivante',
};

/** Taille la plus petite d'une carte ajustée (au-delà, elle se sépare en pages) et pas de réduction. */
export const ECHELLE_MIN = 0.8;
const PAS = 0.05;
/** Largeur d'écran à partir de laquelle la carte compacte est en colonnes (voir le CSS). */
const GRAND_ECRAN = '(min-width: 1000px)';

/**
 * Sépare les rubriques en `pages` groupes qui se suivent, de poids proches (poids d'une rubrique : ses articles,
 * plus son titre et sa note). Une rubrique n'est jamais coupée.
 */
export function decouperCarte(rubriques: RubriqueCarte[], pages: number): RubriqueCarte[][] {
  const poids = rubriques.map((r) => r.articles.length + 2 + (r.note ? 1 : 0));
  const total = poids.reduce((a, b) => a + b, 0);
  const groupes: RubriqueCarte[][] = [[]];
  let cumul = 0;
  rubriques.forEach((r, i) => {
    const seuil = (total * groupes.length) / pages;
    // Nouvelle page si la moitié de la rubrique dépasserait la part de la page en cours.
    if (groupes.length < pages && groupes[groupes.length - 1].length > 0 && cumul + poids[i] / 2 > seuil) groupes.push([]);
    groupes[groupes.length - 1].push(r);
    cumul += poids[i];
  });
  return groupes;
}

const grandEcran = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(GRAND_ECRAN).matches;

/** Prix sans « ,00 » inutile, comme sur une carte : 5,50 € ; 6 €. */
export function prixCarte(cents: number): string {
  return formatEuros(cents).replace(/,00(?=\s?€)/, '').replace(/ | /g, ' ');
}

/**
 * Carte d'un commerce façon menu dessiné : pictogramme et titre souligné d'un trait ondulé par rubrique, articles avec nom, description et prix.
 * Prix changé : l'ancien barré à côté du nouveau. « Nouveau » et « Épuisé » en pastilles.
 * Couleurs, police et fond viennent du thème (variables --bs-carte-*), aucun texte métier en dur.
 */
export function Carte({ rubriques, titre, titreVisible = false, sommaire, compacte = false, ajustee = false, libelles }: CarteProps) {
  const l = { ...LIBELLES, ...libelles };
  const actif = compacte && ajustee;
  const [echelle, setEchelle] = useState(1);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);
  const [mesure, setMesure] = useState(0);
  const zone = useRef<HTMLDivElement>(null);
  const sonde = useRef<HTMLDivElement>(null);
  const navPages = useRef<HTMLElement>(null);

  // Nouvelle carte ou nouvelle taille d'écran : on repart de la taille normale, sur une seule page.
  useLayoutEffect(() => {
    setEchelle(1);
    setPages(1);
    setPage(0);
  }, [rubriques, mesure]);

  useEffect(() => {
    if (!actif) return;
    let attente: number | undefined;
    const changer = () => {
      window.clearTimeout(attente);
      attente = window.setTimeout(() => setMesure((m) => m + 1), 150);
    };
    window.addEventListener('resize', changer);
    return () => { window.clearTimeout(attente); window.removeEventListener('resize', changer); };
  }, [actif]);

  // Mesure : trop haute, la carte rapetisse d'un pas ; à la taille minimale, une page de plus.
  useLayoutEffect(() => {
    if (!actif || !grandEcran() || !zone.current || !sonde.current) return;
    const disponible = sonde.current.offsetHeight - (navPages.current?.offsetHeight ?? 0);
    if (disponible <= 0 || zone.current.offsetHeight <= disponible) return;
    if (echelle > ECHELLE_MIN + 0.001) setEchelle((e) => Math.max(ECHELLE_MIN, Math.round((e - PAS) * 100) / 100));
    else if (pages < rubriques.length) setPages((p) => p + 1);
  }, [actif, echelle, pages, page, rubriques, mesure]);

  const groupes = actif && pages > 1 ? decouperCarte(rubriques, pages) : [rubriques];
  const enCours = Math.min(page, groupes.length - 1);
  const affichees = groupes[enCours];
  const classes = [styles.carte, compacte ? styles.compacte : '', actif ? styles.ajustee : ''].filter(Boolean).join(' ');

  return (
    <section className={classes} aria-label={titre} style={actif ? ({ '--_echelle': echelle } as CSSProperties) : undefined}>
      {actif && <div ref={sonde} className={styles.sonde} aria-hidden="true" />}
      {titreVisible && <h2 className={styles.titre}>{titre}</h2>}
      {sommaire && (
        <nav aria-label={sommaire}>
          <ul className={styles.sommaire}>
            {rubriques.map((r) => (
              <li key={r.id}><a href={`#rubrique-${r.id}`}>{r.nom}</a></li>
            ))}
          </ul>
        </nav>
      )}
      <div ref={zone} className={styles.rubriques}>
        {affichees.map((r) => (
          <section key={r.id} id={`rubrique-${r.id}`} className={styles.rubrique} aria-labelledby={`rubrique-${r.id}-nom`}>
            <div className={styles.entete}>
              {r.pictogramme && (
                <span className={styles.picto} style={{ '--_picto': `url("${r.pictogramme}")` } as CSSProperties} aria-hidden="true" />
              )}
              <h3 id={`rubrique-${r.id}-nom`} className={styles.rubriqueNom}>{r.nom}</h3>
            </div>
            <ul className={styles.articles}>
              {r.articles.map((a) => (
                <li key={a.id} className={a.epuise ? `${styles.article} ${styles.epuise}` : styles.article}>
                  {a.photo && <img className={styles.photo} src={a.photo} alt="" loading="lazy" width="72" height="72" />}
                  <div className={styles.texte}>
                    <p className={styles.ligne}>
                      <span className={styles.nom}>{a.nom}</span>
                      {a.nouveau && !a.epuise && <span className={styles.pastilleNouveau}>{l.nouveau}</span>}
                      {a.epuise && <span className={styles.pastilleEpuise}>{l.epuise}</span>}
                      <span className={styles.points} aria-hidden="true" />
                      <span className={styles.prix}>
                        {a.prixBarreCents != null && a.prixBarreCents !== a.prixCents && (
                          <>
                            <s className={styles.ancien}><span className={styles.sr}>{l.ancienPrix} : </span>{prixCarte(a.prixBarreCents)}</s>{' '}
                            <span className={styles.sr}>{l.nouveauPrix} : </span>
                          </>
                        )}
                        {prixCarte(a.prixCents)}
                      </span>
                    </p>
                    {a.description && <p className={styles.description}>{a.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
            {r.note && <p className={styles.note}>{r.note}</p>}
          </section>
        ))}
      </div>
      {groupes.length > 1 && (
        <nav ref={navPages} className={styles.pages} aria-label={l.pages}>
          <button type="button" disabled={enCours === 0} onClick={() => setPage(enCours - 1)}>← {l.pagePrecedente}</button>
          <span aria-live="polite">{l.page.replace('{n}', String(enCours + 1)).replace('{total}', String(groupes.length))}</span>
          <button type="button" disabled={enCours === groupes.length - 1} onClick={() => setPage(enCours + 1)}>{l.pageSuivante} →</button>
        </nav>
      )}
    </section>
  );
}
