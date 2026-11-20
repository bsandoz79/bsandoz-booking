import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Dialog, Field } from '@bsandoz/ui';
import { photos as photosIntegrees } from '../../data/crocs';
import { envoyerPhoto, supprimerPhoto, type PhotoSite } from '../../services/api';
import { reduirePhoto } from '../../services/photo';
import styles from '../EspacePro.module.css';
import { deplacer, Retirer } from './outils';
import { useContenuPro } from './useContenuPro';

/** Onglet « Photos » : photos du bas du site, prises au téléphone ; au-delà de 3, elles défilent. */
export function MesPhotos() {
  const { contenu, erreurLecture, enregistrer } = useContenuPro();
  const [choisie, setChoisie] = useState<File>();
  const [message, setMessage] = useState('');

  if (erreurLecture) return <p className={styles.erreur} role="alert">Les photos n’ont pas pu être chargées. Rechargez la page.</p>;
  if (!contenu) return <p role="status">Chargement…</p>;

  const liste = contenu.photos ?? photosIntegrees;
  const sauver = async (nouvelle: PhotoSite[]) => {
    setMessage('');
    try {
      await enregistrer({ photos: nouvelle });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'L’enregistrement n’a pas abouti.');
    }
  };

  const choisir = (e: ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (fichier) setChoisie(fichier);
  };

  return (
    <div className={styles.pile}>
      <p className={styles.aide}>
        Ces photos s’affichent en bas du site : 3 à la fois, et au-delà elles défilent. Prenez-les à la lumière du jour,
        sans personne reconnaissable sans son accord.
      </p>
      <label className={styles.boutonFichier}>
        + Ajouter une photo
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choisir} />
      </label>
      {message && <p className={styles.erreur} role="alert">{message}</p>}
      {liste.length === 0 && <p>Aucune photo : la rubrique est cachée sur le site.</p>}
      <ul className={styles.liste} aria-label="Photos affichées sur le site">
        {liste.map((p, i) => (
          <li key={p.url} className={styles.ligne}>
            <img src={p.url} alt="" className={styles.miniature} />
            <p className={styles.ligneTexte}>{p.description}</p>
            <div className={styles.ligneBoutons}>
              <Button variant="ghost" disabled={i === 0} onClick={() => void sauver(deplacer(liste, i, -1))} aria-label={`Monter la photo « ${p.description} »`}>↑</Button>
              <Button variant="ghost" disabled={i === liste.length - 1} onClick={() => void sauver(deplacer(liste, i, 1))} aria-label={`Descendre la photo « ${p.description} »`}>↓</Button>
              <Retirer
                nom={`la photo « ${p.description} »`}
                onRetirer={async () => {
                  await sauver(liste.filter((_, j) => j !== i));
                  // Le fichier envoyé est supprimé aussi (les photos de départ restent sur le serveur).
                  if (p.nom) await supprimerPhoto(p.nom).catch(() => undefined);
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      {choisie && (
        <FichePhoto
          fichier={choisie}
          onFermer={() => setChoisie(undefined)}
          onEnregistrer={async (photo) => {
            await enregistrer({ photos: [...liste, photo] });
            setChoisie(undefined);
          }}
        />
      )}
    </div>
  );
}

function FichePhoto({ fichier, onFermer, onEnregistrer }: { fichier: File; onFermer: () => void; onEnregistrer: (p: PhotoSite) => Promise<void> }) {
  const [description, setDescription] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [apercu, setApercu] = useState<string>();

  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return;
    const url = URL.createObjectURL(fichier);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErreur('Décrivez la photo en quelques mots.');
      return;
    }
    setEnCours(true);
    setErreur('');
    try {
      const reduite = await reduirePhoto(fichier);
      const envoi = await envoyerPhoto(reduite, reduite === fichier ? fichier.name : 'photo.jpg');
      await onEnregistrer({ url: envoi.url, nom: envoi.name, description: description.trim() });
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'L’envoi n’a pas abouti. Réessayez.');
      setEnCours(false);
    }
  };

  return (
    <Dialog open title="Ajouter une photo" onClose={onFermer} closeLabel="Annuler">
      <form className={styles.formulaire} onSubmit={(e) => void envoyer(e)} noValidate>
        {apercu && <img src={apercu} alt="" className={styles.apercu} />}
        <Field
          label="Que montre la photo ?"
          hint="Quelques mots, lus aux personnes malvoyantes. Par exemple : Le comptoir et la carte au mur."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={120}
        />
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <Button type="submit" loading={enCours} loadingLabel="Envoi…">Ajouter la photo</Button>
      </form>
    </Dialog>
  );
}
