import { render, screen, within } from '@testing-library/react';
import { Carte, prixCarte, type RubriqueCarte } from './Carte';

const rubriques: RubriqueCarte[] = [
  {
    id: 'r1',
    nom: 'Rubrique A',
    note: 'Supplément : + 1 €',
    pictogramme: '/picto.svg',
    articles: [
      { id: 'a1', nom: 'Article un', description: 'Détail', prixCents: 600, prixBarreCents: 550 },
      { id: 'a2', nom: 'Article deux', prixCents: 500, nouveau: true },
      { id: 'a3', nom: 'Article trois', prixCents: 450, epuise: true, nouveau: true },
    ],
  },
  { id: 'r2', nom: 'Rubrique B', articles: [{ id: 'b1', nom: 'Article quatre', prixCents: 150 }] },
];

describe('Carte', () => {
  it('écrit les prix comme sur une carte', () => {
    expect(prixCarte(550)).toBe('5,50 €');
    expect(prixCarte(600)).toBe('6 €');
  });

  it('affiche les rubriques et leurs articles, avec la note', () => {
    render(<Carte titre="Notre carte" rubriques={rubriques} />);
    expect(screen.getByRole('region', { name: 'Notre carte' })).toBeInTheDocument();
    const a = screen.getByRole('region', { name: 'Rubrique A' });
    expect(within(a).getAllByRole('listitem')).toHaveLength(3);
    expect(a).toHaveTextContent('Supplément : + 1 €');
    expect(screen.getByRole('region', { name: 'Rubrique B' })).toHaveTextContent('Article quatre');
  });

  it('barre l’ancien prix à côté du nouveau, lisible par un lecteur d’écran', () => {
    render(<Carte titre="Carte" rubriques={rubriques} />);
    const ligne = screen.getByText('Article un').closest('li')!;
    expect(ligne.querySelector('s')).toHaveTextContent('5,50 €');
    expect(ligne).toHaveTextContent('Ancien prix : 5,50 € Nouveau prix : 6 €');
  });

  it('pastilles « Nouveau » et « Épuisé » (un article épuisé n’est pas mis en avant)', () => {
    render(<Carte titre="Carte" rubriques={rubriques} libelles={{ epuise: 'Plus disponible' }} />);
    expect(screen.getByText('Article deux').closest('li')).toHaveTextContent('Nouveau');
    const epuise = screen.getByText('Article trois').closest('li')!;
    expect(epuise).toHaveTextContent('Plus disponible');
    expect(epuise).not.toHaveTextContent('Nouveau');
  });

  it('sommaire facultatif : un lien par rubrique vers sa section', () => {
    const { rerender } = render(<Carte titre="Carte" rubriques={rubriques} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    rerender(<Carte titre="Carte" rubriques={rubriques} sommaire="Aller à une rubrique" />);
    const liens = within(screen.getByRole('navigation', { name: 'Aller à une rubrique' })).getAllByRole('link');
    expect(liens.map((l) => l.textContent)).toEqual(['Rubrique A', 'Rubrique B']);
    const cible = document.querySelector(liens[0].getAttribute('href')!);
    expect(cible).toBe(screen.getByRole('region', { name: 'Rubrique A' }));
  });

  it('pictogramme décoratif à côté du titre de rubrique, caché aux lecteurs d’écran', () => {
    render(<Carte titre="Carte" rubriques={rubriques} compacte />);
    const a = screen.getByRole('region', { name: 'Rubrique A' });
    const picto = a.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(picto.style.getPropertyValue('--_picto')).toBe('url("/picto.svg")');
    expect(screen.getByRole('region', { name: 'Rubrique B' }).querySelector('[aria-hidden="true"][style]')).toBeNull();
  });
});
