import { useState, type FormEvent } from 'react';
import { Button, Dialog, Field } from '@bsandoz/ui';
import { FERME, horairesParJour } from '../calculs/horaires';
import { enregistrerContenu, lireContenu, type ContenuSite, type Horaire } from '../services/api';
import styles from './Modification.module.css';

export type TexteModifiable = 'annonce' | 'accroche' | 'horaires';

/**
 * Enregistre un changement des infos du site. Le contenu est remplacé en entier par l'API : on relit d'abord
 * le contenu actuel (avis, photos…), pour ne renvoyer que ce changement par-dessus.
 */
async function enregistrer(changement: Partial<ContenuSite>) {
  const actuel = await lireContenu();
  await enregistrerContenu({ ...actuel, ...changement });
}

interface Props {
  texte: TexteModifiable;
  /** Valeurs affichées sur le site (point de départ de la saisie). */
  annonce: string;
  accroche: string;
  horaires: Horaire[];
  onFermer: () => void;
  /** Après l'enregistrement : le site relit son contenu. */
  onEnregistre: () => Promise<void>;
}

/** Fenêtre ouverte en touchant l'annonce, la phrase d'accueil ou les horaires du site. */
export function FenetreTexte({ texte, annonce, accroche, horaires, onFermer, onEnregistre }: Props) {
  const [valeur, setValeur] = useState(texte === 'annonce' ? annonce : accroche);
  // Une ligne par jour ; « Fermé » s'écrit en laissant vide.
  const [jours, setJours] = useState<Horaire[]>(() =>
    horairesParJour(horaires).map((h) => (h.heures === FERME ? { ...h, heures: '' } : h)));
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    if (texte === 'accroche' && !valeur.trim()) {
      setErreur('Écrivez une phrase d’accueil.');
      return;
    }
    setEnCours(true);
    setErreur('');
    try {
      await enregistrer(
        texte === 'horaires' ? { horaires: jours.map((h) => ({ jours: h.jours, heures: h.heures.trim() || FERME })) }
        : texte === 'annonce' ? { annonce: valeur.trim() }
        : { accroche: valeur.trim() },
      );
      await onEnregistre();
      onFermer();
    } catch (err) {
      setErreur(err instanceof Error && err.message ? err.message : 'L’enregistrement n’a pas abouti. Réessayez.');
    } finally {
      setEnCours(false);
    }
  };

  const titre = texte === 'annonce' ? 'Annonce en haut du site' : texte === 'accroche' ? 'Phrase d’accueil' : 'Horaires';

  return (
    <Dialog open title={titre} onClose={onFermer} closeLabel="Annuler">
      <form className={styles.formulaire} onSubmit={(e) => void envoyer(e)} noValidate>
        {texte === 'annonce' && (
          <Field label="Annonce (facultative)" hint="Par exemple : Fermé exceptionnellement lundi 24. Videz le champ pour la retirer."
            value={valeur} onChange={(e) => setValeur(e.target.value)} maxLength={200} />
        )}
        {texte === 'accroche' && (
          <Field label="Phrase d’accueil" multiline rows={3} value={valeur} onChange={(e) => setValeur(e.target.value)} maxLength={200} required />
        )}
        {texte === 'horaires' && (
          <fieldset className={styles.horaires}>
            <legend className={styles.aide}>Par exemple : 11 h 30 – 14 h 30 · 18 h – 22 h 30. Laissez vide un jour de fermeture.</legend>
            {jours.map((h, i) => (
              <Field key={h.jours} label={h.jours} value={h.heures} placeholder={FERME} maxLength={80}
                onChange={(e) => setJours((liste) => liste.map((l, j) => (j === i ? { ...l, heures: e.target.value } : l)))} />
            ))}
          </fieldset>
        )}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <Button type="submit" loading={enCours} loadingLabel="Enregistrement…">Enregistrer</Button>
      </form>
    </Dialog>
  );
}
