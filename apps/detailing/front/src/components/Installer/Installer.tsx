import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '@bsandoz/ui';
import { estAppareilApple, useInstallation } from '../../pwa/installation';
import { Icone } from '../Icone/Icone';
import styles from './Installer.module.css';

/**
 * « Installer l'application » : ajoute le site sur l'écran d'accueil du téléphone, avec son icône, et l'ouvre en plein
 * écran comme une application. Invitation du navigateur quand il en propose une (Android, ordinateur) ; sinon (iPhone,
 * Firefox…) une fenêtre explique les deux gestes à faire. Masqué quand le site est déjà ouvert depuis l'icône.
 */
export function Installer({ className, onAction }: { className?: string; onAction?: () => void }) {
  const { visible, installer } = useInstallation();
  const [aide, setAide] = useState(false);
  if (!visible) return null;
  const apple = estAppareilApple();

  const cliquer = async () => {
    onAction?.();
    if (!(await installer())) setAide(true);
  };

  return (
    <>
      <button type="button" className={className} onClick={() => { void cliquer(); }}>
        <Icone nom="telecharger" taille={18} /> Installer l’application
      </button>
      {/* Hors du menu (qui se referme au clic) : la fenêtre est rattachée à la page. */}
      {aide && createPortal(
        <Dialog open title="Installer Perfect Clean sur votre téléphone" description="L’icône apparaîtra sur votre écran d’accueil, comme une application." onClose={() => setAide(false)}>
          <ol className={styles.etapes}>
            {apple ? (
              <>
                <li>Dans Safari, touchez le bouton <strong>Partager</strong> <IconePartager /> en bas de l’écran.</li>
                <li>Choisissez <strong>« Sur l’écran d’accueil »</strong>, puis <strong>« Ajouter »</strong>.</li>
              </>
            ) : (
              <>
                <li>Ouvrez le menu du navigateur <strong aria-label="trois points">⋮</strong> (en haut ou en bas à droite).</li>
                <li>Choisissez <strong>« Installer l’application »</strong> ou <strong>« Ajouter à l’écran d’accueil »</strong>.</li>
              </>
            )}
          </ol>
          <button type="button" className="btn" onClick={() => setAide(false)}>J’ai compris</button>
        </Dialog>,
        document.body,
      )}
    </>
  );
}

/** Icône « Partager » de Safari (carré avec une flèche vers le haut). */
function IconePartager() {
  return (
    <svg className={styles.partager} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
