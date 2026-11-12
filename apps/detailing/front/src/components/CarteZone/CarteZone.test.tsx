import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cerclesZone, type ZonePublique } from '../../data/zone';
import { CarteZone } from './CarteZone';

// Leaflet remplacé par un objet qui accepte tous les appels en chaîne (la carte elle-même n'est pas testée ici).
vi.mock('leaflet', () => {
  const chaine: unknown = new Proxy(function () {}, { get: (_, nom) => (nom === 'then' ? undefined : chaine), apply: () => chaine });
  return { default: chaine, ...{ map: chaine, tileLayer: chaine, circle: chaine, tooltip: chaine, circleMarker: chaine, latLng: chaine, latLngBounds: chaine } };
});
vi.mock('leaflet/dist/leaflet.css', () => ({}));

const ZONE: ZonePublique = {
  surPlace: false, freeRadiusKm: 5, maxDistanceKm: 50, pricePerKmCents: 0, roadFactor: 1.3,
  paliers: [{ jusquaKm: 15, prixCents: 500 }, { jusquaKm: 30, prixCents: 1000 }, { jusquaKm: 50, prixCents: 2000 }],
};
const CENTRE = { lat: 50.1054, lng: 1.8357 };

describe('CarteZone', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('trace un cercle par tranche, rayon corrigé de la distance par la route', () => {
    expect(cerclesZone(ZONE)).toEqual([
      { km: 5, rayonM: 3846, fraisCents: 0 },
      { km: 15, rayonM: 11538, fraisCents: 500 },
      { km: 30, rayonM: 23077, fraisCents: 1000 },
      { km: 50, rayonM: 38462, fraisCents: 2000 },
    ]);
    expect(cerclesZone({ ...ZONE, surPlace: true })).toEqual([]);
  });

  it('calcule le déplacement à partir de l’adresse saisie', async () => {
    const estimer = vi.fn().mockResolvedValue({ distanceKm: 12.4, dansZone: true, fraisCents: 500 });
    const onEstimation = vi.fn();
    render(<CarteZone zone={ZONE} centre={CENTRE} ville="Abbeville" estimer={estimer} onEstimation={onEstimation}
      rechercherAdresse={async () => [{ label: '1 Rue du Port 80230 Saint-Valery-sur-Somme', lat: 50.18, lng: 1.63 }]} />);

    expect(screen.getByRole('region', { name: /Carte de la zone d’intervention autour de Abbeville : 5 km offert, 15 km 5\s€/ })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('combobox', { name: 'Votre adresse' }), '1 rue du port');
    await userEvent.click(await screen.findByRole('option', { name: /Saint-Valery/ }));

    expect(estimer).toHaveBeenCalledWith(50.18, 1.63);
    expect(await screen.findByRole('status')).toHaveTextContent('Vous êtes à environ 12 km de route de Abbeville : déplacement 5,00 €.');
    expect(onEstimation).toHaveBeenCalledWith({ distanceKm: 12.4, dansZone: true, fraisCents: 500 });
  });

  it('demande la position à l’arrivée sur la carte, et indique « sur devis » hors zone', async () => {
    let surVisible: (entrees: { isIntersecting: boolean }[]) => void = () => undefined;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: typeof surVisible) { surVisible = cb; }
      observe() {}
      disconnect() {}
    });
    const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 49.89, longitude: 2.29 } } as GeolocationPosition));
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const estimer = vi.fn().mockResolvedValue({ distanceKm: 62, dansZone: false, fraisCents: 0 });

    render(<CarteZone zone={ZONE} centre={CENTRE} ville="Abbeville" estimer={estimer} rechercherAdresse={async () => []} />);
    expect(getCurrentPosition).not.toHaveBeenCalled();

    act(() => surVisible([{ isIntersecting: true }]));
    await waitFor(() => expect(estimer).toHaveBeenCalledWith(49.89, 2.29));
    expect(await screen.findByRole('status')).toHaveTextContent('au-delà de 50 km : déplacement sur devis');
  });

  it('propose l’adresse quand la localisation est refusée', async () => {
    let surVisible: (entrees: { isIntersecting: boolean }[]) => void = () => undefined;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: typeof surVisible) { surVisible = cb; }
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: (_: unknown, ko: PositionErrorCallback) => ko({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError) } });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));

    render(<CarteZone zone={ZONE} centre={CENTRE} ville="Abbeville" estimer={vi.fn()} rechercherAdresse={async () => []} />);
    act(() => surVisible([{ isIntersecting: true }]));
    expect(await screen.findByText('Localisation refusée : indiquez votre adresse.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Utiliser ma position' })).toBeInTheDocument();
  });
});
