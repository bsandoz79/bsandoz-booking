import { useEffect, useMemo } from 'react';
import { lienGoogleAgenda, lienIcs, type EvenementAgenda } from '../../app/agenda';
import styles from './AjouterAgenda.module.css';

/** Boutons « Ajouter à mon agenda » : Google Agenda (nouvel onglet) et fichier .ics pour Apple Calendrier ou Outlook. */
export function AjouterAgenda({ evenement, titre = 'Ajouter à mon agenda' }: { evenement: EvenementAgenda; titre?: string }) {
  // Fichier créé dans le navigateur (aucune donnée envoyée), libéré quand la page change.
  const ics = useMemo(() => (typeof URL.createObjectURL === 'function' ? lienIcs(evenement) : undefined), [evenement]);
  useEffect(() => () => { if (ics) URL.revokeObjectURL(ics); }, [ics]);

  return (
    <div className={styles.agenda} role="group" aria-label={titre}>
      <span className={styles.titre}><span aria-hidden="true">📅</span> {titre}</span>
      <div className={styles.boutons}>
        <a className="btn btn--ghost" href={lienGoogleAgenda(evenement)} target="_blank" rel="noreferrer">Google Agenda</a>
        {ics && <a className="btn btn--ghost" href={ics} download="rendez-vous.ics">Apple / Outlook</a>}
      </div>
    </div>
  );
}
