import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { navigation } from './useModeModification';

const carte = [{
  id: 'r1', nom: 'Les Sandwichs', note: 'Avec frites : + 1 €', icone: 'sandwich',
  articles: [
    { id: 'a1', categorieId: 'r1', nom: 'Kebab', description: 'Poulet-dinde', prixCents: 550, prixBarreCents: null, nouveau: false, epuise: false, visible: true, photo: 'https://api.example.test/medias/kebab.webp' },
    { id: 'a2', categorieId: 'r1', nom: 'Plat caché', description: '', prixCents: 400, prixBarreCents: null, nouveau: false, epuise: false, visible: false, photo: null },
  ],
}];

type Appel = { url: string; methode: string; corps: unknown };

/** Faux serveur : session encore ouverte (ou non), carte, infos du site ; garde la trace des appels. */
function fauxServeur(session = true) {
  const appels: Appel[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const methode = init.method ?? 'GET';
    appels.push({ url, methode, corps: typeof init.body === 'string' ? JSON.parse(init.body) : init.body });
    const json = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.endsWith('/auth/refresh')) return session ? json({ token: 'jeton-1', expiresIn: 900, roles: ['ROLE_PRO'] }) : json({ detail: 'Session expirée.' }, 401);
    if (url.endsWith('/carte')) return json(carte);
    if (url.endsWith('/site') && methode === 'GET') return json({ accroche: 'Le meilleur kebab.', annonce: '', avis: [{ auteur: 'Lea', note: 5, texte: 'Top' }] });
    return new Response(null, { status: 204 });
  }));
  return appels;
}

describe('Site de Croc’s en mode modification', () => {
  beforeEach(() => vi.stubEnv('VITE_API_URL', 'https://api.example.test'));
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); });

  it('sans mode modification, rien n’est entouré', async () => {
    fauxServeur();
    render(<App />);
    expect(await screen.findByText('Le meilleur kebab.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Mode modification' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Modifier/ })).not.toBeInTheDocument();
  });

  it('patron connecté : bandeau, plats et textes à toucher, plats cachés absents', async () => {
    fauxServeur();
    render(<App modifier />);
    expect(screen.getByRole('region', { name: 'Mode modification' })).toHaveTextContent('Vérification');
    expect(await screen.findByRole('button', { name: 'Modifier : Kebab' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Mode modification' })).toHaveTextContent('Touchez un élément entouré');
    expect(screen.queryByText('Plat caché')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier la phrase d’accueil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier les horaires' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter une annonce' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Changer les avis' })).toHaveAttribute('href', '/pro?onglet=avis');
    expect(screen.getByRole('link', { name: 'Terminer' })).toHaveAttribute('href', '/');
  });

  it('toucher un plat et changer son prix : envoyé en centimes, avec sa photo', async () => {
    const appels = fauxServeur();
    render(<App modifier />);
    await userEvent.click(await screen.findByRole('button', { name: 'Modifier : Kebab' }));
    const fiche = screen.getByRole('dialog', { name: 'Modifier le plat' });
    await userEvent.clear(within(fiche).getByLabelText(/Prix/));
    await userEvent.type(within(fiche).getByLabelText(/Prix/), '6');
    await userEvent.click(within(fiche).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(appels.find((a) => a.methode === 'PUT' && a.url.endsWith('/admin/carte/articles/a1'))?.corps)
      .toMatchObject({ prixCents: 600, nom: 'Kebab', photo: 'https://api.example.test/medias/kebab.webp' });
  });

  it('changer les horaires garde le reste des infos du site (avis…)', async () => {
    const appels = fauxServeur();
    render(<App modifier />);
    await userEvent.click(await screen.findByRole('button', { name: 'Modifier les horaires' }));
    const fenetre = screen.getByRole('dialog', { name: 'Horaires' });
    await userEvent.clear(within(fenetre).getByLabelText('Lundi'));
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const envoi = appels.find((a) => a.methode === 'PUT' && a.url.endsWith('/admin/site'))?.corps as { horaires: { jours: string; heures: string }[]; avis: unknown[]; accroche: string };
    expect(envoi.horaires[0]).toEqual({ jours: 'Lundi', heures: 'Fermé' });
    expect(envoi.horaires).toHaveLength(7);
    expect(envoi.avis).toHaveLength(1);
    expect(envoi.accroche).toBe('Le meilleur kebab.');
  });

  it('pas connecté : renvoyé vers l’espace pro pour se connecter', async () => {
    fauxServeur(false);
    const vers = vi.spyOn(navigation, 'versEspacePro').mockImplementation(() => {});
    render(<App modifier />);
    await waitFor(() => expect(vers).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Modifier : Kebab' })).not.toBeInTheDocument();
  });
});
