import { useEffect, useState } from 'react';
import { Button } from '@bsandoz/ui';
import { activerPush, desactiverPush, etatPush, type EtatPush } from '../../services/push';
import styles from './Pro.module.css';

const MESSAGES: Record<EtatPush, string> = {
  'non-pris-en-charge': 'Ce navigateur ne permet pas les notifications. Sur iPhone, ajoutez d’abord le site à l’écran d’accueil (Partager → Sur l’écran d’accueil), puis ouvrez-le depuis l’icône.',
  'non-configure': 'Les notifications ne sont pas encore configurées sur le site (clés à générer côté API).',
  refuse: 'Les notifications sont bloquées pour ce site : autorisez-les dans les réglages du navigateur, puis revenez ici.',
  inactif: 'Recevez une notification sur cet appareil à chaque nouveau rendez-vous, annulation ou déplacement.',
  actif: 'Les notifications sont activées sur cet appareil.',
};

/** Activer / désactiver les notifications push sur l'appareil utilisé (un réglage par appareil). */
export function NotificationsPro() {
  const [etat, setEtat] = useState<EtatPush>();
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => { etatPush().then(setEtat).catch(() => setEtat('non-configure')); }, []);

  const agir = async (action: () => Promise<EtatPush>) => {
    setErreur('');
    setEnCours(true);
    try {
      setEtat(await action());
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="titre-notifications">
      <h2 id="titre-notifications">Notifications sur cet appareil</h2>
      <div className={styles.panneau}>
        {etat === undefined ? <p aria-busy="true">Vérification…</p> : <p role="status">{MESSAGES[etat]}</p>}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <div className={styles.actions}>
          {etat === 'inactif' && <Button loading={enCours} onClick={() => agir(activerPush)}>Activer les notifications</Button>}
          {etat === 'actif' && <Button variant="secondary" loading={enCours} onClick={() => agir(desactiverPush)}>Désactiver sur cet appareil</Button>}
        </div>
      </div>
    </section>
  );
}
