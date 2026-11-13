import { useEffect, useState, type FormEvent } from 'react';
import { Button, DataTable, Field, formatEuros } from '@bsandoz/ui';
import { changerAvoir, clients, ficheClient, type ClientResume, type FicheClient } from '../../services/clients';
import { IconeTelephone } from '../../components/Telephone/Telephone';
import { lienTel } from '../../components/Telephone/numeroTelephone';
import styles from './Pro.module.css';

const jour = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const STATUTS: Record<string, string> = { confirmed: 'À venir', done: 'Fait', no_show: 'Absent', cancelled: 'Annulé', pending_payment: 'Paiement en attente', expired: 'Expiré' };
const sansAccents = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Clients : liste (recherche, tri), puis fiche (dépenses, historique, avoir, fidélité, appel). */
export function ClientsOnglet() {
  const [liste, setListe] = useState<ClientResume[]>([]);
  const [recherche, setRecherche] = useState('');
  const [fiche, setFiche] = useState<FicheClient>();
  const [erreur, setErreur] = useState('');

  useEffect(() => { clients().then(setListe).catch((e: Error) => setErreur(e.message)); }, []);

  const ouvrir = (c: ClientResume) => { setErreur(''); ficheClient(c.userId).then(setFiche).catch((e: Error) => setErreur(e.message)); };
  const filtre = sansAccents(recherche.trim());
  const visibles = filtre === '' ? liste : liste.filter((c) => sansAccents(`${c.nom} ${c.email} ${c.phone}`).includes(filtre));

  if (fiche) return <Fiche fiche={fiche} onRetour={() => setFiche(undefined)} onAvoir={(avoirCents) => setFiche({ ...fiche, avoirCents })} />;

  return (
    <section className={styles.section} aria-labelledby="titre-clients-onglet">
      <h2 id="titre-clients-onglet">Clients</h2>
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <Field label="Rechercher un client" type="search" value={recherche} placeholder="Nom, e-mail ou téléphone" onChange={(e) => setRecherche(e.target.value)} />
      <DataTable caption={`${visibles.length} client${visibles.length > 1 ? 's' : ''}`} rows={visibles} rowKey={(c) => c.userId} emptyLabel="Aucun client pour l’instant."
        onRowClick={ouvrir} rowActionLabel={(c) => `Voir la fiche de ${c.nom || c.email}`}
        columns={[
          { key: 'nom', header: 'Client', render: (c) => <>{c.nom || c.email}{c.aRelancer && <span className={styles.statut}>À relancer</span>}</>, sortValue: (c) => c.nom },
          { key: 'visites', header: 'Visites', align: 'end', sortValue: (c) => c.visites },
          { key: 'depense', header: 'Dépensé', align: 'end', render: (c) => formatEuros(c.depenseCents), sortValue: (c) => c.depenseCents },
          { key: 'derniere', header: 'Dernière visite', render: (c) => jour(c.derniereVisite), sortValue: (c) => c.derniereVisite ?? '' },
          { key: 'prochain', header: 'Prochain rendez-vous', render: (c) => jour(c.prochainRdv), sortValue: (c) => c.prochainRdv ?? '' },
        ]} />
    </section>
  );
}

function Fiche({ fiche, onRetour, onAvoir }: { fiche: FicheClient; onRetour: () => void; onAvoir: (cents: number) => void }) {
  const [avoir, setAvoir] = useState((fiche.avoirCents / 100).toFixed(2).replace('.', ','));
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const avoirValide = /^\d+([.,]\d{1,2})?$/.test(avoir.trim());

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(''); setErreur('');
    try {
      const cents = await changerAvoir(fiche.userId, Math.round(Number(avoir.trim().replace(',', '.')) * 100));
      onAvoir(cents);
      setMessage(cents === 0 ? 'Avoir remis à zéro.' : `Avoir de ${formatEuros(cents)} enregistré : il sera déduit de son prochain rendez-vous.`);
    } catch (err) {
      setErreur((err as Error).message);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="titre-fiche">
      <div><Button variant="ghost" onClick={onRetour}>← Tous les clients</Button></div>
      <h2 id="titre-fiche">{fiche.nom || fiche.email}{fiche.aRelancer && <span className={styles.statut}>À relancer</span>}</h2>
      <div className={styles.actions}>
        {fiche.phone && <a className={styles.appelClient} href={lienTel(fiche.phone)}><IconeTelephone /> Appeler {fiche.phone}</a>}
        <a className="btn btn--ghost" href={`mailto:${fiche.email}`}>Écrire à {fiche.email}</a>
      </div>
      <div className={styles.tuiles}>
        <div className={styles.tuile}><span className={styles.valeur}>{formatEuros(fiche.depenseCents)}</span><span className={styles.libelle}>Dépensé (prestations faites)</span></div>
        <div className={styles.tuile}><span className={styles.valeur}>{fiche.visites}</span><span className={styles.libelle}>Visites</span></div>
        <div className={styles.tuile}><span className={styles.valeur}>{formatEuros(fiche.panierMoyenCents)}</span><span className={styles.libelle}>Panier moyen</span></div>
        <div className={styles.tuile}><span className={styles.valeur}>{jour(fiche.derniereVisite)}</span><span className={styles.libelle}>Dernière visite</span></div>
        {fiche.fidelite?.actif && (
          <div className={styles.tuile}><span className={styles.valeur}>{fiche.fidelite.tampons} / {fiche.fidelite.tamponsRequis}</span><span className={styles.libelle}>Carte de fidélité{fiche.fidelite.remiseDisponible ? ' (remise prête)' : ''}</span></div>
        )}
      </div>

      <form className={styles.panneau} onSubmit={enregistrer} noValidate aria-labelledby="titre-avoir">
        <h3 id="titre-avoir">Avoir</h3>
        <p className={styles.aide}>Somme déjà payée (ex. annulation tardive), déduite automatiquement de son prochain rendez-vous. Modifiable pour un geste commercial.</p>
        <div className={styles.ligne}>
          <Field label="Montant de l’avoir (€)" inputMode="decimal" value={avoir} onChange={(e) => setAvoir(e.target.value)} error={avoirValide ? undefined : 'Montant invalide, ex. 15 ou 15,50.'} />
          <Button type="submit" disabled={!avoirValide}>Enregistrer l’avoir</Button>
        </div>
        {message && <p className={styles.ok} role="status">{message}</p>}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      </form>

      <h3>Historique</h3>
      {fiche.historique.length === 0 ? <p>Aucun rendez-vous.</p> : (
        <ul className={styles.liste}>
          {fiche.historique.map((r) => (
            <li key={r.id} className={styles.prochain}>
              <span><strong>{jour(r.start)}</strong> · {r.prestation || 'Prestation'}{r.quantite > 1 ? ` × ${r.quantite}` : ''} · {STATUTS[r.status] ?? r.status}</span>
              <span>{formatEuros(r.totalCents)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
