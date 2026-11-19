import { useState, type FormEvent } from 'react';
import { duree, distance, estimerTrajets, type Point, type Trajets } from '../calculs/trajet';
import { crocs } from '../data/crocs';
import styles from './Trajet.module.css';

type Etat = { trajets: Trajets; depuis: string } | { erreur: string } | null;

/** Recherche d'une adresse (Base Adresse Nationale, service public) : seule l'adresse tapée est envoyée. */
async function chercherAdresse(texte: string): Promise<{ point: Point; libelle: string } | null> {
  const reponse = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(texte)}&limit=1`);
  if (!reponse.ok) return null;
  const donnees = (await reponse.json()) as { features?: { geometry: { coordinates: [number, number] }; properties: { label: string } }[] };
  const f = donnees.features?.[0];
  return f ? { point: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }, libelle: f.properties.label } : null;
}

/** « Croc's est à 10 min de chez vous » : depuis la position du visiteur (s'il l'accepte) ou une adresse tapée. */
export function Trajet() {
  const [etat, setEtat] = useState<Etat>(null);
  const [occupe, setOccupe] = useState(false);

  function localiser() {
    if (!navigator.geolocation) {
      setEtat({ erreur: 'Votre navigateur ne donne pas la position : tapez votre adresse.' });
      return;
    }
    setOccupe(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setOccupe(false);
        setEtat({ trajets: estimerTrajets({ lat: p.coords.latitude, lng: p.coords.longitude }, crocs.position), depuis: 'votre position' });
      },
      () => {
        setOccupe(false);
        setEtat({ erreur: 'Position refusée ou introuvable : tapez votre adresse.' });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  async function parAdresse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const texte = String(new FormData(e.currentTarget).get('adresse') ?? '').trim();
    if (texte.length < 3) return;
    setOccupe(true);
    try {
      const trouve = await chercherAdresse(texte);
      setEtat(trouve ? { trajets: estimerTrajets(trouve.point, crocs.position), depuis: trouve.libelle } : { erreur: 'Adresse introuvable. Essayez avec la ville.' });
    } catch {
      setEtat({ erreur: 'Recherche impossible pour le moment.' });
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className={styles.trajet}>
      <p className={styles.question}>À combien de temps êtes-vous ?</p>
      <div className={styles.actions}>
        <button type="button" className={styles.bouton} onClick={localiser} disabled={occupe}>Me localiser</button>
        <form className={styles.formulaire} onSubmit={parAdresse}>
          <label className={styles.sr} htmlFor="adresse-depart">Votre adresse</label>
          <input id="adresse-depart" name="adresse" placeholder="ou votre adresse" autoComplete="street-address" />
          <button className={styles.boutonSecondaire} disabled={occupe}>Calculer</button>
        </form>
      </div>
      <div aria-live="polite">
        {etat && 'trajets' in etat && (
          <div className={styles.resultat}>
            <p className={styles.phrase}>
              Croc’s est à <strong>{duree(etat.trajets.voiture)}</strong> de chez vous en voiture.
            </p>
            <ul className={styles.modes}>
              <li>{duree(etat.trajets.voiture)} <span className={styles.mode}>en voiture</span></li>
              <li>{duree(etat.trajets.velo)} <span className={styles.mode}>à vélo</span></li>
              <li>{duree(etat.trajets.pied)} <span className={styles.mode}>à pied</span></li>
            </ul>
            <p className={styles.note}>Estimation depuis {etat.depuis}, environ {distance(etat.trajets.distanceM)} par la route. Votre position reste sur votre appareil.</p>
          </div>
        )}
        {etat && 'erreur' in etat && <p className={styles.erreur} role="alert">{etat.erreur}</p>}
      </div>
    </div>
  );
}
