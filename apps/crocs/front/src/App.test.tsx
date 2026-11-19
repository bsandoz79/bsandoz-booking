import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { crocs } from './data/crocs';

describe('Site de Croc’s', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('montre le nom, appeler et l’itinéraire, et se présente comme une maquette', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: crocs.nom })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Appeler/ })[0]).toHaveAttribute('href', crocs.telephoneLien);
    expect(screen.getAllByRole('link', { name: 'Itinéraire' })[0].getAttribute('href')).toContain('destination=49.887017,2.282462');
    expect(screen.getByText(/Maquette proposée par/)).toBeInTheDocument();
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
});
