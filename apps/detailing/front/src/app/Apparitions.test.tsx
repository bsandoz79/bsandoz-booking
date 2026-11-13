import { act, render, screen } from '@testing-library/react';
import { Apparitions } from './Apparitions';

/** IntersectionObserver factice : on déclenche l'entrée à l'écran à la main. */
let rappel: (entrees: Partial<IntersectionObserverEntry>[]) => void = () => undefined;
class FauxObservateur {
  constructor(f: typeof rappel) { rappel = f; }
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('Apparitions', () => {
  beforeEach(() => { vi.stubGlobal('IntersectionObserver', FauxObservateur); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('garde l’élément visible même quand React réécrit ses classes (ex. mode édition activé après coup)', () => {
    const { rerender } = render(<><Apparitions /><article data-apparition className="carte">Formule</article></>);
    const carte = screen.getByText('Formule');
    act(() => { rappel([{ isIntersecting: true, target: carte }]); });
    expect(carte).toHaveAttribute('data-vu');

    rerender(<><Apparitions /><article data-apparition className="carte enEdition">Formule</article></>);
    expect(carte).toHaveClass('enEdition');
    expect(carte).toHaveAttribute('data-vu');
  });
});
