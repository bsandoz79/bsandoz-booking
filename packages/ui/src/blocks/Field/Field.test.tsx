import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field } from './Field';

describe('Field', () => {
  it('relie le libellé au champ et transmet la saisie', async () => {
    const onChange = vi.fn();
    render(<Field label="E-mail" type="email" required onChange={onChange} />);
    const champ = screen.getByLabelText(/E-mail/);
    expect(champ).toBeRequired();
    expect(screen.getByText('(obligatoire)')).toBeInTheDocument();
    await userEvent.type(champ, 'a@b.fr');
    expect(onChange).toHaveBeenCalled();
  });

  it('relie l\'aide et l\'erreur au champ', () => {
    render(<Field label="Téléphone" hint="10 chiffres" error="Numéro invalide" />);
    const champ = screen.getByLabelText('Téléphone');
    expect(champ).toHaveAttribute('aria-invalid', 'true');
    expect(champ).toHaveAccessibleDescription('10 chiffres Numéro invalide');
    expect(screen.getByRole('alert')).toHaveTextContent('Numéro invalide');
  });

  it('champ sur plusieurs lignes', () => {
    render(<Field label="Informations" multiline rows={4} />);
    expect(screen.getByLabelText('Informations').tagName).toBe('TEXTAREA');
  });
});
