import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Installer } from './Installer';
import { ecouterInstallation, estAppareilApple } from '../../pwa/installation';

describe('Installer l’application', () => {
  it('explique la marche à suivre quand le navigateur ne propose pas d’invitation', async () => {
    render(<Installer />);
    await userEvent.click(screen.getByRole('button', { name: /Installer l’application/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Ajouter à l’écran d’accueil/)).toBeInTheDocument();
  });

  it('ouvre l’invitation du navigateur quand elle existe', async () => {
    ecouterInstallation();
    const prompt = vi.fn(async () => undefined);
    const invitation = Object.assign(new Event('beforeinstallprompt'), { prompt, userChoice: Promise.resolve({ outcome: 'accepted' as const }) });
    render(<Installer />);
    act(() => { window.dispatchEvent(invitation); });
    await userEvent.click(screen.getByRole('button', { name: /Installer l’application/ }));
    expect(prompt).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Installée : le bouton disparaît.
    expect(screen.queryByRole('button', { name: /Installer l’application/ })).not.toBeInTheDocument();
  });

  it('reconnaît un iPhone', () => {
    expect(estAppareilApple('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(estAppareilApple('Mozilla/5.0 (Linux; Android 14)')).toBe(false);
  });
});
