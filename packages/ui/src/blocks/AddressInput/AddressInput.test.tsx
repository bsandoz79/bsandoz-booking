import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressInput, type AddressSuggestion } from './AddressInput';

const suggestions: AddressSuggestion[] = [
  { label: '12 Rue de la Paix 75002 Paris', lat: 48.869, lng: 2.331 },
  { label: '12 Rue de la Paix 80000 Amiens', lat: 49.894, lng: 2.296 },
];

describe('AddressInput', () => {
  it('cherche à partir de 3 caractères et choisit à la souris', async () => {
    const search = vi.fn().mockResolvedValue(suggestions);
    const onSelect = vi.fn();
    render(<AddressInput label="Adresse" search={search} onSelect={onSelect} debounceMs={0} />);
    const champ = screen.getByRole('combobox', { name: 'Adresse' });

    await userEvent.type(champ, '12');
    expect(search).not.toHaveBeenCalled();

    await userEvent.type(champ, ' rue');
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    expect(search).toHaveBeenLastCalledWith('12 rue');
    expect(champ).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByRole('option', { name: /Amiens/ }));
    expect(onSelect).toHaveBeenCalledWith(suggestions[1]);
    expect(champ).toHaveValue('12 Rue de la Paix 80000 Amiens');
  });

  it('au clavier : flèches puis Entrée', async () => {
    const search = vi.fn().mockResolvedValue(suggestions);
    const onSelect = vi.fn();
    render(<AddressInput label="Adresse" search={search} onSelect={onSelect} debounceMs={0} />);
    const champ = screen.getByRole('combobox');

    await userEvent.type(champ, '12 rue');
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    const amiens = screen.getByRole('option', { name: /Amiens/ });
    expect(amiens).toHaveAttribute('aria-selected', 'true');
    expect(champ.getAttribute('aria-activedescendant')).toBe(amiens.id);

    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(suggestions[1]);
  });

  it('indique quand rien n’est trouvé, et ferme avec Échap', async () => {
    const search = vi.fn().mockResolvedValue([]);
    render(<AddressInput label="Adresse" search={search} onSelect={() => {}} debounceMs={0} noResultsLabel="Rien trouvé." />);

    await userEvent.type(screen.getByRole('combobox'), 'zzzz');
    await waitFor(() => expect(screen.getByText('Rien trouvé.')).toBeInTheDocument());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Rien trouvé.')).not.toBeInTheDocument();
  });

  it('affiche l’adresse déjà choisie et l’erreur', () => {
    render(<AddressInput label="Adresse" search={vi.fn()} onSelect={() => {}} value={suggestions[0]} error="Hors zone" />);
    const champ = screen.getByRole('combobox');
    expect(champ).toHaveValue('12 Rue de la Paix 75002 Paris');
    expect(champ).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Hors zone');
  });
});
