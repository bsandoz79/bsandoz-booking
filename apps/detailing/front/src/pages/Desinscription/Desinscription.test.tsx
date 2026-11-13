import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Desinscription } from './Desinscription';

describe('Désinscription des relances', () => {
  it('demande une confirmation, puis confirme la désinscription', async () => {
    render(<MemoryRouter initialEntries={['/desinscription?u=u-1&s=abc']}><Desinscription /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer la désinscription' }));
    expect(await screen.findByRole('status')).toHaveTextContent('vous ne recevrez plus d’e-mail de rappel');
  });

  it('signale un lien incomplet', () => {
    render(<MemoryRouter initialEntries={['/desinscription']}><Desinscription /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Ce lien est incomplet');
  });
});
