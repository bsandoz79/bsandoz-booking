import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { StepCard, type StepCardStatus } from './StepCard';

function Parcours() {
  const [etape, setEtape] = useState(1);
  const statut = (i: number): StepCardStatus => (i < etape ? 'done' : i === etape ? 'active' : 'upcoming');
  return (
    <>
      <StepCard number={1} title="Choix" status={statut(0)} summary="Formule B" onEdit={() => setEtape(0)}><p>Contenu 1</p></StepCard>
      <StepCard number={2} title="Créneau" status={statut(1)}><button type="button" onClick={() => setEtape(2)}>Suite</button></StepCard>
      <StepCard number={3} title="Coordonnées" status={statut(2)}><p>Contenu 3</p></StepCard>
    </>
  );
}

describe('StepCard', () => {
  it('replie les étapes terminées avec leur résumé et n’affiche que le contenu de l’étape active', () => {
    render(<Parcours />);
    expect(screen.getByText('Formule B')).toBeInTheDocument();
    expect(screen.queryByText('Contenu 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Contenu 3')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Créneau' }).closest('section')).toHaveAttribute('aria-current', 'step');
  });

  it('rouvre une étape avec « Modifier » et y place le focus', async () => {
    render(<Parcours />);
    await userEvent.click(screen.getByRole('button', { name: 'Modifier : Choix' }));
    expect(screen.getByText('Contenu 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choix' })).toHaveFocus();
  });
});
