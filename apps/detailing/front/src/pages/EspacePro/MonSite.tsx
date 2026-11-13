import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@bsandoz/ui';
import { useContenu } from '../../app/contenuContexte';
import { enregistrerContenu, type ContenuSite } from '../../services/contenu';
import { ChampsRubrique } from './RubriquesSite';
import { TITRES_RUBRIQUES, type RubriqueSite } from './titresRubriques';
import styles from './Pro.module.css';


/** « Mon site » : tous les textes, coordonnées, avis, photos et informations légales du site, modifiables sans toucher au code. */
export function MonSiteOnglet() {
  const { contenu: initial, remplacer } = useContenu();
  const [c, setC] = useState<ContenuSite>(initial);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(''); setErreur(''); setEnCours(true);
    try {
      const enregistre = await enregistrerContenu(c);
      remplacer(enregistre);
      setC(enregistre);
      setMessage('Site mis à jour : les modifications sont visibles tout de suite.');
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  const boutonEnregistrer = <Button type="submit" loading={enCours} loadingLabel="Enregistrement…">Enregistrer les modifications</Button>;

  return (
    <form className={styles.section} onSubmit={enregistrer} noValidate aria-labelledby="titre-mon-site">
      <div className={styles.actions} style={{ justifyContent: 'space-between' }}>
        <h2 id="titre-mon-site">Mon site</h2>
        {boutonEnregistrer}
      </div>
      <p className={styles.aide}>Tout ce qui est affiché sur le site se modifie ici. Laissez « [à compléter] » tant qu’une information n’est pas connue : ne publiez que des avis réels.</p>
      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      {(Object.keys(TITRES_RUBRIQUES) as RubriqueSite[]).map((r) => (
        <Rubrique key={r} titre={TITRES_RUBRIQUES[r]}><ChampsRubrique rubrique={r} c={c} setC={setC} onErreur={setErreur} /></Rubrique>
      ))}

      <div>{boutonEnregistrer}</div>
    </form>
  );
}

function Rubrique({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <fieldset className={styles.panneau} style={{ margin: 0 }}>
      <legend style={{ fontWeight: 700, fontSize: '1.1rem', padding: '0 .25rem' }}>{titre}</legend>
      {children}
    </fieldset>
  );
}
