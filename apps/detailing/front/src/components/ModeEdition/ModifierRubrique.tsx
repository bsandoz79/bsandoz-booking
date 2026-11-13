import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, Dialog } from '@bsandoz/ui';
import { useContenu } from '../../app/contenuContexte';
import { useModeEdition } from '../../app/modeEditionContexte';
import { enregistrerContenu } from '../../services/contenu';
import { ChampsRubrique } from '../../pages/EspacePro/RubriquesSite';
import { TITRES_RUBRIQUES, type RubriqueSite } from '../../pages/EspacePro/titresRubriques';
import { Crayon } from './BoutonModifier';
import styles from './ModeEdition.module.css';

/** Crayon « Modifier » d'une rubrique du contenu (textes, étapes, FAQ…) : fenêtre avec ses champs, enregistrée aussitôt. */
export function ModifierRubrique({ rubrique, libelle }: { rubrique: RubriqueSite; libelle?: string }) {
  const { actif } = useModeEdition();
  const { contenu, remplacer } = useContenu();
  const [copie, setCopie] = useState(contenu);
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  if (!actif) return null;

  const titre = libelle ?? TITRES_RUBRIQUES[rubrique];
  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(''); setEnCours(true);
    try {
      remplacer(await enregistrerContenu(copie));
      setOuvert(false);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <>
      <Crayon libelle={`Modifier : ${titre}`} onClick={() => { setCopie(contenu); setErreur(''); setOuvert(true); }} />
      {ouvert && (
        <Dialog open title={titre} description="Les changements sont visibles tout de suite sur le site." onClose={() => setOuvert(false)}>
          <form className={styles.formulaire} onSubmit={enregistrer} noValidate>
            <ChampsRubrique rubrique={rubrique} c={copie} setC={setCopie} onErreur={setErreur} />
            {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
            <div className={styles.boutons}>
              <Button type="submit" loading={enCours} loadingLabel="Enregistrement…">Enregistrer</Button>
              <Button variant="ghost" onClick={() => setOuvert(false)}>Annuler</Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

/**
 * Crayon qui ouvre un réglage de l'espace pro dans une fenêtre (horaires, zone, fidélité…), sans quitter le site.
 * `apresFermeture` : pour recharger ce que la page affiche.
 */
export function ModifierAvec({ titre, children, apresFermeture }: { titre: string; children: ReactNode; apresFermeture?: () => void }) {
  const { actif } = useModeEdition();
  const [ouvert, setOuvert] = useState(false);
  if (!actif) return null;
  const fermer = () => { setOuvert(false); apresFermeture?.(); };
  return (
    <>
      <Crayon libelle={`Modifier : ${titre}`} onClick={() => setOuvert(true)} />
      {ouvert && (
        <Dialog open title={titre} description="Enregistrez dans la fenêtre, puis fermez-la : le site se met à jour." onClose={fermer}
          actions={<Button variant="ghost" onClick={fermer}>Fermer</Button>}>
          <div className={styles.formulaire}>{children}</div>
        </Dialog>
      )}
    </>
  );
}
