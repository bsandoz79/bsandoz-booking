import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Defilant } from './Defilant';

const piste = () => screen.getByRole('region', { name: 'Avis' }).querySelector('ul')!;
/** Rang de l'élément tout à gauche (au-delà du dernier : copies du début, le temps du retour). */
const decalage = () => Number(piste().dataset.position);

function monter(nombre = 5, props: Partial<Parameters<typeof Defilant>[0]> = {}) {
  return render(
    <Defilant label="Avis" {...props}>
      {Array.from({ length: nombre }, (_, i) => <p key={i}>Avis {i + 1}</p>)}
    </Defilant>,
  );
}

/** Simule les réglages de l'appareil (largeur d'écran, animations réduites). */
function appareil({ grand = true, moinsDAnimations = false } = {}) {
  vi.stubGlobal('matchMedia', (requete: string) => ({
    matches: requete.includes('reduced-motion') ? moinsDAnimations : grand,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe('Defilant', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('avance d’un cran toutes les 3 secondes et boucle sur le début', () => {
    vi.useFakeTimers();
    monter();
    expect(decalage()).toBe(0);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(decalage()).toBe(1);
    act(() => { vi.advanceTimersByTime(3000 * 4); });
    expect(decalage()).toBe(5);
    // Sur les copies du début, puis retour invisible au vrai début.
    act(() => { vi.advanceTimersByTime(600); });
    expect(decalage()).toBe(0);
  });

  it('les copies de la boucle sont cachées aux lecteurs d’écran', () => {
    monter();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('se met en pause par le bouton, au survol, et reprend', () => {
    vi.useFakeTimers();
    monter();
    fireEvent.click(screen.getByRole('button', { name: 'Mettre en pause le défilement' }));
    act(() => { vi.advanceTimersByTime(9000); });
    expect(decalage()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre le défilement' }));
    fireEvent.mouseEnter(screen.getByRole('region', { name: 'Avis' }));
    act(() => { vi.advanceTimersByTime(9000); });
    expect(decalage()).toBe(0);
    fireEvent.mouseLeave(screen.getByRole('region', { name: 'Avis' }));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(decalage()).toBe(1);
  });

  it('suivant et précédent, y compris depuis le début', async () => {
    monter();
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(decalage()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Précédent' }));
    expect(decalage()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Précédent' }));
    await waitFor(() => expect(decalage()).toBe(4));
  });

  it('ne défile pas tout seul si l’appareil demande moins d’animations', () => {
    appareil({ moinsDAnimations: true });
    vi.useFakeTimers();
    monter();
    expect(screen.getByRole('button', { name: 'Reprendre le défilement' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(9000); });
    expect(decalage()).toBe(0);
  });

  it('un seul élément à la fois sur téléphone', () => {
    appareil({ grand: false });
    vi.useFakeTimers();
    monter(3);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(decalage()).toBe(1);
  });

  it('pas plus d’éléments que de places : simple liste, sans boutons', () => {
    monter(3);
    expect(screen.getByRole('list', { name: 'Avis' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
