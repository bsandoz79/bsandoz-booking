import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type DataTableColumn } from './DataTable';

interface Ligne { id: string; nom: string; montant: number }

const lignes: Ligne[] = [
  { id: 'a', nom: 'Bravo', montant: 300 },
  { id: 'b', nom: 'Alpha', montant: 1200 },
  { id: 'c', nom: 'Charlie', montant: 50 },
];

const colonnes: DataTableColumn<Ligne>[] = [
  { key: 'nom', header: 'Nom', sortValue: (l) => l.nom },
  { key: 'montant', header: 'Montant', align: 'end', sortValue: (l) => l.montant, render: (l) => `${l.montant} €` },
];

const premiereColonne = () =>
  screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('DataTable', () => {
  it('affiche les lignes et trie par colonne', async () => {
    render(<DataTable caption="Clients" columns={colonnes} rows={lignes} rowKey={(l) => l.id} emptyLabel="Aucun" />);
    expect(screen.getByRole('table', { name: 'Clients' })).toBeInTheDocument();
    expect(premiereColonne()).toEqual(['Bravo', 'Alpha', 'Charlie']);
    expect(screen.getByText('1200 €')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Nom/ }));
    expect(premiereColonne()).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(screen.getByRole('columnheader', { name: /Nom/ })).toHaveAttribute('aria-sort', 'ascending');

    await userEvent.click(screen.getByRole('button', { name: /Nom/ }));
    expect(premiereColonne()).toEqual(['Charlie', 'Bravo', 'Alpha']);

    await userEvent.click(screen.getByRole('button', { name: /Montant/ }));
    expect(premiereColonne()).toEqual(['Charlie', 'Bravo', 'Alpha']);
    expect(screen.getByRole('columnheader', { name: /Nom/ })).toHaveAttribute('aria-sort', 'none');
  });

  it('affiche le message vide', () => {
    render(<DataTable caption="Clients" columns={colonnes} rows={[]} rowKey={(l) => l.id} emptyLabel="Aucun client" />);
    expect(screen.getByText('Aucun client')).toBeInTheDocument();
  });

  it('ouvre une ligne', async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        caption="Clients"
        columns={colonnes}
        rows={lignes}
        rowKey={(l) => l.id}
        emptyLabel="Aucun"
        onRowClick={onRowClick}
        rowActionLabel={(l) => `Ouvrir ${l.nom}`}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir Alpha' }));
    expect(onRowClick).toHaveBeenCalledWith(lignes[1]);
  });
});
