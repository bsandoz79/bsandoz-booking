import { useEffect, useState } from 'react';
import { Button } from '@bsandoz/ui';
import { createur } from '../../data/createur';
import { enregistrerContenu, lireContenu } from '../../services/api';
import styles from '../EspacePro.module.css';

/**
 * Demande d'avis Google pour le créateur du site, en haut de l'espace pro. Google ne dit pas qui a laissé un avis :
 * le bloc reste affiché jusqu'à ce que le patron touche « C'est fait » (gardé dans le contenu du site, donc sur tous
 * ses appareils). Rien n'est affiché tant que le lien de la fiche Google n'est pas renseigné (`createur.avisGoogle`).
 */
export function AvisCreateur() {
  const [afficher, setAfficher] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!createur.avisGoogle) return;
    let actif = true;
    void lireContenu()
      .then((c) => { if (actif) setAfficher(c.avisCreateurLaisse !== true); })
      .catch(() => undefined);
    return () => { actif = false; };
  }, []);

  if (!afficher) return null;

  const cestFait = async () => {
    setEnCours(true);
    setErreur('');
    try {
      // Le contenu est remplacé en entier par l'API : on relit l'actuel pour ne changer que ce réglage.
      await enregistrerContenu({ ...(await lireContenu()), avisCreateurLaisse: true });
      setAfficher(false);
    } catch {
      setErreur('Ça n’a pas pu être enregistré. Réessayez.');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <aside className={styles.avisCreateur} aria-labelledby="avis-createur-titre">
      <h2 id="avis-createur-titre">Le site vous plaît ?</h2>
      <p>Laissez-moi un avis sur Google : c’est ce qui m’aide le plus à me faire connaître. Ça prend une minute.</p>
      <div className={styles.avisCreateurBoutons}>
        <a href={createur.avisGoogle} target="_blank" rel="noopener noreferrer" className={styles.avisCreateurLien}>
          Laisser un avis à {createur.nom}
        </a>
        <Button variant="ghost" loading={enCours} loadingLabel="Enregistrement…" onClick={() => void cestFait()}>
          C’est fait, j’ai laissé un avis
        </Button>
      </div>
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
    </aside>
  );
}
