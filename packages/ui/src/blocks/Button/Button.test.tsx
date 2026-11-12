import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('déclenche l\'action, type « button » par défaut', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Réserver</Button>);
    const bouton = screen.getByRole('button', { name: 'Réserver' });
    expect(bouton).toHaveAttribute('type', 'button');
    await userEvent.click(bouton);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('pendant le chargement : désactivé, occupé et annoncé', async () => {
    const onClick = vi.fn();
    render(<Button loading loadingLabel="Envoi en cours" onClick={onClick}>Valider</Button>);
    const bouton = screen.getByRole('button');
    expect(bouton).toBeDisabled();
    expect(bouton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Envoi en cours')).toBeInTheDocument();
    await userEvent.click(bouton);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('accepte type « submit » et les attributs du bouton', () => {
    render(<Button type="submit" variant="secondary" aria-describedby="aide">Envoyer</Button>);
    const bouton = screen.getByRole('button', { name: 'Envoyer' });
    expect(bouton).toHaveAttribute('type', 'submit');
    expect(bouton).toHaveAttribute('aria-describedby', 'aide');
  });
});
