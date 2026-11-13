import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProduitsOnglet } from './Produits';

describe('Espace pro : produits', () => {
  it('grille de produits : stock, ajout avec catégorie, filtres, retrait et suppression', async () => {
    render(<ProduitsOnglet />);
    const grille = await screen.findByRole('list', { name: 'Mes produits' });
    const antiBuee = within(grille).getByRole('listitem', { name: 'Anti-buée' });
    expect(antiBuee).toHaveTextContent('Il en reste 3');

    await userEvent.click(within(antiBuee).getByRole('button', { name: 'Un Anti-buée de plus en stock' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Stock de « Anti-buée » : 4.');

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un produit' }));
    await userEvent.type(screen.getByLabelText(/^Nom/), 'Lave-glace');
    await userEvent.type(screen.getByLabelText(/^Prix/), '6,90');
    await userEvent.clear(screen.getByLabelText(/^En stock/));
    await userEvent.type(screen.getByLabelText(/^En stock/), '0');
    await userEvent.type(screen.getByLabelText(/^Catégorie/), 'Vitres');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('status')).toHaveTextContent('« Lave-glace » enregistré.');
    expect(await screen.findByRole('listitem', { name: 'Lave-glace' })).toHaveTextContent('Épuisé');

    // Filtres : catégorie, puis recherche par nom.
    await userEvent.click(within(screen.getByRole('group', { name: 'Filtrer par catégorie' })).getByRole('button', { name: 'Entretien' }));
    expect(screen.queryByRole('listitem', { name: 'Lave-glace' })).not.toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Microfibre' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Toutes' }));
    await userEvent.type(screen.getByLabelText('Rechercher un produit'), 'lave');
    expect(screen.getAllByRole('listitem').map((l) => l.getAttribute('aria-label'))).toEqual(['Lave-glace']);
    await userEvent.clear(screen.getByLabelText('Rechercher un produit'));

    await userEvent.click(screen.getByRole('button', { name: 'Retirer Lave-glace' }));
    expect(await screen.findByRole('status')).toHaveTextContent('« Lave-glace » retiré de la vente.');
    expect(await screen.findByRole('listitem', { name: 'Lave-glace' })).toHaveTextContent('Retiré de la vente');

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer Lave-glace' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer définitivement' }));
    expect(await screen.findByRole('status')).toHaveTextContent('« Lave-glace » supprimé.');
    expect(screen.queryByRole('listitem', { name: 'Lave-glace' })).not.toBeInTheDocument();
  });
});
