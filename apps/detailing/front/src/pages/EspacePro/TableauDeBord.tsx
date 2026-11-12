import { useEffect, useState } from 'react';
import { formatEuros } from '@bsandoz/ui';
import { tableauDeBord, type TableauDeBord } from '../../services/pro';
import { dateHeure } from './dates';
import styles from './Pro.module.css';

export function TableauDeBordOnglet() {
  const [tdb, setTdb] = useState<TableauDeBord>();
  const [erreur, setErreur] = useState('');

  useEffect(() => { tableauDeBord().then(setTdb).catch((e: Error) => setErreur(e.message)); }, []);

  if (erreur) return <p className={styles.erreur} role="alert">{erreur}</p>;
  if (!tdb) return <p aria-busy="true">Chargement…</p>;

  const tuiles = [
    { valeur: String(tdb.today), libelle: 'Rendez-vous aujourd’hui' },
    { valeur: String(tdb.week), libelle: 'Rendez-vous cette semaine' },
    { valeur: formatEuros(tdb.monthRevenueCents), libelle: 'Chiffre d’affaires du mois (rendez-vous confirmés)' },
    { valeur: String(tdb.monthBookings), libelle: 'Rendez-vous ce mois-ci' },
    { valeur: String(tdb.pendingPayments), libelle: 'Acomptes en attente' },
    { valeur: `${Math.round(tdb.monthCancellationRate * 100)} %`, libelle: 'Taux d’annulation du mois' },
  ];

  return (
    <section className={styles.section} aria-labelledby="titre-tdb">
      <h2 id="titre-tdb">Tableau de bord</h2>
      <div className={styles.tuiles}>
        {tuiles.map((t) => (
          <div key={t.libelle} className={styles.tuile}>
            <span className={styles.valeur}>{t.valeur}</span>
            <span className={styles.libelle}>{t.libelle}</span>
          </div>
        ))}
      </div>
      <h3>Prochains rendez-vous</h3>
      {tdb.next.length === 0 ? <p>Aucun rendez-vous à venir.</p> : (
        <ul className={styles.liste}>
          {tdb.next.map((r) => <li key={r.id}><strong>{dateHeure(r.start)}</strong>{r.address ? ` · ${r.address}` : ''}</li>)}
        </ul>
      )}
    </section>
  );
}
