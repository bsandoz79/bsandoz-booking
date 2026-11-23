import { useState, type CSSProperties, type FormEvent } from 'react';
import { Button } from '../Button';
import { Carte, prixCarte, type CarteProps, type RubriqueCarte } from '../Carte';
import { Dialog } from '../Dialog';
import { Field } from '../Field';
import { SortableList } from '../SortableList';
import { Toggle } from '../Toggle';
import styles from './EditeurCarte.module.css';

export interface ArticleEditable {
  id: string;
  categorieId: string;
  nom: string;
  description: string;
  prixCents: number;
  prixBarreCents?: number | null;
  nouveau?: boolean;
  epuise?: boolean;
  visible: boolean;
}

export interface RubriqueEditable {
  id: string;
  nom: string;
  note: string;
  /** Clé du pictogramme (voir `icones`), null : aucun. */
  icone: string | null;
  articles: ArticleEditable[];
}

/** Article saisi dans le formulaire (prix en centimes). */
export interface ArticleSaisi {
  categorieId: string;
  nom: string;
  description: string;
  prixCents: number;
  visible: boolean;
  /** Modification seulement : false = nouveau prix sans l'ancien barré (et un prix barré encore affiché est retiré). */
  barrerAncienPrix?: boolean;
}

export interface RubriqueSaisie {
  nom: string;
  note: string;
  icone: string | null;
}

/** Pictogramme proposé pour une rubrique : image d'un seul ton, teintée par la couleur du thème. */
export interface IconeCarte {
  cle: string;
  nom: string;
  url: string;
}

export interface EditeurCarteLibelles {
  ajouterArticle: string;
  modifierArticle: string;
  ajouterRubrique: string;
  modifierRubrique: string;
  nom: string;
  description: string;
  prix: string;
  prixAide: string;
  prixInvalide: string;
  barrer: string;
  /** « {prix} » est remplacé par l'ancien prix. */
  barrerAide: string;
  rubrique: string;
  note: string;
  noteAide: string;
  pictogramme: string;
  aucunPictogramme: string;
  visible: string;
  visibleAide: string;
  epuise: string;
  epuiseAide: string;
  /** Fenêtre d'un plat (carte modifiable) : bouton pour le marquer épuisé, ou de nouveau disponible. */
  marquerEpuise: string;
  marquerDisponible: string;
  cache: string;
  nouveau: string;
  enregistrer: string;
  annuler: string;
  supprimer: string;
  confirmerSuppression: string;
  monter: string;
  descendre: string;
  deplacer: string;
  ordreArticles: string;
  vide: string;
  enregistrement: string;
  erreur: string;
}

export interface EditeurCarteProps {
  rubriques: RubriqueEditable[];
  icones?: IconeCarte[];
  onAjouterRubrique: (r: RubriqueSaisie) => Promise<void>;
  onModifierRubrique: (id: string, r: RubriqueSaisie) => Promise<void>;
  onSupprimerRubrique: (id: string) => Promise<void>;
  onOrdonnerRubriques: (ids: string[]) => Promise<void>;
  onAjouterArticle: (a: ArticleSaisi) => Promise<void>;
  onModifierArticle: (id: string, a: ArticleSaisi) => Promise<void>;
  onEpuiser: (id: string, epuise: boolean) => Promise<void>;
  onSupprimerArticle: (id: string) => Promise<void>;
  onOrdonnerArticles: (ids: string[]) => Promise<void>;
  libelles?: Partial<EditeurCarteLibelles>;
}

const LIBELLES: EditeurCarteLibelles = {
  ajouterArticle: 'Ajouter un article',
  modifierArticle: 'Modifier l’article',
  ajouterRubrique: 'Ajouter une rubrique',
  modifierRubrique: 'Modifier la rubrique',
  nom: 'Nom',
  description: 'Description (facultative)',
  prix: 'Prix (€)',
  prixAide: 'Par exemple 7,50.',
  prixInvalide: 'Indiquez un prix, par exemple 7,50.',
  barrer: 'Afficher l’ancien prix barré',
  barrerAide: '{prix} barré à côté du nouveau prix, pendant un mois. Désactivez pour changer le prix sans le montrer.',
  rubrique: 'Rubrique',
  note: 'Note sous la rubrique (facultative)',
  noteAide: 'Par exemple : Avec frites : + 1 €',
  pictogramme: 'Dessin',
  aucunPictogramme: 'Aucun',
  visible: 'Affiché sur la carte',
  visibleAide: 'Désactivez pour le cacher sans le supprimer.',
  epuise: 'Épuisé',
  epuiseAide: 'Épuisé jusqu’à ce soir minuit',
  marquerEpuise: 'Épuisé jusqu’à ce soir',
  marquerDisponible: 'De nouveau disponible',
  cache: 'Caché',
  nouveau: 'Nouveau',
  enregistrer: 'Enregistrer',
  annuler: 'Annuler',
  supprimer: 'Supprimer',
  confirmerSuppression: 'Toucher encore pour confirmer',
  monter: 'Monter',
  descendre: 'Descendre',
  deplacer: 'Déplacer',
  ordreArticles: 'Ordre des articles de la rubrique',
  vide: 'Aucun article dans cette rubrique.',
  enregistrement: 'Enregistrement…',
  erreur: 'L’enregistrement n’a pas abouti. Réessayez.',
};

/** « 7,50 », « 7.5 », « 7 € » → 750 ; texte illisible ou négatif → null. */
export function lirePrix(texte: string): number | null {
  const propre = texte.replace(/\s|€/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(propre)) return null;
  return Math.round(Number(propre) * 100);
}

/** 750 → « 7,50 » (pour remplir le champ prix). */
const ecrirePrix = (cents: number) => (cents / 100).toFixed(2).replace('.', ',').replace(/,00$/, '');

type Fenetre =
  | { type: 'article'; article?: ArticleEditable; categorieId: string }
  | { type: 'rubrique'; rubrique?: RubriqueEditable };

/**
 * Espace pro : la carte d'un commerce, modifiable au téléphone.
 * Un article : toucher pour le modifier (nom, description, prix, rubrique, affiché ou caché), « Épuisé » en une touche,
 * ordre par glisser (ou flèches au clavier). Rubriques : nom, note, pictogramme, ordre, suppression (vide seulement).
 * Le bloc n'appelle aucune API : chaque action passe par une fonction donnée, qui lève une erreur en cas d'échec.
 */
export function EditeurCarte({
  rubriques, icones = [], onAjouterRubrique, onModifierRubrique, onSupprimerRubrique, onOrdonnerRubriques,
  onAjouterArticle, onModifierArticle, onEpuiser, onSupprimerArticle, onOrdonnerArticles, libelles,
}: EditeurCarteProps) {
  const l = { ...LIBELLES, ...libelles };
  const [fenetre, setFenetre] = useState<Fenetre>();
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState<string>();
  const urlIcone = (cle: string | null) => icones.find((i) => i.cle === cle)?.url;

  /** Lance une action, garde le bouton occupé et affiche le message d'erreur reçu. */
  const agir = async (cle: string, action: () => Promise<void>): Promise<boolean> => {
    setEnCours(cle);
    setErreur('');
    try {
      await action();
      return true;
    } catch (e) {
      setErreur(e instanceof Error && e.message ? e.message : l.erreur);
      return false;
    } finally {
      setEnCours(undefined);
    }
  };

  const deplacerRubrique = (index: number, sens: -1 | 1) => {
    const ids = rubriques.map((r) => r.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + sens, 0, id);
    void agir(`ordre-${id}`, () => onOrdonnerRubriques(ids));
  };

  return (
    <div className={styles.editeur}>
      {erreur && !fenetre && <p className={styles.erreur} role="alert">{erreur}</p>}

      {rubriques.map((r, index) => (
        <section key={r.id} className={styles.rubrique} aria-labelledby={`edition-${r.id}`}>
          <div className={styles.enteteRubrique}>
            {urlIcone(r.icone) && (
              <span className={styles.picto} style={{ '--_picto': `url("${urlIcone(r.icone)}")` } as CSSProperties} aria-hidden="true" />
            )}
            <div className={styles.titreRubrique}>
              <h3 id={`edition-${r.id}`}>{r.nom}</h3>
              {r.note && <p className={styles.note}>{r.note}</p>}
            </div>
            <div className={styles.actionsRubrique}>
              <button type="button" className={styles.icone} aria-label={`${l.monter} : ${r.nom}`} disabled={index === 0 || !!enCours} onClick={() => deplacerRubrique(index, -1)}>↑</button>
              <button type="button" className={styles.icone} aria-label={`${l.descendre} : ${r.nom}`} disabled={index === rubriques.length - 1 || !!enCours} onClick={() => deplacerRubrique(index, 1)}>↓</button>
              <Button variant="secondary" onClick={() => setFenetre({ type: 'rubrique', rubrique: r })} aria-label={`${l.modifierRubrique} : ${r.nom}`}>✎</Button>
            </div>
          </div>

          {r.articles.length === 0 ? (
            <p className={styles.vide}>{l.vide}</p>
          ) : (
            <SortableList
              items={r.articles}
              getKey={(a) => a.id}
              label={`${l.ordreArticles} ${r.nom}`}
              handleLabel={(a) => `${l.deplacer} ${a.nom}`}
              getItemLabel={(a) => a.nom}
              onReorder={(ids) => void agir(`ordre-${r.id}`, () => onOrdonnerArticles(ids))}
              renderItem={(a) => (
                <div className={a.visible ? styles.article : `${styles.article} ${styles.cache}`}>
                  <button type="button" className={styles.ouvrir} onClick={() => setFenetre({ type: 'article', article: a, categorieId: r.id })}>
                    <span className={styles.nom}>
                      {a.nom}
                      {!a.visible && <span className={styles.pastille}>{l.cache}</span>}
                      {a.nouveau && a.visible && <span className={`${styles.pastille} ${styles.pastilleNouveau}`}>{l.nouveau}</span>}
                    </span>
                    {a.description && <span className={styles.description}>{a.description}</span>}
                    <span className={styles.prix}>
                      {a.prixBarreCents != null && a.prixBarreCents !== a.prixCents && <s>{prixCarte(a.prixBarreCents)}</s>} {prixCarte(a.prixCents)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={a.epuise ? `${styles.epuise} ${styles.epuiseActif}` : styles.epuise}
                    aria-pressed={!!a.epuise}
                    aria-label={`${l.epuise} : ${a.nom}`}
                    title={l.epuiseAide}
                    disabled={enCours === `epuise-${a.id}`}
                    onClick={() => void agir(`epuise-${a.id}`, () => onEpuiser(a.id, !a.epuise))}
                  >
                    {l.epuise}
                  </button>
                </div>
              )}
            />
          )}

          <Button variant="ghost" onClick={() => setFenetre({ type: 'article', categorieId: r.id })}>+ {l.ajouterArticle}</Button>
        </section>
      ))}

      <Button variant="secondary" fullWidth onClick={() => setFenetre({ type: 'rubrique' })}>+ {l.ajouterRubrique}</Button>

      {fenetre?.type === 'article' && (
        <FenetreArticle
          key={fenetre.article?.id ?? `nouveau-${fenetre.categorieId}`}
          l={l}
          rubriques={rubriques}
          article={fenetre.article}
          categorieId={fenetre.categorieId}
          erreur={erreur}
          enCours={enCours === 'fenetre'}
          onFermer={() => { setFenetre(undefined); setErreur(''); }}
          onEnregistrer={async (saisie) => {
            const article = fenetre.article;
            if (await agir('fenetre', () => (article ? onModifierArticle(article.id, saisie) : onAjouterArticle(saisie)))) setFenetre(undefined);
          }}
          onSupprimer={fenetre.article ? async () => {
            const id = fenetre.article!.id;
            if (await agir('fenetre', () => onSupprimerArticle(id))) setFenetre(undefined);
          } : undefined}
        />
      )}

      {fenetre?.type === 'rubrique' && (
        <FenetreRubrique
          key={fenetre.rubrique?.id ?? 'nouvelle'}
          l={l}
          icones={icones}
          rubrique={fenetre.rubrique}
          erreur={erreur}
          enCours={enCours === 'fenetre'}
          onFermer={() => { setFenetre(undefined); setErreur(''); }}
          onEnregistrer={async (saisie) => {
            const rubrique = fenetre.rubrique;
            if (await agir('fenetre', () => (rubrique ? onModifierRubrique(rubrique.id, saisie) : onAjouterRubrique(saisie)))) setFenetre(undefined);
          }}
          onSupprimer={fenetre.rubrique ? async () => {
            const id = fenetre.rubrique!.id;
            if (await agir('fenetre', () => onSupprimerRubrique(id))) setFenetre(undefined);
          } : undefined}
        />
      )}
    </div>
  );
}

interface FenetreCommune {
  l: EditeurCarteLibelles;
  erreur: string;
  enCours: boolean;
  onFermer: () => void;
  onSupprimer?: () => Promise<void>;
}

/** Bouton « Supprimer » en deux touches (pas de suppression par mégarde). */
function BoutonSupprimer({ l, onSupprimer, disabled }: { l: EditeurCarteLibelles; onSupprimer: () => Promise<void>; disabled: boolean }) {
  const [confirmer, setConfirmer] = useState(false);
  return (
    <Button variant="ghost" className={styles.supprimer} disabled={disabled} onClick={() => (confirmer ? void onSupprimer() : setConfirmer(true))}>
      {confirmer ? l.confirmerSuppression : l.supprimer}
    </Button>
  );
}

function FenetreArticle({ l, rubriques, article, categorieId, erreur, enCours, onFermer, onEnregistrer, onSupprimer, onEpuiser }: FenetreCommune & {
  rubriques: RubriqueEditable[];
  article?: ArticleEditable;
  categorieId: string;
  onEnregistrer: (a: ArticleSaisi) => Promise<void>;
  /** Donné : un bouton « Épuisé » dans la fenêtre (enregistré tout de suite, sans le reste du formulaire). */
  onEpuiser?: () => Promise<void>;
}) {
  const [nom, setNom] = useState(article?.nom ?? '');
  const [description, setDescription] = useState(article?.description ?? '');
  const [prix, setPrix] = useState(article ? ecrirePrix(article.prixCents) : '');
  const [rubrique, setRubrique] = useState(article?.categorieId ?? categorieId);
  const [visible, setVisible] = useState(article?.visible ?? true);
  const [prixFaux, setPrixFaux] = useState(false);
  const [barrer, setBarrer] = useState(true);

  // Choix proposé quand le prix change, ou quand un ancien prix est encore barré (pour pouvoir le retirer).
  const prixSaisi = lirePrix(prix);
  const ancienPrix = article && prixSaisi !== null && prixSaisi !== article.prixCents ? article.prixCents : article?.prixBarreCents ?? null;

  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    const prixCents = lirePrix(prix);
    setPrixFaux(prixCents === null);
    if (prixCents === null) return;
    const saisi: ArticleSaisi = { categorieId: rubrique, nom: nom.trim(), description: description.trim(), prixCents, visible };
    void onEnregistrer(article ? { ...saisi, barrerAncienPrix: ancienPrix === null || barrer } : saisi);
  };

  return (
    <Dialog open title={article ? l.modifierArticle : l.ajouterArticle} onClose={onFermer} closeLabel={l.annuler}>
      <form className={styles.formulaire} onSubmit={envoyer} noValidate>
        <Field label={l.nom} value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={80} />
        <Field label={l.prix} value={prix} onChange={(e) => setPrix(e.target.value)} inputMode="decimal" required hint={l.prixAide} error={prixFaux ? l.prixInvalide : undefined} />
        {ancienPrix !== null && (
          <Toggle label={l.barrer} hint={l.barrerAide.replace('{prix}', `${ecrirePrix(ancienPrix)} €`)} checked={barrer} onChange={setBarrer} />
        )}
        <Field label={l.description} value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={2} maxLength={300} />
        <div className={styles.choix}>
          <label htmlFor="editeur-rubrique">{l.rubrique}</label>
          <select id="editeur-rubrique" value={rubrique} onChange={(e) => setRubrique(e.target.value)}>
            {rubriques.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
        </div>
        <Toggle label={l.visible} hint={l.visibleAide} checked={visible} onChange={setVisible} />
        {article && onEpuiser && (
          <Button variant="secondary" disabled={enCours} onClick={() => void onEpuiser()}>
            {article.epuise ? l.marquerDisponible : l.marquerEpuise}
          </Button>
        )}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <div className={styles.boutons}>
          {onSupprimer && <BoutonSupprimer l={l} onSupprimer={onSupprimer} disabled={enCours} />}
          <Button type="submit" loading={enCours} loadingLabel={l.enregistrement}>{l.enregistrer}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function FenetreRubrique({ l, icones, rubrique, erreur, enCours, onFermer, onEnregistrer, onSupprimer }: FenetreCommune & {
  icones: IconeCarte[];
  rubrique?: RubriqueEditable;
  onEnregistrer: (r: RubriqueSaisie) => Promise<void>;
}) {
  const [nom, setNom] = useState(rubrique?.nom ?? '');
  const [note, setNote] = useState(rubrique?.note ?? '');
  const [icone, setIcone] = useState<string | null>(rubrique?.icone ?? null);

  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    void onEnregistrer({ nom: nom.trim(), note: note.trim(), icone });
  };

  return (
    <Dialog open title={rubrique ? l.modifierRubrique : l.ajouterRubrique} onClose={onFermer} closeLabel={l.annuler}>
      <form className={styles.formulaire} onSubmit={envoyer} noValidate>
        <Field label={l.nom} value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={60} />
        <Field label={l.note} hint={l.noteAide} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        {icones.length > 0 && (
          <fieldset className={styles.icones}>
            <legend>{l.pictogramme}</legend>
            <label className={styles.choixIcone}>
              <input type="radio" name="editeur-icone" checked={icone === null} onChange={() => setIcone(null)} />
              <span className={styles.aucun}>{l.aucunPictogramme}</span>
            </label>
            {icones.map((i) => (
              <label key={i.cle} className={styles.choixIcone}>
                <input type="radio" name="editeur-icone" checked={icone === i.cle} onChange={() => setIcone(i.cle)} aria-label={i.nom} />
                <span className={styles.picto} style={{ '--_picto': `url("${i.url}")` } as CSSProperties} aria-hidden="true" />
              </label>
            ))}
          </fieldset>
        )}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <div className={styles.boutons}>
          {onSupprimer && <BoutonSupprimer l={l} onSupprimer={onSupprimer} disabled={enCours} />}
          <Button type="submit" loading={enCours} loadingLabel={l.enregistrement}>{l.enregistrer}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export interface CarteModifiableProps
  extends Pick<EditeurCarteProps, 'rubriques' | 'icones' | 'onAjouterArticle' | 'onModifierArticle' | 'onEpuiser' | 'onSupprimerArticle' | 'onModifierRubrique'>,
    Pick<CarteProps, 'titre' | 'titreVisible' | 'sommaire' | 'compacte' | 'ajustee'> {
  /** Supprimer une rubrique (vide) : facultatif, l'espace pro le fait aussi. */
  onSupprimerRubrique?: (id: string) => Promise<void>;
  libelles?: Partial<EditeurCarteLibelles>;
  /** Libellés de la carte affichée (pastilles, pages, « Modifier »). */
  libellesCarte?: CarteProps['libelles'];
}

/**
 * La carte telle que les clients la voient, mais modifiable : chaque plat est entouré, un toucher ouvre sa fiche
 * (nom, prix et ancien prix barré, description, rubrique, affiché, épuisé, supprimer) ; le titre d'une rubrique ouvre la sienne ;
 * « + Ajouter » sous chaque rubrique. Les plats cachés n'y sont pas (ils restent dans l'espace pro).
 * Comme `EditeurCarte`, le bloc n'appelle aucune API : chaque action passe par une fonction donnée.
 */
export function CarteModifiable({
  rubriques, icones = [], onAjouterArticle, onModifierArticle, onEpuiser, onSupprimerArticle, onModifierRubrique, onSupprimerRubrique,
  libelles, libellesCarte, ...affichage
}: CarteModifiableProps) {
  const l = { ...LIBELLES, ...libelles };
  const [fenetre, setFenetre] = useState<Fenetre>();
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const fermer = () => { setFenetre(undefined); setErreur(''); };
  /** Lance l'action ; réussie, la fenêtre se ferme, sinon le message d'erreur reste affiché dedans. */
  const agir = async (action: () => Promise<void>) => {
    setEnCours(true);
    setErreur('');
    try {
      await action();
      setFenetre(undefined);
    } catch (e) {
      setErreur(e instanceof Error && e.message ? e.message : l.erreur);
    } finally {
      setEnCours(false);
    }
  };

  const affichees: RubriqueCarte[] = rubriques.map((r) => ({
    id: r.id,
    nom: r.nom,
    note: r.note || undefined,
    pictogramme: icones.find((i) => i.cle === r.icone)?.url,
    articles: r.articles.filter((a) => a.visible).map((a) => ({ ...a, description: a.description || undefined })),
  }));
  const article = (id: string) => rubriques.flatMap((r) => r.articles).find((a) => a.id === id);

  return (
    <>
      <Carte
        {...affichage}
        rubriques={affichees}
        libelles={libellesCarte}
        onToucherArticle={(id) => {
          const a = article(id);
          if (a) setFenetre({ type: 'article', article: a, categorieId: a.categorieId });
        }}
        onToucherRubrique={(id) => setFenetre({ type: 'rubrique', rubrique: rubriques.find((r) => r.id === id) })}
        onAjouterArticle={(rubriqueId) => setFenetre({ type: 'article', categorieId: rubriqueId })}
      />

      {fenetre?.type === 'article' && (
        <FenetreArticle
          key={fenetre.article?.id ?? `nouveau-${fenetre.categorieId}`}
          l={l}
          rubriques={rubriques}
          article={fenetre.article}
          categorieId={fenetre.categorieId}
          erreur={erreur}
          enCours={enCours}
          onFermer={fermer}
          onEnregistrer={(saisie) => {
            const a = fenetre.article;
            return agir(() => (a ? onModifierArticle(a.id, saisie) : onAjouterArticle(saisie)));
          }}
          onSupprimer={fenetre.article ? () => agir(() => onSupprimerArticle(fenetre.article!.id)) : undefined}
          onEpuiser={fenetre.article ? () => agir(() => onEpuiser(fenetre.article!.id, !fenetre.article!.epuise)) : undefined}
        />
      )}

      {fenetre?.type === 'rubrique' && fenetre.rubrique && (
        <FenetreRubrique
          key={fenetre.rubrique.id}
          l={l}
          icones={icones}
          rubrique={fenetre.rubrique}
          erreur={erreur}
          enCours={enCours}
          onFermer={fermer}
          onEnregistrer={(saisie) => agir(() => onModifierRubrique(fenetre.rubrique!.id, saisie))}
          onSupprimer={onSupprimerRubrique && fenetre.rubrique.articles.length === 0 ? () => agir(() => onSupprimerRubrique(fenetre.rubrique!.id)) : undefined}
        />
      )}
    </>
  );
}
