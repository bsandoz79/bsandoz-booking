import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { crocs } from './data/crocs';

describe('Site de Croc’s', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('montre le nom, appeler, l’itinéraire, les mentions légales et le créateur du site', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: crocs.nom })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Appeler/ })[0]).toHaveAttribute('href', crocs.telephoneLien);
    expect(screen.getAllByRole('link', { name: 'Itinéraire' })[0].getAttribute('href')).toContain('destination=49.887017,2.282462');
    expect(screen.queryByText(/Maquette proposée par/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mentions légales et données personnelles' })).toHaveAttribute('href', '/mentions-legales');
    expect(screen.getByRole('link', { name: /Site créé par Baptiste Sandoz/ })).toHaveAttribute('href', 'https://bsandoz.fr');
    expect(screen.getByRole('link', { name: 'Espace pro' })).toHaveAttribute('href', '/pro');
  });

  it('affiche la carte complète, en code', () => {
    render(<App />);
    const carte = screen.getByRole('region', { name: 'La carte de Croc’s' });
    expect(within(carte).getByRole('region', { name: 'Les Sandwichs' })).toHaveTextContent('Kebab');
    expect(within(carte).getByRole('region', { name: 'Les Assiettes' })).toHaveTextContent('10 €');
    expect(within(carte).getAllByRole('region').length).toBeGreaterThanOrEqual(10);
  });

  it('calcule le temps de trajet depuis la position du visiteur, sans l’envoyer', async () => {
    const fetchEspion = vi.fn();
    vi.stubGlobal('fetch', fetchEspion);
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 49.8906, longitude: 2.3075 } } as GeolocationPosition) },
    });
    render(<App />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Me localiser' }));
    expect(await screen.findByText(/de chez vous en voiture/)).toBeInTheDocument();
    expect(screen.getByText(/à vélo/)).toBeInTheDocument();
    expect(screen.getByText(/à pied/)).toBeInTheDocument();
    expect(fetchEspion).not.toHaveBeenCalled();
  });

  it('ou depuis une adresse tapée (Base Adresse Nationale)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ features: [{ geometry: { coordinates: [2.3075, 49.8906] }, properties: { label: 'Gare d’Amiens' } }] }))));
    render(<App />);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText('Votre adresse'), 'gare amiens');
    await u.click(screen.getByRole('button', { name: 'Calculer' }));
    expect(await screen.findByText(/Estimation depuis Gare d’Amiens/)).toBeInTheDocument();
  });

  it('cite les avis avec leur source', () => {
    render(<App />);
    const avis = screen.getByRole('region', { name: 'Ce qu’en disent les clients' });
    expect(within(avis).getAllByRole('listitem')).toHaveLength(3);
    expect(avis).toHaveTextContent('Restaurant Guru');
  });
  it('affiche la carte, les horaires et l’annonce modifiés par le patron (API)', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/carte')
      ? [{ id: 'x', nom: 'Les Wraps', note: '', icone: 'libanais', articles: [{ id: 'w', categorieId: 'x', nom: 'Wrap poulet', description: '', prixCents: 700, prixBarreCents: 650, nouveau: true, epuise: false, visible: true }] }]
      : { annonce: 'Fermé lundi 24', horaires: [{ jours: 'Tous les jours', heures: '11 h – 23 h' }] }))));
    render(<App />);
    expect(await screen.findByRole('status')).toHaveTextContent('Fermé lundi 24');
    const carte = screen.getByRole('region', { name: 'La carte de Croc’s' });
    expect(await within(carte).findByRole('region', { name: 'Les Wraps' })).toHaveTextContent('Ancien prix : 6,50 € Nouveau prix : 7 €');
    // « Tous les jours » enregistré d'un bloc : réparti sur les 7 jours.
    expect(screen.getAllByText('11 h – 23 h')).toHaveLength(7);
    expect(screen.queryByText(/à confirmer\./)).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it('affiche les avis et les photos mis par le patron ; plus de 3 avis : ils défilent', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    const avis = [1, 2, 3, 4].map((i) => ({ auteur: `Client ${i}`, note: 5, texte: `Avis ${i}`, source: 'Google' }));
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/carte')
      ? []
      : { avis, photos: [{ url: 'https://api.example.test/medias/a.jpg', description: 'La terrasse' }] }))));
    render(<App />);
    const zone = await screen.findByRole('region', { name: 'Avis des clients' });
    expect(zone).toHaveTextContent('Client 4 · sur Google');
    expect(within(zone).getByRole('button', { name: 'Mettre en pause le défilement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agrandir la photo : La terrasse' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /La salle aux murs rouges/ })).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it('agrandit une photo au clic, passe à la suivante et se ferme', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Agrandir la photo : La salle aux murs rouges' }));
    const visionneuse = screen.getByRole('dialog', { name: 'Photo agrandie' });
    expect(within(visionneuse).getByRole('img', { name: 'La salle aux murs rouges' })).toBeInTheDocument();
    await userEvent.click(within(visionneuse).getByRole('button', { name: 'Photo suivante' }));
    expect(within(visionneuse).getByRole('img', { name: 'Le comptoir et la carte au mur' })).toBeInTheDocument();
    await userEvent.click(within(visionneuse).getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('photos en galerie fixe : 6 vignettes, la dernière ouvre la suite', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    const photos = Array.from({ length: 8 }, (_, i) => ({ url: `/p${i + 1}.jpg`, description: `Photo ${i + 1}` }));
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/carte') ? [] : { photos }))));
    render(<App />);
    const galerie = await screen.findByRole('region', { name: 'Photos de Croc’s' });
    await waitFor(() => expect(within(galerie).getAllByRole('listitem')).toHaveLength(6));
    expect(within(galerie).queryByRole('button', { name: /Mettre en pause/ })).not.toBeInTheDocument();
    await userEvent.click(within(galerie).getByRole('button', { name: 'Voir les 8 photos, à partir de : Photo 6' }));
    expect(screen.getByRole('dialog', { name: 'Photo agrandie' })).toHaveTextContent('Photo 6 · 7 / 9');
    vi.unstubAllEnvs();
  });
});
