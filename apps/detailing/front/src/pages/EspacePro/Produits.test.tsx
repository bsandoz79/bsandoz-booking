import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProduitsOnglet } from './Produits';

describe('Espace pro : produits', () => {
  it('ajuste le stock, ajoute un produit et le retire de la vente', async () => {
    render(<ProduitsOnglet />);
    const tableau = await screen.findByRole('table', { name: 'Mes produits' });
    const ligne = within(tableau).getByText('Anti-buée').closest('tr') as HTMLElement;
    expect(ligne).toHaveTextContent('3');

    await userEvent.click(within(ligne).getByRole('button', { name: 'Un Anti-buée de plus en stock' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Stock de « Anti-buée » : 4.');

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un produit' }));
    await userEvent.type(screen.getByLabelText(/^Nom/), 'Lave-glace');
    await userEvent.type(screen.getByLabelText(/^Prix/), '6,90');
    await userEvent.clear(screen.getByLabelText(/^En stock/));
    await userEvent.type(screen.getByLabelText(/^En stock/), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('status')).toHaveTextContent('« Lave-glace » enregistré.');

    const nouvelle = (await screen.findByText('Lave-glace')).closest('tr') as HTMLElement;
    await userEvent.click(within(nouvelle).getByRole('button', { name: 'Retirer Lave-glace' }));
    expect(await screen.findByRole('status')).toHaveTextContent('« Lave-glace » retiré de la vente.');
    expect((await screen.findByText('Lave-glace')).closest('tr')).toHaveTextContent('Retiré');
  });
});
