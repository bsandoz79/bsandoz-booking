import { useState } from 'react';
import { Button, Dialog } from '@bsandoz/ui';
import { Icone } from '../Icone/Icone';
import { lienMaps, lienWaze, type Destination } from './liensItineraire';
import styles from './Itineraire.module.css';

/** Bouton « Itinéraire » (icône de trajet) : fenêtre pour choisir Google Maps ou Waze, chacun avec son logo. */
export function BoutonItineraire({ destination, nom, libelle = 'Itinéraire' }: { destination: Destination; nom?: string; libelle?: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOuvert(true)} aria-label={nom ? `${libelle} vers ${nom}` : undefined}>
        <span className={styles.libelle}><Icone nom="itineraire" taille={18} />{libelle}</span>
      </Button>
      {ouvert && (
        <Dialog open title="Ouvrir l’itinéraire avec…" description={destination.address} onClose={() => setOuvert(false)}>
          <div className={styles.choix}>
            <a className={`btn ${styles.app} ${styles.maps}`} href={lienMaps(destination)} target="_blank" rel="noreferrer" onClick={() => setOuvert(false)}>
              <LogoMaps /> Google Maps
            </a>
            <a className={`btn ${styles.app} ${styles.waze}`} href={lienWaze(destination)} target="_blank" rel="noreferrer" onClick={() => setOuvert(false)}>
              <LogoWaze /> Waze
            </a>
          </div>
        </Dialog>
      )}
    </>
  );
}

/** Repère de Google Maps (épingle aux quatre couleurs), pour reconnaître l'application d'un coup d'œil. */
function LogoMaps() {
  return (
    <svg className={styles.logo} viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="epingle-maps"><path d="M12 1.5a7.6 7.6 0 0 0-7.6 7.6c0 5.6 7.6 13.4 7.6 13.4s7.6-7.8 7.6-13.4A7.6 7.6 0 0 0 12 1.5Z" /></clipPath>
      </defs>
      <g clipPath="url(#epingle-maps)">
        <rect x="0" y="0" width="24" height="24" fill="#34A853" />
        <path d="M0 0h12.5L4 12.5H0Z" fill="#1A73E8" />
        <path d="M12.5 0H24v4L8 16.5 4 12.5Z" fill="#EA4335" />
        <path d="M24 4v8L13 20.5l-5-4Z" fill="#FBBC04" />
      </g>
      <circle cx="12" cy="9.1" r="2.9" fill="#fff" />
    </svg>
  );
}

/** Repère de Waze (petit fantôme souriant sur roues), pour reconnaître l'application d'un coup d'œil. */
function LogoWaze() {
  return (
    <svg className={styles.logo} viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
      <path d="M12.6 3.2c4.7 0 8.4 3.4 8.4 7.7 0 3.1-1.9 5.5-4.8 6.7H8.6c-1.6-.7-2.7-1.6-3.5-2.9-1.4-.2-2.6-1-2.7-2.3.8.1 1.7-.2 2-1.1.4-1.3.4-2.2 1-3.4 1.4-2.9 4.1-4.7 7.2-4.7Z"
        fill="#fff" stroke="#0b2530" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="10.4" cy="9.4" r="1" fill="#0b2530" />
      <circle cx="15.2" cy="9.4" r="1" fill="#0b2530" />
      <path d="M9.6 12.3c.9 1.4 2.1 2 3.1 2s2.2-.6 3.1-2" fill="none" stroke="#0b2530" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9" cy="18.8" r="2" fill="#0b2530" />
      <circle cx="16.2" cy="18.8" r="2" fill="#0b2530" />
    </svg>
  );
}
