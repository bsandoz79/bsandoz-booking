import { fireEvent, render, screen, within } from '@testing-library/react';
import { Carte, decouperCarte, prixCarte, type RubriqueCarte } from './Carte';

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

  describe('carte ajustée (tient dans la hauteur de l’écran)', () => {
    const longue: RubriqueCarte[] = Array.from({ length: 6 }, (_, i) => ({
      id: `r${i}`, nom: `Rubrique ${i + 1}`, articles: Array.from({ length: 4 }, (_, j) => ({ id: `a${i}-${j}`, nom: `Plat ${i}-${j}`, prixCents: 500 })),
    }));

    /** Grand écran simulé : hauteur disponible 300 px ; la carte mesure 100 px par rubrique affichée, à l'échelle du moment. */
    function ecran() {
      vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
        if (this.className.includes('sonde')) return 300;
        if (this.className.includes('rubriques')) {
          const echelle = Number(this.closest('section')?.style.getPropertyValue('--_echelle') || 1);
          return this.querySelectorAll(':scope > section').length * 100 * echelle;
        }
        return 0;
      });
    }
    afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

    it('sépare les rubriques en pages de poids proches, sans couper une rubrique', () => {
      expect(decouperCarte(longue, 2).map((g) => g.length)).toEqual([3, 3]);
      expect(decouperCarte(longue, 3).map((g) => g.length)).toEqual([2, 2, 2]);
      expect(decouperCarte(longue, 1)).toEqual([longue]);
    });

    it('rapetisse d’abord, puis se sépare en pages, toutes accessibles par des boutons', () => {
      ecran();
      render(<Carte titre="Menu" rubriques={longue} compacte ajustee />);
      const carte = screen.getByRole('region', { name: 'Menu' });
      expect(carte.style.getPropertyValue('--_echelle')).toBe('0.8');
      const pages = screen.getByRole('navigation', { name: 'Pages de la carte' });
      expect(pages).toHaveTextContent('Page 1 sur 2');
      expect(within(carte).getByRole('region', { name: 'Rubrique 1' })).toBeInTheDocument();
      expect(within(carte).queryByRole('region', { name: 'Rubrique 6' })).not.toBeInTheDocument();
      fireEvent.click(within(pages).getByRole('button', { name: /Page suivante/ }));
      expect(within(carte).getByRole('region', { name: 'Rubrique 6' })).toBeInTheDocument();
      expect(pages).toHaveTextContent('Page 2 sur 2');
    });

    it('une carte qui tient reste entière, à sa taille', () => {
      ecran();
      render(<Carte titre="Menu" rubriques={longue.slice(0, 2)} compacte ajustee />);
      expect(screen.getByRole('region', { name: 'Menu' }).style.getPropertyValue('--_echelle')).toBe('1');
      expect(screen.queryByRole('navigation', { name: 'Pages de la carte' })).not.toBeInTheDocument();
    });
  });

  describe('mode modification', () => {
    it('sans fonction donnée, rien n’est cliquable', () => {
      render(<Carte titre="Menu" rubriques={rubriques} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('chaque plat et chaque titre de rubrique se touche, « + Ajouter » sous chaque rubrique', () => {
      const onToucherArticle = vi.fn();
      const onToucherRubrique = vi.fn();
      const onAjouterArticle = vi.fn();
      render(<Carte titre="Menu" rubriques={rubriques} onToucherArticle={onToucherArticle} onToucherRubrique={onToucherRubrique} onAjouterArticle={onAjouterArticle} />);
      fireEvent.click(screen.getByRole('button', { name: 'Modifier : Article deux' }));
      expect(onToucherArticle).toHaveBeenCalledWith('a2');
      fireEvent.click(screen.getByRole('button', { name: 'Modifier : Rubrique B' }));
      expect(onToucherRubrique).toHaveBeenCalledWith('r2');
      fireEvent.click(screen.getByRole('button', { name: '+ Ajouter : Rubrique A' }));
      expect(onAjouterArticle).toHaveBeenCalledWith('r1');
      // Le plat reste lisible tel quel (nom, prix) à côté de son bouton.
      expect(screen.getByRole('region', { name: 'Rubrique A' })).toHaveTextContent('Article deux');
    });
  });
});
