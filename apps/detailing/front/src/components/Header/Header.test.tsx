import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './Header';

describe('Header', () => {
  afterEach(() => { delete document.documentElement.dataset.theme; localStorage.clear(); });

  it('bascule entre la version claire et la version nuit, et retient le choix', async () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    const bouton = screen.getByRole('button', { name: 'Version nuit' });
    expect(bouton).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(bouton);
    expect(document.documentElement.dataset.theme).toBe('nuit');
    expect(localStorage.getItem('theme')).toBe('nuit');
    expect(bouton).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(bouton);
    expect(document.documentElement.dataset.theme).toBe('clair');
    expect(localStorage.getItem('theme')).toBe('clair');
  });

  it('mène directement à la carte de fidélité', async () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: 'Fidélité' })).toHaveAttribute('href', '/#fidelite');
  });

  it('ouvre et referme le menu sur téléphone', async () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    const menu = screen.getByRole('button', { name: 'Menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(menu);
    await userEvent.click(screen.getByRole('link', { name: 'Mon espace' }));
    expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  it('affiche le logo comme lien vers l’accueil', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Perfect Clean' })).toHaveAttribute('href', '/');
  });
});
