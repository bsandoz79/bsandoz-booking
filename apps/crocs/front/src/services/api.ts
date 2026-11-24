import type { ArticleSaisi, RubriqueEditable, RubriqueSaisie } from '@bsandoz/ui';

/**
 * Client de l'API de Croc's (kit bsandoz/core, contrat : docs/api.md). `VITE_API_URL` = adresse de l'API sans `/api/v1`
 * (ex. https://api.crocs.demo.bsandoz.fr). Vide : site autonome avec la carte intégrée, pas d'espace pro.
 */
const base = () => String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const avecApi = () => base() !== '';

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Jeton d'accès du patron, gardé en mémoire seulement (la session se renouvelle par cookie httpOnly). */
let jeton: string | null = null;

async function appel<T>(chemin: string, init: RequestInit = {}, authentifie = false, retente = true): Promise<T> {
  // Envoi de fichier (FormData) : le navigateur choisit lui-même le Content-Type (multipart).
  const headers: Record<string, string> = init.body instanceof FormData ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (authentifie && jeton) headers.Authorization = `Bearer ${jeton}`;
  const res = await fetch(`${base()}/api/v1${chemin}`, { credentials: 'include', ...init, headers });
  // Jeton expiré (15 min) : on renouvelle la session une fois, puis on rejoue l'appel.
  if (res.status === 401 && authentifie && retente && (await reprendreSession())) return appel(chemin, init, true, false);
  if (!res.ok) {
    const probleme = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(probleme?.detail ?? 'Une erreur est survenue. Merci de réessayer.', res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/* ── Session du patron ── */

const garderJeton = (r: { token: string; roles: string[] }) => {
  if (!r.roles.includes('ROLE_PRO')) throw new ApiError('Ce compte n’a pas accès à l’espace du commerce.', 403);
  jeton = r.token;
};

export async function connecter(email: string, motDePasse: string): Promise<void> {
  try {
    garderJeton(await appel<{ token: string; roles: string[] }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: motDePasse }) }));
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw new ApiError('E-mail ou mot de passe incorrect.', 401);
    throw e;
  }
}

/** Session encore ouverte (cookie de renouvellement) : true si le patron est reconnecté sans retaper son mot de passe. */
export async function reprendreSession(): Promise<boolean> {
  try {
    garderJeton(await appel<{ token: string; roles: string[] }>('/auth/refresh', { method: 'POST' }, false, false));
    return true;
  } catch {
    jeton = null;
    return false;
  }
}

export async function deconnecter(): Promise<void> {
  jeton = null;
  await appel('/auth/logout', { method: 'POST' }).catch(() => undefined);
}

/* ── Carte ── */

export interface RubriqueApi extends RubriqueEditable {
  articles: (RubriqueEditable['articles'][number] & { photo?: string | null })[];
}

export const lireCartePublique = () => appel<RubriqueApi[]>('/carte');
export const lireCartePro = () => appel<RubriqueApi[]>('/admin/carte', {}, true);

const envoyer = (chemin: string, methode: string, corps?: unknown) =>
  appel<unknown>(chemin, { method: methode, body: corps === undefined ? undefined : JSON.stringify(corps) }, true).then(() => undefined);

export const carteApi = {
  ajouterRubrique: (r: RubriqueSaisie) => envoyer('/admin/carte/rubriques', 'POST', r),
  modifierRubrique: (id: string, r: RubriqueSaisie) => envoyer(`/admin/carte/rubriques/${id}`, 'PATCH', { ...r, icone: r.icone ?? '' }),
  supprimerRubrique: (id: string) => envoyer(`/admin/carte/rubriques/${id}`, 'DELETE'),
  ordonnerRubriques: (ids: string[]) => envoyer('/admin/carte/rubriques-ordre', 'PUT', { ids }),
  ajouterArticle: (a: ArticleSaisi) => envoyer('/admin/carte/articles', 'POST', a),
  /** La photo d'un article n'est pas modifiable ici : on renvoie celle qu'il a déjà. */
  modifierArticle: (id: string, a: ArticleSaisi, photo: string | null) => envoyer(`/admin/carte/articles/${id}`, 'PUT', { ...a, photo }),
  epuiser: (id: string, epuise: boolean) => envoyer(`/admin/carte/articles/${id}/epuise`, 'PUT', { epuise }),
  supprimerArticle: (id: string) => envoyer(`/admin/carte/articles/${id}`, 'DELETE'),
  ordonnerArticles: (ids: string[]) => envoyer('/admin/carte/articles-ordre', 'PUT', { ids }),
};

/* ── Textes du site (accroche, horaires, annonce) ── */

export interface Horaire { jours: string; heures: string }
/** Avis d'un client, recopié par le patron tel qu'il a été écrit. */
export interface AvisSite {
  auteur: string;
  /** 1 à 5 étoiles. */
  note: number;
  texte: string;
  /** Quand il a été laissé (texte libre, ex. « mars 2026 »). */
  quand?: string;
  /** Où il a été publié (ex. Google), facultatif. */
  source?: string;
}
export interface PhotoSite {
  url: string;
  /** Ce que montre la photo (lu par les lecteurs d'écran). */
  description: string;
  /** Nom du fichier envoyé à l'API (pour le supprimer) ; absent pour les photos de départ. */
  nom?: string;
}
export interface ContenuSite {
  accroche?: string;
  horaires?: Horaire[];
  /** Message en haut du site (ex. fermeture exceptionnelle) ; vide : rien. */
  annonce?: string;
  /** Avis mis par le patron ; absent : ceux du site. */
  avis?: AvisSite[];
  /** Le patron a laissé un avis Google au créateur du site : la demande ne s'affiche plus dans son espace. */
  avisCreateurLaisse?: boolean;
  /** Photos du bas de page mises par le patron ; absent : celles du site. */
  photos?: PhotoSite[];
}

export const lireContenu = () => appel<ContenuSite>('/site');
export const enregistrerContenu = (c: ContenuSite) => envoyer('/admin/site', 'PUT', c);

/* ── Photos ── */

/** Envoie une photo (JPEG, PNG ou WebP, 5 Mo au plus) ; renvoie son nom et son adresse. */
export function envoyerPhoto(photo: Blob, nomFichier: string): Promise<{ name: string; url: string }> {
  const corps = new FormData();
  corps.append('fichier', photo, nomFichier);
  return appel('/admin/medias', { method: 'POST', body: corps }, true);
}
export const supprimerPhoto = (nom: string) => envoyer(`/admin/medias/${encodeURIComponent(nom)}`, 'DELETE');
