import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EspacePro } from './EspacePro';

const carte = [{
  id: 'r1', nom: 'Les Sandwichs', note: 'Avec frites : + 1 €', icone: 'sandwich',
  articles: [{ id: 'a1', categorieId: 'r1', nom: 'Kebab', description: 'Poulet-dinde', prixCents: 550, prixBarreCents: null, nouveau: false, epuise: false, visible: true, photo: null }],
}];

type Appel = { url: string; methode: string; corps: unknown; auth: string | undefined };

/** Faux serveur : répond selon l'adresse et garde la trace des appels. */
function fauxServeur(roles = ['ROLE_PRO'], site: Record<string, unknown> = { autre: 'gardé' }) {
  const appels: Appel[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const methode = init.method ?? 'GET';
    const headers = (init.headers ?? {}) as Record<string, string>;
    appels.push({ url, methode, corps: typeof init.body === 'string' ? JSON.parse(init.body) : init.body, auth: headers.Authorization });
    const json = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.endsWith('/auth/refresh')) return json({ detail: 'Session expirée.' }, 401);
    if (url.endsWith('/auth/login')) return json({ token: 'jeton-1', expiresIn: 900, roles });
    if (url.endsWith('/admin/carte')) return json(carte);
    if (url.endsWith('/site')) return json(site);
    if (url.endsWith('/admin/medias') && methode === 'POST') return json({ name: 'abc.jpg', url: 'https://api.example.test/medias/abc.jpg' }, 201);
    return new Response(null, { status: 204 });
  }));
  return appels;
}

async function seConnecter() {
  await userEvent.type(await screen.findByLabelText(/E-mail/), 'patron@example.test');
  await userEvent.type(screen.getByLabelText(/Mot de passe/), 'secret');
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
}

describe('Espace du patron', () => {
  beforeEach(() => vi.stubEnv('VITE_API_URL', 'https://api.example.test'));
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); localStorage.clear(); });

  it('onglet « Coûts » : ce que coûte le site en tableaux, et dans le temps', async () => {
    fauxServeur();
    render(<EspacePro />);
    await seConnecter();
    await userEvent.click(await screen.findByRole('tab', { name: 'Coûts' }));
    const aujourdhui = screen.getByRole('region', { name: 'Aujourd’hui' });
    expect(within(aujourdhui).getByRole('table')).toHaveTextContent('0 € par mois');
    expect(screen.getByRole('region', { name: 'Si vous le souhaitez' })).toHaveTextContent(/nom de domaine.*environ 10 à 15 €par an, à renouveler chaque année/);
    expect(screen.getByRole('region', { name: 'Dans le temps' })).toHaveTextContent('Première année');
    expect(screen.getByRole('region', { name: 'Le prix du site' })).toHaveTextContent(/étudiant.*participatif/);
    const liens = screen.getByRole('navigation', { name: 'Pour en savoir plus sur Baptiste Sandoz' });
    expect(within(liens).getByRole('link', { name: 'bsandoz.fr' })).toHaveAttribute('href', 'https://bsandoz.fr');
    expect(within(liens).getByRole('link', { name: 'portfolio.bsandoz.fr' })).toHaveAttribute('href', 'https://portfolio.bsandoz.fr');
  });

  it('propose de modifier directement sur le site, une fois connecté', async () => {
    fauxServeur();
    render(<EspacePro />);
    await seConnecter();
    expect(await screen.findByRole('link', { name: /Modifier directement sur le site/ })).toHaveAttribute('href', '/?modifier');
  });

  it('ouvre l’onglet demandé dans l’adresse (depuis le site : /pro?onglet=avis)', async () => {
    fauxServeur();
    window.history.pushState({}, '', '/pro?onglet=avis');
    render(<EspacePro />);
    await seConnecter();
    expect(await screen.findByRole('tab', { name: 'Avis' })).toHaveAttribute('aria-selected', 'true');
    window.history.pushState({}, '', '/');
  });

  it('se connecte, voit sa carte et met un plat « Épuisé » en une touche', async () => {
    const appels = fauxServeur();
    render(<EspacePro />);
    await seConnecter();
    const rubrique = await screen.findByRole('region', { name: 'Les Sandwichs' });
    await userEvent.click(within(rubrique).getByRole('button', { name: 'Épuisé : Kebab' }));
    const epuise = appels.find((a) => a.url.endsWith('/admin/carte/articles/a1/epuise'));
    expect(epuise).toMatchObject({ methode: 'PUT', corps: { epuise: true }, auth: 'Bearer jeton-1' });
    expect(epuise!.url).toBe('https://api.example.test/api/v1/admin/carte/articles/a1/epuise');
  });

  it('change un prix : envoyé en centimes, avec la photo existante', async () => {
    const appels = fauxServeur();
    render(<EspacePro />);
    await seConnecter();
    await userEvent.click(await screen.findByRole('button', { name: /^Kebab/ }));
    const fiche = screen.getByRole('dialog', { name: 'Modifier le plat' });
    await userEvent.clear(within(fiche).getByLabelText(/Prix/));
    await userEvent.type(within(fiche).getByLabelText(/Prix/), '6');
    await userEvent.click(within(fiche).getByRole('button', { name: 'Enregistrer' }));
    expect(appels.find((a) => a.methode === 'PUT' && a.url.endsWith('/admin/carte/articles/a1'))?.corps)
      .toEqual({ categorieId: 'r1', nom: 'Kebab', description: 'Poulet-dinde', prixCents: 600, visible: true, barrerAncienPrix: true, photo: null });
  });

  it('refuse un compte qui n’est pas celui du commerce', async () => {
    fauxServeur(['ROLE_CLIENT']);
    render(<EspacePro />);
    await seConnecter();
    expect(await screen.findByRole('alert')).toHaveTextContent('n’a pas accès');
  });

  it('modifie les horaires et l’annonce sans perdre le reste du contenu', async () => {
    const appels = fauxServeur();
    render(<EspacePro />);
    await seConnecter();
    await userEvent.click(await screen.findByRole('tab', { name: 'Infos du site' }));
    await userEvent.type(await screen.findByLabelText(/Annonce/), 'Fermé lundi 24');
    await userEvent.clear(screen.getByLabelText('Lundi'));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Enregistré');
    const envoi = appels.find((a) => a.methode === 'PUT' && a.url.endsWith('/admin/site'));
    const horaires = (envoi!.corps as { horaires: { jours: string; heures: string }[] }).horaires;
    expect(envoi?.corps).toMatchObject({ autre: 'gardé', annonce: 'Fermé lundi 24' });
    expect(horaires.map((h) => h.jours)).toEqual(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']);
    expect(horaires[0].heures).toBe('Fermé');
    expect(horaires[1].heures).toBe('11 h 30 – 14 h 30 · 18 h – 22 h 30');
  });

  it('ajoute un avis en tête, en gardant les avis déjà affichés et le reste du contenu', async () => {
    const appels = fauxServeur();
    render(<EspacePro />);
    await seConnecter();
    await userEvent.click(await screen.findByRole('tab', { name: 'Avis' }));
    await userEvent.click(await screen.findByRole('button', { name: '+ Ajouter un avis' }));
    const fiche = screen.getByRole('dialog', { name: 'Ajouter un avis' });
    await userEvent.type(within(fiche).getByLabelText(/Nom du client/), 'Karim');
    await userEvent.selectOptions(within(fiche).getByLabelText('Note'), '4');
    await userEvent.type(within(fiche).getByLabelText(/^Avis/), 'Toujours aussi bon');
    await userEvent.type(within(fiche).getByLabelText(/Publié sur/), 'Google');
    await userEvent.click(within(fiche).getByRole('button', { name: 'Enregistrer' }));
    const envoi = appels.find((a) => a.methode === 'PUT' && a.url.endsWith('/admin/site'));
    expect(envoi?.corps).toMatchObject({ autre: 'gardé' });
    const avis = (envoi!.corps as { avis: unknown[] }).avis;
    expect(avis).toHaveLength(4);
    expect(avis[0]).toEqual({ auteur: 'Karim', note: 4, texte: 'Toujours aussi bon', source: 'Google' });
    expect(await screen.findByText('« Toujours aussi bon »')).toBeInTheDocument();
  });

  it('retire un avis en deux touches', async () => {
    const appels = fauxServeur(['ROLE_PRO'], { avis: [{ auteur: 'Lea', note: 5, texte: 'Super' }, { auteur: 'Tom', note: 4, texte: 'Bien' }] });
    render(<EspacePro />);
    await seConnecter();
    await userEvent.click(await screen.findByRole('tab', { name: 'Avis' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Retirer l’avis de Lea' }));
    expect(appels.some((a) => a.methode === 'PUT')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer : retirer l’avis de Lea' }));
    const envoi = appels.find((a) => a.methode === 'PUT' && a.url.endsWith('/admin/site'));
    expect(envoi?.corps).toEqual({ avis: [{ auteur: 'Tom', note: 4, texte: 'Bien' }] });
  });

  it('ajoute une photo : envoyée au serveur, puis ajoutée au site avec sa description', async () => {
    const appels = fauxServeur();
    render(<EspacePro />);
    await seConnecter();
    await userEvent.click(await screen.findByRole('tab', { name: 'Photos' }));
    const fichier = new File(['photo'], 'salle.jpg', { type: 'image/jpeg' });
    await userEvent.upload(await screen.findByLabelText('+ Ajouter une photo'), fichier);
    const fiche = screen.getByRole('dialog', { name: 'Ajouter une photo' });
    await userEvent.click(within(fiche).getByRole('button', { name: 'Ajouter la photo' }));
    expect(within(fiche).getByRole('alert')).toHaveTextContent('Décrivez la photo');
    await userEvent.type(within(fiche).getByLabelText(/Que montre la photo/), 'La terrasse');
    await userEvent.click(within(fiche).getByRole('button', { name: 'Ajouter la photo' }));
    const envoiPhoto = appels.find((a) => a.methode === 'POST' && a.url.endsWith('/admin/medias'));
    expect(envoiPhoto?.auth).toBe('Bearer jeton-1');
    expect((envoiPhoto!.corps as FormData).get('fichier')).toBeInstanceOf(Blob);
    const envoi = appels.find((a) => a.methode === 'PUT' && a.url.endsWith('/admin/site'));
    expect((envoi!.corps as { photos: unknown[] }).photos).toEqual([
      { url: '/photos/salle.webp', description: 'La salle aux murs rouges' },
      { url: '/photos/comptoir.webp', description: 'Le comptoir et la carte au mur' },
      { url: 'https://api.example.test/medias/abc.jpg', nom: 'abc.jpg', description: 'La terrasse' },
    ]);
  });

  it('rouvert plus de 30 minutes après la dernière action : déconnecté, avec la raison', async () => {
    localStorage.setItem('crocs-pro-derniere-activite', String(Date.now() - 31 * 60 * 1000));
    const appels = fauxServeur();
    render(<EspacePro />);
    expect(await screen.findByRole('status')).toHaveTextContent('30 minutes sans activité');
    expect(screen.getByLabelText(/E-mail/)).toBeInTheDocument();
    expect(appels.some((a) => a.url.endsWith('/auth/refresh'))).toBe(false);
    expect(appels.some((a) => a.url.endsWith('/auth/logout'))).toBe(true);
  });

  it('déconnecte après 30 minutes sans activité pendant la session', async () => {
    const appels = fauxServeur();
    render(<EspacePro />);
    await seConnecter();
    await screen.findByRole('tab', { name: 'La carte' });
    localStorage.setItem('crocs-pro-derniere-activite', String(Date.now() - 31 * 60 * 1000));
    fireEvent(document, new Event('visibilitychange'));
    expect(await screen.findByText(/30 minutes sans activité/)).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(appels.some((a) => a.url.endsWith('/auth/logout'))).toBe(true);
  });

  it('propose de mettre l’espace sur le téléphone', async () => {
    fauxServeur();
    render(<EspacePro />);
    await seConnecter();
    const zone = await screen.findByRole('region', { name: 'Votre espace sur votre téléphone' });
    await userEvent.click(within(zone).getByRole('button', { name: 'Mettre sur mon téléphone' }));
    expect(within(zone).getByRole('status')).toHaveTextContent('Ajouter à l’écran d’accueil');
  });

  it('montre le contact en cas de problème, même avant de se connecter', async () => {
    fauxServeur();
    render(<EspacePro />);
    const urgence = await screen.findByRole('complementary', { name: 'Un problème avec le site ?' });
    expect(within(urgence).getByRole('link', { name: '07 69 28 78 37' })).toHaveAttribute('href', 'tel:+33769287837');
    expect(screen.getByLabelText(/E-mail/)).toBeInTheDocument();
  });
});
