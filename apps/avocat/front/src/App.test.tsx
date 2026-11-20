import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { confidentialite, mentionsLegales } from './data/legal';
import { PageLegale } from './pages/PageLegale';

describe('Site fictif d’avocat', () => {
  it('dit clairement que le site est fictif et que Baptiste Sandoz n’est pas avocat', () => {
    render(<App />);
    expect(screen.getByRole('note')).toHaveTextContent('Site fictif');
    expect(screen.getByRole('note')).toHaveTextContent('Baptiste Sandoz n’est pas avocat');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Site fictif réalisé par Baptiste Sandoz');
  });

  it('présente le cabinet, le parcours, trois domaines numérotés et le contact', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Maître Baptiste Sandoz' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mon parcours' })).toBeInTheDocument();
    const domaines = screen.getByRole('region', { name: 'Domaines d’intervention' });
    expect(within(domaines).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Droit du numérique',
      'Droit des contrats',
      'Propriété intellectuelle',
    ]);
    const contact = screen.getByRole('region', { name: 'Contact et prise de rendez-vous' });
    expect(within(contact).getByRole('link', { name: '03 53 01 42 17' })).toHaveAttribute('href', 'tel:+33353014217');
    expect(within(contact).getAllByText(/fictif|fictive/).length).toBeGreaterThanOrEqual(3);
  });

  it('les boutons et le menu mènent aux sections de la page', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Prendre rendez-vous' })).toHaveAttribute('href', '#contact');
    const menu = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(within(menu).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#cabinet', '#parcours', '#domaines', '#contact']);
  });

  it('sur téléphone, le menu s’ouvre et se ferme par un bouton', async () => {
    render(<App />);
    const bouton = screen.getByRole('button', { name: 'Menu' });
    expect(bouton).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(bouton);
    expect(screen.getByRole('button', { name: 'Fermer' })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Menu principal' })).getByRole('link', { name: 'Contact' }));
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Pages légales', () => {
  it('mentions légales : site fictif, éditeur et hébergeur, menu vers l’accueil', () => {
    render(<PageLegale page={mentionsLegales} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nature du site' })).toBeInTheDocument();
    expect(screen.getByText(/o2switch, SAS/)).toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(within(menu).getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/#contact');
  });

  it('confidentialité : aucune donnée collectée, aucun cookie', () => {
    render(<PageLegale page={confidentialite} />);
    expect(screen.getByText('Ce site ne collecte aucune donnée personnelle.')).toBeInTheDocument();
    expect(screen.getByText(/Aucun cookie/)).toBeInTheDocument();
  });
});
