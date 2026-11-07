import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptionCard } from './OptionCard';

describe('OptionCard', () => {
  it('bascule la sélection', async () => {
    const onToggle = vi.fn();
    render(<OptionCard title="Poils d'animaux" priceLabel="+ 15 €" selected={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /poils d'animaux/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });
  it('indique l’état sélectionné', () => {
    render(<OptionCard title="Moteur" selected onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /moteur/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
