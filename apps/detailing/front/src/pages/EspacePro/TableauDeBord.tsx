import { useEffect, useState } from 'react';
import { formatEuros } from '@bsandoz/ui';
import { tableauDeBord, type ChoseAFaire, type RendezVousDuJour, type TableauDeBord } from '../../services/pro';
import { dateHeure } from './dates';
import { IconeTelephone } from '../../components/Telephone/Telephone';
import { lienTel } from '../../components/Telephone/numeroTelephone';
import styles from './Pro.module.css';

const heure = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const jourCourt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

/** Lien GPS vers l'adresse (Google Maps, ouvre l'application sur téléphone). */
const lienGps = (r: Pick<RendezVousDuJour, 'address' | 'lat' | 'lng'>) =>
  `https://www.google.com/maps/dir/?api=1&destination=${r.lat && r.lng ? `${r.lat},${r.lng}` : encodeURIComponent(r.address)}`;

/** Tournée complète : dernier rendez-vous en destination, les autres en étapes, dans l'ordre. */
const lienTournee = (liste: RendezVousDuJour[]) => {
  const points = liste.map((r) => (r.lat && r.lng ? `${r.lat},${r.lng}` : r.address));
  const etapes = points.slice(0, -1).map(encodeURIComponent).join('%7C');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(points[points.length - 1])}${etapes ? `&waypoints=${etapes}` : ''}`;
};

const STATUTS: Record<string, string> = { confirmed: 'Confirmé', done: 'Fait', pending_payment: 'Paiement en attente', no_show: 'Absent' };

function texteAFaire(t: ChoseAFaire): string {
  switch (t.type) {
    case 'paiement': return `Paiement en ligne attendu : ${t.client || 'client'}, ${dateHeure(t.start)}.`;
    case 'statut': return `Rendez-vous de ${t.client || 'client'} du ${jourCourt(t.start)} : à marquer « fait » ou « absent » dans le Planning.`;
    case 'stock': return t.stock === 0 ? `${t.produit} : épuisé, il n’est plus proposé aux clients.` : `${t.produit} : plus que ${t.stock} en stock.`;
    case 'facturation': return 'Informations de facturation à compléter (Factures) : elles figurent sur chaque facture.';
  }
}

export function TableauDeBordOnglet() {
  const [tdb, setTdb] = useState<TableauDeBord>();
  const [erreur, setErreur] = useState('');

  useEffect(() => { tableauDeBord().then(setTdb).catch((e: Error) => setErreur(e.message)); }, []);

  if (erreur) return <p className={styles.erreur} role="alert">{erreur}</p>;
  if (!tdb) return <p aria-busy="true">Chargement…</p>;

  const journee = tdb.journee ?? [];
  const aFaire = tdb.aFaire ?? [];
  const chiffres = tdb.chiffres;
  const ecart = chiffres ? chiffres.moisCents - chiffres.moisPrecedentCents : 0;

  const tuiles = [
    { valeur: formatEuros(chiffres?.moisCents ?? tdb.monthRevenueCents), libelle: 'Chiffre d’affaires du mois (rendez-vous confirmés ou faits)',
      detail: chiffres && chiffres.moisPrecedentCents > 0 ? `${ecart >= 0 ? '+' : '−'}${formatEuros(Math.abs(ecart))} par rapport au mois dernier` : undefined },
    { valeur: String(tdb.monthBookings), libelle: 'Rendez-vous ce mois-ci' },
    ...(chiffres ? [
      { valeur: formatEuros(chiffres.panierMoyenCents), libelle: 'Panier moyen' },
      { valeur: formatEuros(chiffres.produitsMoisCents), libelle: 'Produits vendus ce mois-ci' },
    ] : []),
    { valeur: String(tdb.week), libelle: 'Rendez-vous cette semaine' },
    { valeur: String(tdb.pendingPayments), libelle: 'Paiements en ligne en attente' },
    { valeur: `${Math.round(tdb.monthCancellationRate * 100)} %`, libelle: 'Taux d’annulation du mois' },
  ];

  return (
    <section className={styles.section} aria-labelledby="titre-tdb">
      <h2 id="titre-tdb">Tableau de bord</h2>

      <section className={styles.panneau} aria-labelledby="titre-journee">
        <div className={styles.entetePanneau}>
          <h3 id="titre-journee">Ma journée</h3>
          {journee.length > 1 && <a className="btn btn--ghost" href={lienTournee(journee)} target="_blank" rel="noreferrer">Itinéraire de la tournée</a>}
        </div>
        {journee.length === 0 ? <p>Aucun rendez-vous aujourd’hui.</p> : (
          <ol className={styles.liste}>
            {journee.map((r) => (
              <li key={r.id} className={styles.etape}>
                <div className={styles.etapeHeure}><strong>{heure(r.start)}</strong><span>{heure(r.end)}</span></div>
                <div className={styles.etapeCorps}>
                  <p><strong>{r.client || 'Client'}</strong> · {r.prestation}{r.quantite > 1 ? ` × ${r.quantite} véhicules` : ''}
                    {r.status !== 'confirmed' && <span className={styles.statut}> {STATUTS[r.status] ?? r.status}</span>}</p>
                  {r.address && <p>{r.address}</p>}
                  {r.produits.length > 0 && <p className={styles.produitsJour}>À apporter : {r.produits.map((p) => `${p.quantite} × ${p.nom}`).join(', ')}</p>}
                  {r.notes && <p className={styles.aide}>Note : {r.notes}</p>}
                  {r.status !== 'done' && r.resteSurPlaceCents > 0 && <p>À encaisser sur place : <strong>{formatEuros(r.resteSurPlaceCents)}</strong></p>}
                  <div className={styles.actions}>
                    {r.address && <a className="btn btn--ghost" href={lienGps(r)} target="_blank" rel="noreferrer" aria-label={`Itinéraire vers ${r.client || 'le client'}`}>Itinéraire</a>}
                    {r.phone && <a className={styles.appelClient} href={lienTel(r.phone)}><IconeTelephone /> Appeler {r.phone}</a>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        {(tdb.aCharger ?? []).length > 0 && (
          <div>
            <h4>À charger dans le camion</h4>
            <ul className={styles.aCharger}>{tdb.aCharger!.map((p) => <li key={p.nom}><strong>{p.quantite} ×</strong> {p.nom}</li>)}</ul>
          </div>
        )}
      </section>

      <section className={styles.panneau} aria-labelledby="titre-afaire">
        <h3 id="titre-afaire">Choses à faire{aFaire.length > 0 ? ` (${aFaire.length})` : ''}</h3>
        {aFaire.length === 0 ? <p className={styles.ok}>Rien en attente.</p> : (
          <ul className={styles.liste}>
            {aFaire.map((t, i) => (
              <li key={i} className={styles.prochain}>
                <span>{texteAFaire(t)}</span>
                {(t.type === 'paiement' || t.type === 'statut') && t.phone && <a className={styles.appelClient} href={lienTel(t.phone)}><IconeTelephone /> Appeler</a>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section} aria-labelledby="titre-chiffres">
        <h3 id="titre-chiffres">Chiffres</h3>
        <div className={styles.tuiles}>
          {tuiles.map((t) => (
            <div key={t.libelle} className={styles.tuile}>
              <span className={styles.valeur}>{t.valeur}</span>
              <span className={styles.libelle}>{t.libelle}</span>
              {t.detail && <span className={styles.libelle}>{t.detail}</span>}
            </div>
          ))}
        </div>
      </section>

      {tdb.clients && (
        <section className={styles.panneau} aria-labelledby="titre-clients">
          <h3 id="titre-clients">Clients</h3>
          <p>Nouveaux clients ce mois-ci : <strong>{tdb.clients.nouveauxMois}</strong></p>
          <h4>À relancer (pas revenus depuis plus de 3 mois)</h4>
          {tdb.clients.aRelancer.length === 0 ? <p>Personne pour le moment.</p> : (
            <ul className={styles.liste}>
              {tdb.clients.aRelancer.map((c) => (
                <li key={c.userId} className={styles.prochain}>
                  <span><strong>{c.client || 'Client'}</strong> · dernière visite le {new Date(c.derniereVisite).toLocaleDateString('fr-FR')}</span>
                  {c.phone && <a className={styles.appelClient} href={lienTel(c.phone)}><IconeTelephone /> Appeler {c.phone}</a>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <h3>Prochains rendez-vous</h3>
      {tdb.next.length === 0 ? <p>Aucun rendez-vous à venir.</p> : (
        <ul className={styles.liste}>
          {tdb.next.map((r) => (
            <li key={r.id} className={styles.prochain}>
              <span><strong>{dateHeure(r.start)}</strong>{r.client ? ` · ${r.client}` : ''}{r.address ? ` · ${r.address}` : ''}</span>
              {r.phone && <a className={styles.appelClient} href={lienTel(r.phone)}><IconeTelephone /> Appeler {r.phone}</a>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
