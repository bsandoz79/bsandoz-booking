import { Link, useSearchParams } from 'react-router-dom';

/** Retour après paiement en ligne (Stripe renvoie sur `/confirmation?reservation=…`) ou réservation payée sur place. */
export function Confirmation() {
  const [params] = useSearchParams();
  const demo = params.get('demo') === '1';

  return (
    <main className="container" style={{ paddingBlock: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h1>Merci, votre rendez-vous est réservé.</h1>
      <p>Dès que votre réservation est confirmée (aussitôt si vous payez sur place, au paiement si vous payez en ligne), vous recevez un e-mail de confirmation avec le récapitulatif, l'invitation à ajouter à votre agenda et un lien pour gérer votre rendez-vous.</p>
      <p>Lors de votre première réservation, un second e-mail vous permet de choisir votre mot de passe pour accéder à votre espace client.</p>
      {demo && <p role="note"><strong>Mode démonstration :</strong> aucun paiement n'a été effectué et aucun rendez-vous n'a été enregistré.</p>}
      <p><Link to="/">Retour à l'accueil</Link></p>
    </main>
  );
}
