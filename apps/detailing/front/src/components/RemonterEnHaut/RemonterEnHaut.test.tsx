import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RemonterEnHaut } from './RemonterEnHaut';

const defiler = (y: number) => act(() => { Object.defineProperty(window, 'scrollY', { value: y, configurable: true }); window.dispatchEvent(new Event('scroll')); });

describe('RemonterEnHaut', () => {
  afterEach(() => defiler(0));

  it('apparaît après avoir défilé et remonte en haut de la page', async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    render(<MemoryRouter><RemonterEnHaut /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Remonter en haut de la page' })).not.toBeInTheDocument();

    defiler(2000);
    await userEvent.click(screen.getByRole('button', { name: 'Remonter en haut de la page' }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    vi.unstubAllGlobals();
  });

  it('n’apparaît pas sur la réservation (barre de paiement en bas)', () => {
    render(<MemoryRouter initialEntries={['/reserver']}><RemonterEnHaut /></MemoryRouter>);
    defiler(2000);
    expect(screen.queryByRole('button', { name: 'Remonter en haut de la page' })).not.toBeInTheDocument();
  });
});
