import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChoiceChips } from './ChoiceChips';

describe('ChoiceChips', () => {
  it('renvoie la valeur choisie', async () => {
    const onChange = vi.fn();
    render(<ChoiceChips label="Véhicule" choices={[{ value: 'citadine', label: 'Citadine' }, { value: 'suv', label: 'SUV' }]} value="citadine" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Citadine' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'SUV' }));
    expect(onChange).toHaveBeenCalledWith('suv');
  });
});
