import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { seConnecter, seDeconnecter } from '../../services/compte';
import { FacturesOnglet } from '../EspacePro/Factures';
import { FactureVue } from './Facture';

describe('Factures', () => {
  afterEach(async () => { await seDeconnecter(); });

  it('demande de se connecter pour voir une facture', async () => {
    render(<MemoryRouter initialEntries={['/facture/facture-demo']}><Routes><Route path="/facture/:id" element={<FactureVue />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Connectez-vous pour voir votre facture.')).toBeInTheDocument();
  });

  it('affiche une facture imprimable avec ses lignes, le total et les mentions', async () => {
    await seConnecter('pro@example.org', 'motdepasse12');
    render(<MemoryRouter initialEntries={['/facture/facture-demo']}><Routes><Route path="/facture/:id" element={<FactureVue />} /></Routes></MemoryRouter>);
    const facture = await screen.findByRole('article', { name: 'Facture F-2026-0001' });
    expect(within(facture).getByRole('row', { name: /Intérieur Signature/ })).toHaveTextContent('69,00');
    expect(within(facture).getByRole('row', { name: /Total/ })).toHaveTextContent('79,00');
    expect(facture).toHaveTextContent('SIRET : [à compléter]');
    expect(facture).toHaveTextContent('TVA non applicable, art. 293 B du CGI');
    expect(facture).toHaveTextContent('Facture acquittée');
    expect(screen.getByRole('button', { name: 'Imprimer ou enregistrer en PDF' })).toBeInTheDocument();
  });

  it('espace pro : informations du vendeur et liste des factures', async () => {
    render(<MemoryRouter><FacturesOnglet /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: 'F-2026-0001' })).toHaveAttribute('href', '/facture/facture-demo');
    await userEvent.type(screen.getByLabelText('SIRET'), '12345678900012');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Informations de facturation enregistrées.');
  });
});
