import { Link } from 'react-router-dom';

export function Confirmation() {
  return (
    <main className="container" style={{ paddingBlock: '3rem' }}>
      <h1>Merci, votre rendez-vous est réservé.</h1>
      <p>Vous allez recevoir un e-mail de confirmation avec le récapitulatif et un lien pour créer votre mot de passe.</p>
      <p><Link to="/">Retour à l'accueil</Link></p>
    </main>
  );
}
