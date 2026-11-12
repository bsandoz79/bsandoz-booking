import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('bascule au clic et au clavier', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Active" checked={false} onChange={onChange} hint="Visible sur le site" />);
    const interrupteur = screen.getByRole('switch', { name: 'Active' });
    expect(interrupteur).toHaveAttribute('aria-checked', 'false');
    expect(interrupteur).toHaveAccessibleDescription('Visible sur le site');

    await userEvent.click(interrupteur);
    expect(onChange).toHaveBeenLastCalledWith(true);

    interrupteur.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('indique l’état activé et peut être désactivé', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Active" checked disabled onChange={onChange} />);
    const interrupteur = screen.getByRole('switch');
    expect(interrupteur).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(interrupteur);
    expect(onChange).not.toHaveBeenCalled();
  });
});
