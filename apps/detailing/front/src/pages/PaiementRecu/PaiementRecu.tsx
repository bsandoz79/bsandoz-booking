import { Link, useSearchParams } from 'react-router-dom';
import { useSeo } from '../../seo/useSeo';
import { Icone } from '../../components/Icone/Icone';

/**
 * Retour du client après le paiement sur place par QR code (sur son propre téléphone) : merci, ou paiement abandonné.
 * La facture part par e-mail dès que le paiement est confirmé.
 */
export function PaiementRecu() {
  useSeo('Paiement | Perfect Clean');
  const [params] = useSearchParams();
  const annule = params.get('annule') === '1';

  return (
    <main className="container" style={{ paddingBlock: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '36rem', textAlign: 'center' }}>
      {annule ? (
        <>
          <h1>Paiement non effectué</h1>
          <p role="status">Rien n’a été débité. Vous pouvez scanner de nouveau le code pour réessayer, ou régler autrement sur place.</p>
        </>
      ) : (
        <>
          <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 72, height: 72, borderRadius: '50%', background: '#e3f4ea', color: '#13794a' }}>
            <Icone nom="coche" taille={34} />
          </span>
          <h1>Merci, paiement reçu</h1>
          <p role="status">Votre facture vous est envoyée par e-mail. À bientôt !</p>
        </>
      )}
      <p><Link to="/">Retour à l’accueil</Link></p>
    </main>
  );
}
