import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../app/App';
import { COMMUNES, PAGES_SEO, donneesStructurees } from './donnees';

describe('référencement local', () => {
  it('donne à chaque page un chemin unique, un titre et une description de bonne longueur', () => {
    const chemins = PAGES_SEO.map((p) => p.chemin);
    expect(new Set(chemins).size).toBe(chemins.length);
    for (const page of PAGES_SEO) {
      expect(page.titre.length, page.chemin).toBeLessThanOrEqual(75);
      expect(page.description.length, page.chemin).toBeGreaterThan(50);
      expect(page.description.length, page.chemin).toBeLessThanOrEqual(170);
    }
    expect(PAGES_SEO[0].titre).toMatch(/Nettoyage voiture à domicile à Abbeville/);
    expect(chemins).toContain('/nettoyage-voiture/saint-valery-sur-somme');
  });

  it('décrit l’entreprise locale pour les moteurs de recherche (schema.org)', () => {
    const donnees = donneesStructurees('https://demo.bsandoz.fr');
    expect(donnees['@type']).toBe('AutoWash');
    expect(donnees.address).toMatchObject({ addressLocality: 'Abbeville', postalCode: '80100' });
    expect((donnees.areaServed as unknown[]).length).toBe(COMMUNES.length + 1);
    expect(JSON.stringify(donnees)).not.toContain('[à compléter]');
  });

  it('affiche la page d’une commune avec son titre, et une page introuvable pour une commune inconnue', () => {
    const { unmount } = render(<MemoryRouter initialEntries={['/nettoyage-voiture/le-crotoy']}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Nettoyage de voiture à domicile à Le Crotoy' })).toBeInTheDocument();
    expect(document.title).toBe('Nettoyage voiture à domicile Le Crotoy | Perfect Clean');
    expect(screen.getByRole('link', { name: 'Réserver un créneau à Le Crotoy' })).toHaveAttribute('href', '/reserver');
    expect(screen.getByRole('link', { name: 'Nettoyage voiture Abbeville' })).toHaveAttribute('href', '/nettoyage-voiture/abbeville');
    unmount();

    render(<MemoryRouter initialEntries={['/nettoyage-voiture/paris']}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeInTheDocument();
  });

  it('relie l’accueil aux pages des communes', () => {
    render(<MemoryRouter><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Nettoyage de voiture à domicile à Abbeville' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Nettoyage de voiture par commune' }).querySelectorAll('a')).toHaveLength(COMMUNES.length);
  });
});
