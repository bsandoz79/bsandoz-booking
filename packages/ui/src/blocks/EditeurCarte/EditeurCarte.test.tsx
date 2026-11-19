import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditeurCarte, lirePrix, type EditeurCarteProps, type RubriqueEditable } from './EditeurCarte';

const rubriques: RubriqueEditable[] = [
  {
    id: 'r1', nom: 'Rubrique A', note: 'Supplément : + 1 €', icone: 'un',
    articles: [
      { id: 'a1', categorieId: 'r1', nom: 'Article un', description: 'Détail', prixCents: 600, prixBarreCents: 550, visible: true },
      { id: 'a2', categorieId: 'r1', nom: 'Article deux', description: '', prixCents: 450, epuise: true, visible: false },
    ],
  },
  { id: 'r2', nom: 'Rubrique B', note: '', icone: null, articles: [] },
];

function monter(props: Partial<EditeurCarteProps> = {}) {
  const fonctions = {
    onAjouterRubrique: vi.fn(async () => {}),
    onModifierRubrique: vi.fn(async () => {}),
    onSupprimerRubrique: vi.fn(async () => {}),
    onOrdonnerRubriques: vi.fn(async () => {}),
    onAjouterArticle: vi.fn(async () => {}),
    onModifierArticle: vi.fn(async () => {}),
    onEpuiser: vi.fn(async () => {}),
    onSupprimerArticle: vi.fn(async () => {}),
    onOrdonnerArticles: vi.fn(async () => {}),
  };
  render(<EditeurCarte rubriques={rubriques} icones={[{ cle: 'un', nom: 'Dessin un', url: '/un.svg' }]} {...fonctions} {...props} />);
  return { ...fonctions, ...props };
}

describe('EditeurCarte', () => {
  it('lit les prix saisis en euros', () => {
    expect(lirePrix('7,50')).toBe(750);
    expect(lirePrix('7.5')).toBe(750);
    expect(lirePrix(' 7 € ')).toBe(700);
    expect(lirePrix('sept')).toBeNull();
    expect(lirePrix('-2')).toBeNull();
    expect(lirePrix('7,555')).toBeNull();
  });

  it('montre les rubriques et leurs articles : ancien prix barré, caché, épuisé', () => {
    monter();
    const a = screen.getByRole('region', { name: 'Rubrique A' });
    expect(a).toHaveTextContent('Supplément : + 1 €');
    expect(within(a).getByRole('button', { name: /^Article un/ })).toHaveTextContent('5,50 € 6 €');
    expect(within(a).getByRole('button', { name: /^Article deux/ })).toHaveTextContent('Caché');
    expect(within(a).getByRole('button', { name: 'Épuisé : Article deux' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Rubrique B' })).toHaveTextContent('Aucun article dans cette rubrique.');
  });

  it('« Épuisé » en une touche', async () => {
    const f = monter();
    await userEvent.click(screen.getByRole('button', { name: 'Épuisé : Article un' }));
    expect(f.onEpuiser).toHaveBeenCalledWith('a1', true);
  });

  it('modifie un article : prix en euros envoyé en centimes', async () => {
    const f = monter();
    await userEvent.click(screen.getByRole('button', { name: /^Article un/ }));
    const fiche = screen.getByRole('dialog', { name: 'Modifier l’article' });
    const prix = within(fiche).getByLabelText(/Prix/);
    expect(prix).toHaveValue('6');
    await userEvent.clear(prix);
    await userEvent.type(prix, '6,50');
    await userEvent.click(within(fiche).getByRole('button', { name: 'Enregistrer' }));
    expect(f.onModifierArticle).toHaveBeenCalledWith('a1', { categorieId: 'r1', nom: 'Article un', description: 'Détail', prixCents: 650, visible: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('refuse un prix illisible sans rien envoyer', async () => {
    const f = monter();
    await userEvent.click(screen.getAllByRole('button', { name: '+ Ajouter un article' })[1]);
    const fiche = screen.getByRole('dialog', { name: 'Ajouter un article' });
    await userEvent.type(within(fiche).getByLabelText(/Nom/), 'Nouveau');
    await userEvent.type(within(fiche).getByLabelText(/Prix/), 'sept euros');
    await userEvent.click(within(fiche).getByRole('button', { name: 'Enregistrer' }));
    expect(within(fiche).getByRole('alert')).toHaveTextContent('Indiquez un prix');
    expect(f.onAjouterArticle).not.toHaveBeenCalled();
    await userEvent.clear(within(fiche).getByLabelText(/Prix/));
    await userEvent.type(within(fiche).getByLabelText(/Prix/), '3');
    await userEvent.click(within(fiche).getByRole('button', { name: 'Enregistrer' }));
    expect(f.onAjouterArticle).toHaveBeenCalledWith({ categorieId: 'r2', nom: 'Nouveau', description: '', prixCents: 300, visible: true });
  });

  it('supprime en deux touches', async () => {
    const f = monter();
    await userEvent.click(screen.getByRole('button', { name: /^Article deux/ }));
    const fiche = screen.getByRole('dialog');
    await userEvent.click(within(fiche).getByRole('button', { name: 'Supprimer' }));
    expect(f.onSupprimerArticle).not.toHaveBeenCalled();
    await userEvent.click(within(fiche).getByRole('button', { name: 'Toucher encore pour confirmer' }));
    expect(f.onSupprimerArticle).toHaveBeenCalledWith('a2');
  });

  it('affiche le message d’erreur reçu et garde la fiche ouverte', async () => {
    monter({ onSupprimerRubrique: vi.fn(async () => { throw new Error('Videz d’abord la rubrique.'); }) });
    await userEvent.click(screen.getByRole('button', { name: 'Modifier la rubrique : Rubrique A' }));
    const fiche = screen.getByRole('dialog', { name: 'Modifier la rubrique' });
    await userEvent.click(within(fiche).getByRole('button', { name: 'Supprimer' }));
    await userEvent.click(within(fiche).getByRole('button', { name: 'Toucher encore pour confirmer' }));
    expect(await within(fiche).findByRole('alert')).toHaveTextContent('Videz d’abord la rubrique.');
  });

  it('rubrique : nom, note, pictogramme ; ordre par flèches', async () => {
    const f = monter();
    await userEvent.click(screen.getByRole('button', { name: 'Modifier la rubrique : Rubrique A' }));
    const fiche = screen.getByRole('dialog');
    expect(within(fiche).getByRole('radio', { name: 'Dessin un' })).toBeChecked();
    await userEvent.click(within(fiche).getByRole('radio', { name: 'Aucun' }));
    await userEvent.click(within(fiche).getByRole('button', { name: 'Enregistrer' }));
    expect(f.onModifierRubrique).toHaveBeenCalledWith('r1', { nom: 'Rubrique A', note: 'Supplément : + 1 €', icone: null });

    expect(screen.getByRole('button', { name: 'Monter : Rubrique A' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Descendre : Rubrique A' }));
    expect(f.onOrdonnerRubriques).toHaveBeenCalledWith(['r2', 'r1']);
  });
});
