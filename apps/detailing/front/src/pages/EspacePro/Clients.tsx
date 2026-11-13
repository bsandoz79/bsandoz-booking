import { useEffect, useState, type FormEvent } from 'react';
import { Button, Field, formatEuros } from '@bsandoz/ui';
import r from '../../components/Reglages/Reglages.module.css';
import f from './Filtres.module.css';
import { changerAvoir, clients, ficheClient, type ClientResume, type FicheClient } from '../../services/clients';
import { IconeTelephone } from '../../components/Telephone/Telephone';
import { lienTel } from '../../components/Telephone/numeroTelephone';
import styles from './Pro.module.css';

const jour = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const STATUTS: Record<string, string> = { confirmed: 'À venir', done: 'Fait', no_show: 'Absent', cancelled: 'Annulé', pending_payment: 'Paiement en attente', expired: 'Expiré' };
const sansAccents = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Tri = 'nom' | 'nom-inverse' | 'depense' | 'depense-inverse' | 'visites' | 'derniere' | 'prochain';
const TRIS: { value: Tri; label: string }[] = [
  { value: 'nom', label: 'Nom, de A à Z' },
  { value: 'nom-inverse', label: 'Nom, de Z à A' },
  { value: 'depense', label: 'Les plus gros clients (dépensé)' },
  { value: 'depense-inverse', label: 'Les plus petits clients (dépensé)' },
  { value: 'visites', label: 'Le plus de visites' },
  { value: 'derniere', label: 'Dernière visite, la plus récente' },
  { value: 'prochain', label: 'Prochain rendez-vous, le plus proche' },
];
type Groupe = '' | 'relancer' | 'a-venir' | 'fideles' | 'nouveaux';
const GROUPES: { value: Groupe; label: string; garde: (c: ClientResume) => boolean }[] = [
  { value: '', label: 'Tous', garde: () => true },
  { value: 'relancer', label: 'À relancer', garde: (c) => c.aRelancer },
  { value: 'a-venir', label: 'Rendez-vous à venir', garde: (c) => !!c.prochainRdv },
  { value: 'fideles', label: 'Fidèles (3 visites et plus)', garde: (c) => c.visites >= 3 },
  { value: 'nouveaux', label: 'Nouveaux (1 visite au plus)', garde: (c) => c.visites <= 1 },
];
const nomTri = (c: ClientResume) => (c.nom || c.email).toLocaleLowerCase('fr');
const COMPARER: Record<Tri, (a: ClientResume, b: ClientResume) => number> = {
  nom: (a, b) => nomTri(a).localeCompare(nomTri(b), 'fr'),
  'nom-inverse': (a, b) => nomTri(b).localeCompare(nomTri(a), 'fr'),
  depense: (a, b) => b.depenseCents - a.depenseCents,
  'depense-inverse': (a, b) => a.depenseCents - b.depenseCents,
  visites: (a, b) => b.visites - a.visites,
  // Sans visite : en dernier.
  derniere: (a, b) => (b.derniereVisite ?? '').localeCompare(a.derniereVisite ?? ''),
  prochain: (a, b) => (a.prochainRdv ?? '9999').localeCompare(b.prochainRdv ?? '9999'),
};
const initiales = (nom: string) => nom.split(/[\s@.-]+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');

/** Clients : tri (nom, dépensé, visites…), groupes (à relancer, fidèles…), recherche ; puis fiche (dépenses, historique, avoir, fidélité, appel). */
export function ClientsOnglet() {
  const [liste, setListe] = useState<ClientResume[]>([]);
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState<Tri>('nom');
  const [groupe, setGroupe] = useState<Groupe>('');
  const [fiche, setFiche] = useState<FicheClient>();
  const [erreur, setErreur] = useState('');

  useEffect(() => { clients().then(setListe).catch((e: Error) => setErreur(e.message)); }, []);

  const ouvrir = (c: ClientResume) => { setErreur(''); ficheClient(c.userId).then(setFiche).catch((e: Error) => setErreur(e.message)); };
  const filtre = sansAccents(recherche.trim());
  const garde = GROUPES.find((g) => g.value === groupe)!.garde;
  const visibles = liste
    .filter((c) => garde(c) && (filtre === '' || sansAccents(`${c.nom} ${c.email} ${c.phone}`).includes(filtre)))
    .sort(COMPARER[tri]);
  const total = visibles.reduce((t, c) => t + c.depenseCents, 0);
  const visites = visibles.reduce((t, c) => t + c.visites, 0);

  if (fiche) return <Fiche fiche={fiche} onRetour={() => setFiche(undefined)} onAvoir={(avoirCents) => setFiche({ ...fiche, avoirCents })} />;

  return (
    <section className={styles.section} aria-labelledby="titre-clients-onglet">
      <div className={r.rubriqueEntete}>
        <div>
          <h2 id="titre-clients-onglet">Clients</h2>
          <p className={r.aide}>Tous ceux qui ont réservé. Touchez un client pour voir sa fiche.</p>
        </div>
      </div>
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      <div className={f.filtres}>
        <div className={f.recherche}><Field label="Rechercher un client" type="search" value={recherche} placeholder="Nom, e-mail ou téléphone" onChange={(e) => setRecherche(e.target.value)} /></div>
        <label className={styles.choix}>Trier par
          <select value={tri} onChange={(e) => setTri(e.target.value as Tri)}>
            {TRIS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>
      <div className={f.puces} role="group" aria-label="Filtrer les clients">
        {GROUPES.map((g) => (
          <button key={g.value || 'tous'} type="button" className={`${r.boutonContour} ${f.puce}`} aria-pressed={groupe === g.value} onClick={() => setGroupe(g.value)}>
            {g.label} <span className={styles.compte}>{liste.filter(g.garde).length}</span>
          </button>
        ))}
      </div>

      <ul className={styles.tuiles} aria-label="Résumé de la sélection">
        <li className={styles.tuile}><span className={styles.valeur}>{visibles.length}</span><span className={styles.libelle}>client{visibles.length > 1 ? 's' : ''}</span></li>
        <li className={styles.tuile}><span className={styles.valeur}>{formatEuros(total)}</span><span className={styles.libelle}>dépensés (prestations faites)</span></li>
        <li className={styles.tuile}><span className={styles.valeur}>{formatEuros(visites ? Math.round(total / visites) : 0)}</span><span className={styles.libelle}>panier moyen</span></li>
      </ul>

      {visibles.length === 0 ? <p className={r.aide}>{liste.length === 0 ? 'Aucun client pour l’instant.' : 'Aucun client ne correspond.'}</p> : (
        <ul className={r.panneau} aria-label="Liste des clients">
          {visibles.map((c) => (
            <li key={c.userId} className={styles.historiqueLigne}>
              <button type="button" className={styles.clientBouton} onClick={() => ouvrir(c)} aria-label={`Voir la fiche de ${c.nom || c.email}`}>
                <span className={styles.clientAvatar} aria-hidden="true">{initiales(c.nom || c.email)}</span>
                <span className={styles.clientQui}>
                  <strong>{c.nom || c.email}</strong>
                  <span className={r.ligneSous}>{[c.phone, c.email].filter(Boolean).join(' · ')}</span>
                </span>
                <span className={styles.clientChiffres}>
                  <strong>{formatEuros(c.depenseCents)}</strong>
                  <span className={r.ligneSous}>{c.visites} visite{c.visites > 1 ? 's' : ''} · {c.derniereVisite ? `dernière le ${jour(c.derniereVisite)}` : 'pas encore venu'}</span>
                </span>
                <span className={styles.clientEtiquettes}>
                  {c.prochainRdv && <span className={r.etiquette}>Prochain : {jour(c.prochainRdv)}</span>}
                  {c.aRelancer && <span className={`${r.etiquette} ${styles.etiquetteRelance}`}>À relancer</span>}
                  {c.visites >= 3 && <span className={`${r.etiquette} ${r.etiquetteNeutre}`}>Fidèle</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
        {fiche.phone && <a className={styles.appelClient} href={lienTel(fiche.phone)} aria-label={`Appeler ${fiche.phone}`}><IconeTelephone /> {fiche.phone}</a>}
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
