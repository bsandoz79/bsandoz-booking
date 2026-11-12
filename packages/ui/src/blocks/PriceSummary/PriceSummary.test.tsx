import { render, screen } from '@testing-library/react';
import { PriceSummary, formatEuros } from './PriceSummary';

describe('PriceSummary', () => {
  it('formate les euros à la française', () => {
    expect(formatEuros(12600).replace(/\s/g, ' ')).toBe('126,00 €');
  });
  it('affiche total et acompte', () => {
    render(<PriceSummary lines={[{ label: 'Prestation grand format', amountCents: 9900 }]} totalCents={9900} depositCents={2970} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Acompte à la réservation')).toBeInTheDocument();
  });
});
