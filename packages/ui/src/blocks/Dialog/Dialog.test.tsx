import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Dialog } from './Dialog';

function Exemple() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOuvert(true)}>Ouvrir</button>
      <Dialog open={ouvert} title="Un petit plus ?" description="Texte d’introduction" onClose={() => setOuvert(false)}
        actions={<><button type="button" onClick={() => setOuvert(false)}>Non merci</button><button type="button">Valider</button></>}>
        <p>Contenu</p>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('s’ouvre avec un titre, garde le focus dedans, se ferme avec Échap et rend le focus', async () => {
    render(<Exemple />);
    const ouvrir = screen.getByRole('button', { name: 'Ouvrir' });
    await userEvent.click(ouvrir);

    const fenetre = screen.getByRole('dialog', { name: 'Un petit plus ?' });
    expect(fenetre).toHaveAttribute('aria-modal', 'true');
    expect(fenetre).toHaveAccessibleDescription('Texte d’introduction');
    expect(screen.getByRole('button', { name: 'Fermer' })).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Valider' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Fermer' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(ouvrir).toHaveFocus();
  });

  it('se ferme avec un bouton d’action', async () => {
    render(<Exemple />);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Non merci' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
