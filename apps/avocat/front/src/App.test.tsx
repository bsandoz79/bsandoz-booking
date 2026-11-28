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

  it('présente un cabinet de droit pénal : quatre domaines numérotés, procédure, honoraires et contact', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Maître Baptiste Sandoz' })).toBeInTheDocument();
    expect(screen.getAllByText(/Droit pénal et droit routier/).length).toBeGreaterThan(0);
    const domaines = screen.getByRole('region', { name: 'Domaines d’intervention' });
    expect(within(domaines).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Défense pénale',
      'Droit des victimes',
      'Droit routier',
      'Exécution des peines',
    ]);
    const procedure = screen.getByRole('region', { name: 'Les étapes d’une procédure pénale' });
    expect(within(procedure).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('region', { name: 'Honoraires' })).toHaveTextContent('convention d’honoraires');
    const contact = screen.getByRole('region', { name: 'Contact et prise de rendez-vous' });
    expect(within(contact).getByRole('link', { name: '03 53 01 42 17' })).toHaveAttribute('href', 'tel:+33353014217');
    expect(within(contact).getAllByText(/fictif|fictive/).length).toBeGreaterThanOrEqual(3);
  });

  it('signale la garde à vue en urgence, avec un numéro marqué fictif', () => {
    render(<App />);
    const urgence = screen.getByRole('complementary', { name: /Garde à vue/ });
    expect(within(urgence).getByRole('link', { name: /Joindre la permanence/ })).toHaveAttribute('href', 'tel:+33353014217');
    expect(urgence).toHaveTextContent('(fictif)');
  });

  it('montre les juridictions de la Somme en photo, chacune avec un texte alternatif', () => {
    render(<App />);
    const juridictions = screen.getByRole('region', { name: 'Les juridictions de la Somme' });
    expect(within(juridictions).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Tribunal judiciaire d’Abbeville',
      'Palais de justice d’Amiens',
      'Cour d’appel d’Amiens',
    ]);
    const images = within(juridictions).getAllByRole('img');
    expect(images).toHaveLength(3);
    for (const img of images) {
      expect(img.getAttribute('alt')).not.toBe('');
      expect(img).toHaveAttribute('srcset', expect.stringContaining('1600w'));
      expect(img).toHaveAttribute('loading', 'lazy');
    }
    expect(juridictions).toHaveTextContent('sans lien avec ce cabinet fictif');
  });

  it('les boutons et le menu mènent aux sections de la page', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Prendre rendez-vous' })).toHaveAttribute('href', '#contact');
    const menu = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(within(menu).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#cabinet', '#domaines', '#procedure', '#juridictions', '#honoraires', '#contact']);
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
    expect(screen.getByRole('heading', { name: 'Crédits photos' })).toBeInTheDocument();
    expect(screen.getAllByText(/CC BY-SA 4\.0/)).toHaveLength(5);
    const menu = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(within(menu).getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/#contact');
  });

  it('confidentialité : aucune donnée collectée, aucun cookie', () => {
    render(<PageLegale page={confidentialite} />);
    expect(screen.getByText('Ce site ne collecte aucune donnée personnelle.')).toBeInTheDocument();
    expect(screen.getByText(/Aucun cookie/)).toBeInTheDocument();
  });
});
