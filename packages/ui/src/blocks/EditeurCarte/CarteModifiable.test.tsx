import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CarteModifiable, type CarteModifiableProps, type RubriqueEditable } from './EditeurCarte';

const rubriques: RubriqueEditable[] = [
  {
    id: 'r1', nom: 'Rubrique A', note: 'Supplément : + 1 €', icone: null,
    articles: [
      { id: 'a1', categorieId: 'r1', nom: 'Article un', description: 'Détail', prixCents: 600, visible: true },
      { id: 'a2', categorieId: 'r1', nom: 'Article caché', description: '', prixCents: 450, visible: false },
    ],
  },
  { id: 'r2', nom: 'Rubrique B', note: '', icone: null, articles: [] },
];

function monter(props: Partial<CarteModifiableProps> = {}) {
  const fonctions = {
    onAjouterArticle: vi.fn(async () => {}),
    onModifierArticle: vi.fn(async () => {}),
    onEpuiser: vi.fn(async () => {}),
    onSupprimerArticle: vi.fn(async () => {}),
    onModifierRubrique: vi.fn(async () => {}),
    onSupprimerRubrique: vi.fn(async () => {}),
  };
  render(<CarteModifiable titre="Carte" rubriques={rubriques} {...fonctions} {...props} />);
  return { ...fonctions, ...props };
}

describe('CarteModifiable', () => {
  it('montre la carte comme les clients, sans les plats cachés', () => {
    monter();
    expect(screen.getByRole('button', { name: 'Modifier : Article un' })).toBeInTheDocument();
    expect(screen.queryByText('Article caché')).not.toBeInTheDocument();
  });

  it('toucher un plat ouvre sa fiche ; le nouveau prix est envoyé en centimes', async () => {
    const f = monter();
    await userEvent.click(screen.getByRole('button', { name: 'Modifier : Article un' }));
    const fenetre = screen.getByRole('dialog', { name: 'Modifier l’article' });
    const prix = within(fenetre).getByLabelText(/Prix/);
    await userEvent.clear(prix);
    await userEvent.type(prix, '6,50');
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer' }));
    expect(f.onModifierArticle).toHaveBeenCalledWith('a1', expect.objectContaining({ prixCents: 650, nom: 'Article un', barrerAncienPrix: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('« Épuisé jusqu’à ce soir » depuis la fiche du plat', async () => {
    const f = monter();
    await userEvent.click(screen.getByRole('button', { name: 'Modifier : Article un' }));
    await userEvent.click(screen.getByRole('button', { name: 'Épuisé jusqu’à ce soir' }));
    expect(f.onEpuiser).toHaveBeenCalledWith('a1', true);
  });

  it('ajoute un plat dans la rubrique touchée', async () => {
    const f = monter();
    await userEvent.click(screen.getByRole('button', { name: '+ Ajouter : Rubrique B' }));
    const fenetre = screen.getByRole('dialog', { name: 'Ajouter un article' });
    await userEvent.type(within(fenetre).getByLabelText(/Nom/), 'Nouveau plat');
    await userEvent.type(within(fenetre).getByLabelText(/Prix/), '4');
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer' }));
    expect(f.onAjouterArticle).toHaveBeenCalledWith(expect.objectContaining({ categorieId: 'r2', nom: 'Nouveau plat', prixCents: 400 }));
  });

  it('une erreur reste affichée dans la fiche, qui ne se ferme pas', async () => {
    monter({ onModifierRubrique: vi.fn(async () => { throw new Error('Nom déjà pris.'); }) });
    await userEvent.click(screen.getByRole('button', { name: 'Modifier : Rubrique A' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nom déjà pris.');
    expect(screen.getByRole('dialog', { name: 'Modifier la rubrique' })).toBeInTheDocument();
  });
});
