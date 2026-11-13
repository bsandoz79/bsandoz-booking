import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@bsandoz/ui';
import { seDesinscrire } from '../../services/relance';
import { useSeo } from '../../seo/useSeo';

/**
 * Désinscription des e-mails de relance (lien en bas de l'e-mail). Un clic est demandé : les outils qui ouvrent les
 * liens d'un e-mail à l'avance ne désinscrivent donc personne par erreur.
 */
export function Desinscription() {
  useSeo('Désinscription | Perfect Clean');
  const [params] = useSearchParams();
  const u = params.get('u') ?? '';
  const s = params.get('s') ?? '';
  const [etat, setEtat] = useState<'' | 'en_cours' | 'ok' | 'erreur'>('');

  const confirmer = async () => {
    setEtat('en_cours');
    try { await seDesinscrire(u, s); setEtat('ok'); } catch { setEtat('erreur'); }
  };

  return (
    <main className="container" style={{ paddingBlock: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '40rem' }}>
      <h1>Ne plus recevoir de rappels</h1>
      {etat === 'ok' ? (
        <p role="status">C’est fait : vous ne recevrez plus d’e-mail de rappel pour reprendre rendez-vous. Les e-mails liés à vos rendez-vous (confirmation, facture) continuent d’arriver.</p>
      ) : !u || !s ? (
        <p role="alert">Ce lien est incomplet. Utilisez le lien « Se désinscrire » de l’e-mail reçu.</p>
      ) : (
        <>
          <p>Vous ne recevrez plus d’e-mail vous proposant de reprendre rendez-vous. Les e-mails liés à vos rendez-vous (confirmation, rappel de la veille, facture) continuent d’arriver.</p>
          {etat === 'erreur' && <p role="alert">Ce lien de désinscription n’est pas valable. Contactez-moi si le problème persiste.</p>}
          <div><Button onClick={confirmer} loading={etat === 'en_cours'}>Confirmer la désinscription</Button></div>
        </>
      )}
      <p><Link to="/">Retour à l’accueil</Link></p>
    </main>
  );
}
