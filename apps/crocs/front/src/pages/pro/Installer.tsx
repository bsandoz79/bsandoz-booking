import { useEffect, useState } from 'react';
import { Button } from '@bsandoz/ui';
import styles from '../EspacePro.module.css';
import { dejaInstallee, surIphone } from './appli';

/** Événement Chrome / Android qui permet d'afficher la demande d'installation au bon moment. */
interface DemandeInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * « Mettre sur mon téléphone » : sur Android, un bouton installe l'appli ; sur iPhone, les deux gestes à faire.
 * Rien si l'espace est déjà ouvert depuis l'icône.
 */
export function Installer() {
  const [demande, setDemande] = useState<DemandeInstallation>();
  const [installee, setInstallee] = useState(dejaInstallee);
  const [aide, setAide] = useState(false);

  useEffect(() => {
    const garder = (e: Event) => {
      e.preventDefault();
      setDemande(e as DemandeInstallation);
    };
    const fini = () => setInstallee(true);
    window.addEventListener('beforeinstallprompt', garder);
    window.addEventListener('appinstalled', fini);
    return () => {
      window.removeEventListener('beforeinstallprompt', garder);
      window.removeEventListener('appinstalled', fini);
    };
  }, []);

  if (installee) return null;

  const installer = async () => {
    if (!demande) {
      setAide(true);
      return;
    }
    await demande.prompt();
    if ((await demande.userChoice).outcome === 'accepted') setInstallee(true);
    setDemande(undefined);
  };

  return (
    <section className={styles.installer} aria-labelledby="installer-titre">
      <h2 id="installer-titre">Votre espace sur votre téléphone</h2>
      <p>Une icône Croc’s sur l’écran d’accueil, qui ouvre directement votre espace, comme une appli.</p>
      {surIphone() ? (
        <p>
          Dans Safari, touchez <strong>Partager</strong> (le carré avec une flèche vers le haut),
          puis <strong>Sur l’écran d’accueil</strong>.
        </p>
      ) : (
        <>
          <Button onClick={() => void installer()}>Mettre sur mon téléphone</Button>
          {aide && (
            <p role="status">
              Ouvrez le menu du navigateur (les trois points en haut à droite),
              puis <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.
            </p>
          )}
        </>
      )}
    </section>
  );
}
