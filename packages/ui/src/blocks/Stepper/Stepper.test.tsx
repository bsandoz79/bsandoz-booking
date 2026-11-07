import { render, screen } from '@testing-library/react';
import { Stepper } from './Stepper';

describe('Stepper', () => {
  it('marque l’étape courante', () => {
    render(<Stepper steps={['Véhicule', 'Formule', 'Créneau']} current={1} />);
    expect(screen.getByText('Formule').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});
