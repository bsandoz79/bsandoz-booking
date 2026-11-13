import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { DefilementAncre } from './DefilementAncre';

describe('Défilement à la navigation', () => {
  it('remonte tout en haut à chaque clic sur un lien, même vers la page déjà ouverte', async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    render(<MemoryRouter initialEntries={['/']}><DefilementAncre /><Link to="/professionnels">Pro</Link></MemoryRouter>);
    scrollTo.mockClear();

    await userEvent.click(screen.getByRole('link', { name: 'Pro' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });

    scrollTo.mockClear();
    await userEvent.click(screen.getByRole('link', { name: 'Pro' }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
