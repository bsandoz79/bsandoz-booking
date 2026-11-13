import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ChoixProduits } from './ChoixProduits';

const PRODUITS = [
  { id: 'micro', name: 'Microfibre', description: 'Chiffon', priceCents: 500, stock: 2, photo: null },
  { id: 'vitres', name: 'Lave-vitres', description: '', priceCents: 790, stock: 5, photo: null },
  { id: 'cire', name: 'Cire', description: '', priceCents: 1500, stock: 0, photo: null },
];

function Choix() {
  const [q, setQ] = useState<Record<string, number>>({});
  return <ChoixProduits produits={PRODUITS} quantites={q} onChange={(id, n) => setQ({ ...q, [id]: n })} />;
}

describe('ChoixProduits', () => {
  it('indique le stock restant et les produits épuisés, qu’on ne peut pas ajouter', () => {
    render(<Choix />);
    expect(screen.getByText('Il en reste 2')).toBeInTheDocument();
    expect(screen.getAllByText('Épuisé').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Ajouter Cire' })).not.toBeInTheDocument();
  });

  it('ajoute un produit, change la quantité dans la limite du stock et affiche le total', async () => {
    render(<Choix />);
    expect(screen.getByRole('heading', { name: 'À ajouter à votre commande ?' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter Microfibre' }));
    await userEvent.click(screen.getByRole('button', { name: 'Un Microfibre de plus' }));
    expect(screen.getByRole('group', { name: 'Quantité de Microfibre' })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: 'Un Microfibre de plus' })).toBeDisabled();
    expect(screen.getByText(/Produits :/)).toHaveTextContent(/10,00\s€/);

    await userEvent.click(screen.getByRole('button', { name: 'Un Microfibre de moins' }));
    await userEvent.click(screen.getByRole('button', { name: 'Retirer Microfibre' }));
    expect(screen.getByRole('button', { name: 'Ajouter Microfibre' })).toBeInTheDocument();
    expect(screen.queryByText(/Produits :/)).not.toBeInTheDocument();
  });

  it('n’affiche rien sans produit en vente', () => {
    const { container } = render(<ChoixProduits produits={[]} quantites={{}} onChange={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
