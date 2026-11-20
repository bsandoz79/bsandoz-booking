import { useState, type FormEvent } from 'react';
import { Button, Dialog, Field } from '@bsandoz/ui';
import { avis as avisIntegres } from '../../data/crocs';
import type { AvisSite } from '../../services/api';
import styles from '../EspacePro.module.css';
import { deplacer, Retirer } from './outils';
import { useContenuPro } from './useContenuPro';

/** Onglet « Avis » : le patron recopie les avis de ses clients ; au-delà de 3, ils défilent sur le site. */
export function MesAvis() {
  const { contenu, erreurLecture, enregistrer } = useContenuPro();
  const [fiche, setFiche] = useState<{ index: number | null }>();
  const [message, setMessage] = useState('');

  if (erreurLecture) return <p className={styles.erreur} role="alert">Les avis n’ont pas pu être chargés. Rechargez la page.</p>;
  if (!contenu) return <p role="status">Chargement…</p>;

  // Tant que le patron n'a rien changé, on part des avis affichés sur le site.
  const liste = contenu.avis ?? avisIntegres;
  const sauver = async (nouvelle: AvisSite[]) => {
    setMessage('');
    try {
      await enregistrer({ avis: nouvelle });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'L’enregistrement n’a pas abouti.');
    }
  };

  return (
    <div className={styles.pile}>
      <p className={styles.aide}>
        Recopiez les avis que vos clients ont laissés (Google, Facebook, livre d’or…), tels qu’ils les ont écrits.
        Sur le site, 3 avis sont visibles à la fois ; au-delà, ils défilent.
      </p>
      <Button onClick={() => setFiche({ index: null })}>+ Ajouter un avis</Button>
      {message && <p className={styles.erreur} role="alert">{message}</p>}
      {liste.length === 0 && <p>Aucun avis : la rubrique est cachée sur le site.</p>}
      <ul className={styles.liste} aria-label="Avis affichés sur le site">
        {liste.map((a, i) => (
          <li key={i} className={styles.ligne}>
            <div className={styles.ligneTexte}>
              <p className={styles.etoiles} aria-label={`${a.note} sur 5`}>{'★'.repeat(a.note)}</p>
              <p>« {a.texte} »</p>
              <p className={styles.aide}><strong>{a.auteur}</strong>{a.quand && `, ${a.quand}`}{a.source && ` · sur ${a.source}`}</p>
            </div>
            <div className={styles.ligneBoutons}>
              <Button variant="ghost" onClick={() => setFiche({ index: i })} aria-label={`Modifier l’avis de ${a.auteur}`}>Modifier</Button>
              <Button variant="ghost" disabled={i === 0} onClick={() => void sauver(deplacer(liste, i, -1))} aria-label={`Monter l’avis de ${a.auteur}`}>↑</Button>
              <Button variant="ghost" disabled={i === liste.length - 1} onClick={() => void sauver(deplacer(liste, i, 1))} aria-label={`Descendre l’avis de ${a.auteur}`}>↓</Button>
              <Retirer nom={`l’avis de ${a.auteur}`} onRetirer={() => sauver(liste.filter((_, j) => j !== i))} />
            </div>
          </li>
        ))}
      </ul>
      {fiche && (
        <FicheAvis
          avis={fiche.index === null ? undefined : liste[fiche.index]}
          onFermer={() => setFiche(undefined)}
          onEnregistrer={async (a) => {
            await enregistrer({ avis: fiche.index === null ? [a, ...liste] : liste.map((x, j) => (j === fiche.index ? a : x)) });
            setFiche(undefined);
          }}
        />
      )}
    </div>
  );
}

function FicheAvis({ avis, onFermer, onEnregistrer }: { avis?: AvisSite; onFermer: () => void; onEnregistrer: (a: AvisSite) => Promise<void> }) {
  const [auteur, setAuteur] = useState(avis?.auteur ?? '');
  const [note, setNote] = useState(avis?.note ?? 5);
  const [texte, setTexte] = useState(avis?.texte ?? '');
  const [quand, setQuand] = useState(avis?.quand ?? '');
  const [source, setSource] = useState(avis?.source ?? '');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    if (!auteur.trim() || !texte.trim()) {
      setErreur('Indiquez le nom du client et son avis.');
      return;
    }
    setEnCours(true);
    setErreur('');
    try {
      const saisi: AvisSite = { auteur: auteur.trim(), note, texte: texte.trim() };
      if (quand.trim()) saisi.quand = quand.trim();
      if (source.trim()) saisi.source = source.trim();
      await onEnregistrer(saisi);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'L’enregistrement n’a pas abouti.');
      setEnCours(false);
    }
  };

  return (
    <Dialog open title={avis ? 'Modifier l’avis' : 'Ajouter un avis'} onClose={onFermer} closeLabel="Annuler">
      <form className={styles.formulaire} onSubmit={(e) => void envoyer(e)} noValidate>
        <Field label="Nom du client" hint="Comme il apparaît sur l’avis, par exemple Amanda ou Karim B." value={auteur} onChange={(e) => setAuteur(e.target.value)} required maxLength={60} />
        <div className={styles.choix}>
          <label htmlFor="avis-note">Note</label>
          <select id="avis-note" value={note} onChange={(e) => setNote(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{`${'★'.repeat(n)} (${n} sur 5)`}</option>)}
          </select>
        </div>
        <Field label="Avis" multiline rows={4} value={texte} onChange={(e) => setTexte(e.target.value)} required maxLength={600} />
        <Field label="Quand (facultatif)" placeholder="mars 2026" value={quand} onChange={(e) => setQuand(e.target.value)} maxLength={40} />
        <Field label="Publié sur (facultatif)" placeholder="Google" value={source} onChange={(e) => setSource(e.target.value)} maxLength={40} />
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <Button type="submit" loading={enCours} loadingLabel="Enregistrement…">Enregistrer</Button>
      </form>
    </Dialog>
  );
}
