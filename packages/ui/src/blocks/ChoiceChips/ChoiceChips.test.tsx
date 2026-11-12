import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChoiceChips } from './ChoiceChips';

describe('ChoiceChips', () => {
  it('renvoie la valeur choisie', async () => {
    const onChange = vi.fn();
    render(<ChoiceChips label="Taille" choices={[{ value: 'petit', label: 'Petit' }, { value: 'grand', label: 'Grand' }]} value="petit" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Petit' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Grand' }));
    expect(onChange).toHaveBeenCalledWith('grand');
  });
});
