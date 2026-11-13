import { useState } from 'react';
import { Button, Dialog } from '@bsandoz/ui';
import { lienMaps, lienWaze, type Destination } from './liensItineraire';
import styles from './Itineraire.module.css';

/** Bouton « Itinéraire » : fenêtre pour choisir Google Maps ou Waze. */
export function BoutonItineraire({ destination, nom, libelle = 'Itinéraire' }: { destination: Destination; nom?: string; libelle?: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOuvert(true)} aria-label={nom ? `${libelle} vers ${nom}` : undefined}>{libelle}</Button>
      {ouvert && (
        <Dialog open title="Ouvrir l’itinéraire avec…" description={destination.address} onClose={() => setOuvert(false)}>
          <div className={styles.choix}>
            <a className={`btn ${styles.app}`} href={lienMaps(destination)} target="_blank" rel="noreferrer" onClick={() => setOuvert(false)}>Google Maps</a>
            <a className={`btn ${styles.app} ${styles.waze}`} href={lienWaze(destination)} target="_blank" rel="noreferrer" onClick={() => setOuvert(false)}>Waze</a>
          </div>
        </Dialog>
      )}
    </>
  );
}
