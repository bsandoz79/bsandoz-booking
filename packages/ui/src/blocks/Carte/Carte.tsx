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
  articles: ArticleCarte[];
}

export interface CarteLibelles {
  nouveau: string;
  epuise: string;
  ancienPrix: string;
  nouveauPrix: string;
}

export interface CarteProps {
  rubriques: RubriqueCarte[];
  /** Titre de la carte, pour les lecteurs d'écran (et affiché si `titreVisible`). */
  titre: string;
  titreVisible?: boolean;
  /** Nom du sommaire (ex. « Aller à une rubrique ») : s'il est donné, les rubriques sont listées en liens en haut. */
  sommaire?: string;
  libelles?: Partial<CarteLibelles>;
}

const LIBELLES: CarteLibelles = { nouveau: 'Nouveau', epuise: 'Épuisé', ancienPrix: 'Ancien prix', nouveauPrix: 'Nouveau prix' };

/** Prix sans « ,00 » inutile, comme sur une carte : 5,50 € ; 6 €. */
export function prixCarte(cents: number): string {
  return formatEuros(cents).replace(/,00(?=\s?€)/, '').replace(/ | /g, ' ');
}

/**
 * Carte d'un commerce façon menu imprimé : rubriques aux titres surlignés, articles avec nom, description et prix.
 * Prix changé : l'ancien barré à côté du nouveau. « Nouveau » et « Épuisé » en pastilles.
 * Couleurs, police et fond viennent du thème (variables --bs-carte-*), aucun texte métier en dur.
 */
export function Carte({ rubriques, titre, titreVisible = false, sommaire, libelles }: CarteProps) {
  const l = { ...LIBELLES, ...libelles };
  return (
    <section className={styles.carte} aria-label={titre}>
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
      <div className={styles.rubriques}>
        {rubriques.map((r) => (
          <section key={r.id} id={`rubrique-${r.id}`} className={styles.rubrique} aria-labelledby={`rubrique-${r.id}-nom`}>
            <h3 id={`rubrique-${r.id}-nom`} className={styles.rubriqueNom}>{r.nom}</h3>
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
    </section>
  );
}
