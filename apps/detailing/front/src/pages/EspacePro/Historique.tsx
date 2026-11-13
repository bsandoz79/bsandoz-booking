import { useCallback, useEffect, useState } from 'react';
import { Field, formatEuros } from '@bsandoz/ui';
import { catalogue, planning, type RendezVousPro } from '../../services/pro';
import { Icone } from '../../components/Icone/Icone';
import { DetailRendezVous } from './Planning';
import { STATUTS } from './statutsRdv';
import { filtrer } from './filtrer';
import { jourLocal, plusJours } from './dates';
import r from '../../components/Reglages/Reglages.module.css';
import f from './Filtres.module.css';
import styles from './Pro.module.css';

type Tri = 'rdv-recent' | 'rdv-ancien' | 'reservation-recente';
const TRIS: { value: Tri; label: string }[] = [
  { value: 'rdv-recent', label: 'Date du rendez-vous, la plus récente d’abord' },
  { value: 'rdv-ancien', label: 'Date du rendez-vous, la plus ancienne d’abord' },
  { value: 'reservation-recente', label: 'Dernières réservations prises' },
];
const FILTRES_STATUT: { value: string; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'confirmed', label: 'Confirmés' },
  { value: 'pending_payment', label: 'Paiement en attente' },
  { value: 'done', label: 'Terminés' },
  { value: 'cancelled', label: 'Annulés' },
  { value: 'no_show', label: 'Absents' },
];

const quand = (iso: string) => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const jourCourt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Historique des rendez-vous : une ligne par réservation (dès qu'elle est prise), triable par date du rendez-vous ou
 * de réservation, filtrable par période, statut et nom ; un clic ouvre la fiche du rendez-vous.
 */
export function HistoriqueOnglet() {
  const [aujourdhui] = useState(() => jourLocal(new Date()));
  const [du, setDu] = useState(() => plusJours(aujourdhui, -365));
  const [au, setAu] = useState(() => plusJours(aujourdhui, 180));
  const [liste, setListe] = useState<RendezVousPro[]>([]);
  const [nomsOptions, setNomsOptions] = useState<Record<string, string>>({});
  const [tri, setTri] = useState<Tri>('rdv-recent');
  const [statut, setStatut] = useState('');
  const [recherche, setRecherche] = useState('');
  const [ouvert, setOuvert] = useState<string>();
  const [erreur, setErreur] = useState('');

  const charger = useCallback(() => {
    if (!du || !au || du > au) return;
    planning(du, plusJours(au, 1)).then(setListe).catch((e: Error) => setErreur(e.message));
  }, [du, au]);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { catalogue().then((c) => setNomsOptions(Object.fromEntries(c.options.map((o) => [o.id ?? '', o.name])))).catch(() => undefined); }, []);

  const visibles = filtrer(liste, recherche, statut, (x) => `${x.client.name} ${x.client.email} ${x.client.phone} ${x.prestation} ${x.address}`, (x) => x.status)
    .sort((a, b) => (tri === 'rdv-ancien' ? a.start.localeCompare(b.start)
      : tri === 'reservation-recente' ? (b.createdAt ?? b.start).localeCompare(a.createdAt ?? a.start)
        : b.start.localeCompare(a.start)));
  const chiffre = visibles.filter((x) => x.status === 'done').reduce((t, x) => t + x.totalCents + (x.produitsCents ?? 0), 0);

  return (
    <section className={styles.section} aria-labelledby="titre-historique-pro">
      <div className={r.rubriqueEntete}>
        <div>
          <h2 id="titre-historique-pro">Historique</h2>
          <p className={r.aide}>Chaque rendez-vous pris apparaît ici aussitôt. Touchez une ligne pour voir sa fiche.</p>
        </div>
      </div>
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      <div className={f.filtres}>
        <Field label="Du" type="date" value={du} onChange={(e) => setDu(e.target.value)} />
        <Field label="Au" type="date" value={au} onChange={(e) => setAu(e.target.value)} error={du > au ? 'La fin est avant le début.' : undefined} />
        <label className={styles.choix}>Trier par
          <select value={tri} onChange={(e) => setTri(e.target.value as Tri)}>
            {TRIS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <div className={f.recherche}><Field label="Rechercher" type="search" value={recherche} placeholder="Client, prestation, adresse…" onChange={(e) => setRecherche(e.target.value)} /></div>
      </div>
      <div className={f.puces} role="group" aria-label="Filtrer par statut">
        {FILTRES_STATUT.map((s) => (
          <button key={s.value || 'tous'} type="button" className={`${r.boutonContour} ${f.puce}`} aria-pressed={statut === s.value} onClick={() => setStatut(s.value)}>{s.label}</button>
        ))}
      </div>

      <p className={r.aide} aria-live="polite">
        {visibles.length} rendez-vous{chiffre > 0 ? ` · ${formatEuros(chiffre)} de prestations terminées` : ''}
      </p>

      {visibles.length === 0 ? <p className={r.aide}>Aucun rendez-vous ne correspond.</p> : (
        <ul className={r.panneau} aria-label="Rendez-vous">
          {visibles.map((x) => (
            <li key={x.id} className={styles.historiqueLigne}>
              <button type="button" className={styles.historiqueBouton} aria-expanded={ouvert === x.id} onClick={() => setOuvert(ouvert === x.id ? undefined : x.id)}>
                <Icone nom="calendrier" className={r.ligneIcone} />
                <span className={styles.historiqueQuand}>{quand(x.start)}</span>
                <span className={styles.historiqueQui}><strong>{x.client.name || 'Client'}</strong> · {x.prestation || 'Prestation'}{(x.quantite ?? 1) > 1 ? ` × ${x.quantite}` : ''}</span>
                <span className={styles.historiqueMontant}>{formatEuros(x.totalCents + (x.produitsCents ?? 0))}</span>
                <span className={`${styles.pastilleStatut} ${styles[`statut_${x.status}`] ?? ''}`}>{STATUTS[x.status]}</span>
                <span className={styles.historiquePris}>{x.createdAt ? `Réservé le ${jourCourt(x.createdAt)}` : ''}</span>
              </button>
              {ouvert === x.id && (
                <div className={styles.historiqueDetail}>
                  <DetailRendezVous rdv={x} nomsOptions={nomsOptions} onFermer={() => setOuvert(undefined)} onChange={charger} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
