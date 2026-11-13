import { useCallback, useEffect, useState } from 'react';
import { Button, PlanningView, formatEuros, startOfWeek, type PlanningEvent, type PlanningMode } from '@bsandoz/ui';
import { ajusterCarte, carteClient, type CarteFidelite } from '../../services/fidelite';
import { annulerRendezVous, catalogue, changerStatut, horaires, indisponibilites, planning, rembourser, type Indisponibilite, type Plage, type RendezVousPro } from '../../services/pro';
import { dateHeure, jourLocal, localIso, plusJours } from './dates';
import { IconeTelephone } from '../../components/Telephone/Telephone';
import { lienTel } from '../../components/Telephone/numeroTelephone';
import { BoutonItineraire } from '../../components/Itineraire/Itineraire';
import { defilerVers } from '../../app/defilement';
import { Link } from 'react-router-dom';
import { emettreFacture } from '../../services/factures';
import styles from './Pro.module.css';

const STATUTS: Record<RendezVousPro['status'], string> = {
  pending_payment: 'Paiement en ligne en attente', confirmed: 'Confirmé', done: 'Terminé', cancelled: 'Annulé', expired: 'Expiré', no_show: 'Client absent',
};

const LIBELLES = {
  day: 'Jour', week: 'Semaine', month: 'Mois', previous: 'Période précédente', next: 'Période suivante', today: 'Aujourd’hui',
  empty: 'Rien de prévu', more: (n: number) => `+${n}`,
  dayWithCount: (jour: string, n: number) => `${jour}, ${n === 0 ? 'aucun rendez-vous' : n === 1 ? '1 élément' : `${n} éléments`}`,
};

/** Couleur des cases : bleu, ou orange quand des produits sont à apporter ; gris une fois terminé. */
const COULEUR_RDV = '#2563eb';
const COULEUR_PRODUITS = '#ea580c';
const COULEUR_TERMINE = '#64748b';
const avecProduits = (r: RendezVousPro) => (r.produits?.length ?? 0) > 0;
const heureLocale = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** Plage affichée : de la première ouverture à la dernière fermeture de la semaine (7 h – 20 h par défaut). */
function plageHoraire(plages: Plage[]): [number, number] {
  if (plages.length === 0) return [7, 20];
  const debut = Math.min(...plages.map((p) => Number(p.startsAt.slice(0, 2))));
  const fin = Math.max(...plages.map((p) => Math.ceil(Number(p.endsAt.slice(0, 2)) + Number(p.endsAt.slice(3, 5)) / 60)));
  return [Math.max(0, debut - 1), Math.min(24, fin + 1)];
}

/** Période chargée : couvre la semaine et le mois du jour affiché. */
function periode(jour: string): [string, string] {
  const lundi = startOfWeek(jour);
  const debutMois = `${jour.slice(0, 7)}-01`;
  const [y, m] = jour.split('-').map(Number);
  const moisSuivant = jourLocal(new Date(y, m, 1));
  const from = lundi < debutMois ? lundi : startOfWeek(debutMois);
  const finSemaine = plusJours(lundi, 7);
  return [from, plusJours(finSemaine > moisSuivant ? finSemaine : moisSuivant, 7)];
}

export function PlanningOnglet() {
  const [aujourdhui] = useState(() => jourLocal(new Date()));
  const [mode, setMode] = useState<PlanningMode>('day');
  const [plage, setPlage] = useState<[number, number]>([7, 20]);
  const [maintenant, setMaintenant] = useState(heureLocale);
  const [nomsOptions, setNomsOptions] = useState<Record<string, string>>({});
  useEffect(() => { horaires().then((h) => setPlage(plageHoraire(h))).catch(() => undefined); }, []);
  useEffect(() => {
    catalogue().then((c) => {
      setNomsOptions(Object.fromEntries(c.options.filter((o) => o.id).map((o) => [o.id as string, o.name])));
    }).catch(() => undefined);
  }, []);
  useEffect(() => { const t = window.setInterval(() => setMaintenant(heureLocale()), 60_000); return () => window.clearInterval(t); }, []);
  const [jour, setJour] = useState(aujourdhui);
  const [rdv, setRdv] = useState<RendezVousPro[]>([]);
  const [conges, setConges] = useState<Indisponibilite[]>([]);
  const [choisi, setChoisi] = useState<string>();
  const [erreur, setErreur] = useState('');
  const [from, to] = periode(jour);

  const charger = useCallback(() => {
    planning(from, to).then(setRdv).catch((e: Error) => setErreur(e.message));
    indisponibilites(from, to).then(setConges).catch(() => setConges([]));
  }, [from, to]);

  useEffect(() => { charger(); }, [charger]);

  const evenements: PlanningEvent[] = [
    ...rdv.filter((r) => r.status !== 'cancelled' && r.status !== 'expired').map((r) => ({
      id: r.id, start: localIso(r.start), end: localIso(r.end),
      // Dans la case : le client et le service ; les produits à apporter s'il y en a (case orange).
      title: [r.client.name, r.prestation].filter(Boolean).join(' · ') || 'Rendez-vous',
      subtitle: avecProduits(r) ? `+ ${r.produits!.map((p) => `${p.quantite > 1 ? `${p.quantite} × ` : ''}${p.nom}`).join(', ')}` : undefined,
      tone: r.status === 'pending_payment' ? ('muted' as const) : ('default' as const),
      color: r.status === 'done' ? COULEUR_TERMINE : avecProduits(r) ? COULEUR_PRODUITS : COULEUR_RDV,
    })),
    ...conges.map((c) => ({ id: `conge-${c.id}`, start: localIso(c.start), end: localIso(c.end), title: c.reason || 'Indisponible', tone: 'blocked' as const })),
  ];
  // Vue jour : détail à droite, le rendez-vous choisi ou, par défaut, le prochain à venir.
  const actifs = rdv.filter((r) => r.status === 'confirmed' || r.status === 'pending_payment');
  const prochain = [...actifs].filter((r) => new Date(r.end).getTime() >= Date.parse(`${aujourdhui}T${maintenant}`)).sort((a, b) => a.start.localeCompare(b.start))[0];
  const selection = rdv.find((r) => r.id === choisi) ?? (mode === 'day' ? prochain : undefined);

  return (
    <section className={styles.section} aria-labelledby="titre-planning">
      <h2 id="titre-planning">Planning</h2>
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <ul className={styles.legende} aria-label="Couleurs du planning">
        <li><span style={{ background: COULEUR_RDV }} aria-hidden="true" />Rendez-vous</li>
        <li><span style={{ background: COULEUR_PRODUITS }} aria-hidden="true" />Avec produit à apporter</li>
        <li><span style={{ background: COULEUR_TERMINE }} aria-hidden="true" />Terminé</li>
        <li><span className={styles.legendeAttente} aria-hidden="true" />Paiement en attente</li>
        <li><span className={styles.legendeConge} aria-hidden="true" />Indisponible</li>
      </ul>
      <div className={mode === 'day' ? styles.vueJour : undefined}>
        <PlanningView mode={mode} date={jour} today={aujourdhui} events={evenements} labels={LIBELLES}
          hourStart={plage[0]} hourEnd={plage[1]} now={maintenant} showTime={false} fitHeight
          onModeChange={setMode} onDateChange={setJour}
          onEventClick={(e) => {
            if (e.id.startsWith('conge-')) return;
            setChoisi(e.id);
            // Semaine et mois : le détail s'ouvre sous le planning, on y descend ; jour : à droite, sauf sur téléphone (dessous).
            if (mode !== 'day' || window.matchMedia?.('(max-width: 999px)').matches) defilerVers('detail-rdv');
          }} />
        {mode === 'day' ? (
          <aside id="detail-rdv" className={styles.colonneDetail} aria-label="Détail du rendez-vous">
            {selection ? (
              <>
                {selection.id === prochain?.id && !choisi && <p className={styles.surtitreDetail}>Prochain rendez-vous</p>}
                <DetailRendezVous rdv={selection} nomsOptions={nomsOptions} onChange={charger} />
              </>
            ) : <p className={styles.aide}>Aucun rendez-vous à venir. Touchez un rendez-vous du planning pour voir son détail.</p>}
          </aside>
        ) : selection && (
          <div id="detail-rdv" className={styles.ancreDetail}>
            <DetailRendezVous rdv={selection} nomsOptions={nomsOptions} onFermer={() => setChoisi(undefined)} onChange={charger} />
          </div>
        )}
      </div>
    </section>
  );
}

function DetailRendezVous({ rdv, nomsOptions = {}, onFermer, onChange }: { rdv: RendezVousPro; nomsOptions?: Record<string, string>; onFermer?: () => void; onChange: () => void }) {
  // Ce que le client a demandé : options (avec le nombre de véhicules concernés), modèle, entreprise.
  const options = [...new Set(rdv.optionIds)].map((id) => {
    const n = rdv.optionIds.filter((x) => x === id).length;
    return `${nomsOptions[id] ?? 'Option'}${n > 1 ? ` × ${n}` : ''}`;
  });
  const m = rdv.metierData;
  const texte = (cle: string) => (typeof m[cle] === 'string' && m[cle] !== '' ? String(m[cle]) : '');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [annulation, setAnnulation] = useState(false);
  const [maintenant] = useState(() => Date.now());
  const passe = new Date(rdv.start).getTime() <= maintenant;

  const agir = async (action: () => Promise<string>) => {
    setErreur('');
    try {
      setMessage(await action());
      onChange();
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  return (
    <div className={styles.panneau} role="region" aria-label={`Rendez-vous du ${dateHeure(rdv.start)}`}>
      <div className={styles.actions} style={{ justifyContent: 'space-between' }}>
        <h3>{rdv.prestation || 'Rendez-vous'} · {STATUTS[rdv.status]}</h3>
        {onFermer && <Button variant="ghost" onClick={onFermer}>Fermer</Button>}
      </div>
      <dl className={styles.detail}>
        <dt>Quand</dt><dd>{dateHeure(rdv.start)} → {new Date(rdv.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</dd>
        <dt>Client</dt><dd>{rdv.client.name || '—'}</dd>
        <dt>Téléphone</dt><dd>{rdv.client.phone ? <a className={styles.appelClient} href={lienTel(rdv.client.phone)}><IconeTelephone /> Appeler {rdv.client.phone}</a> : '—'}</dd>
        <dt>E-mail</dt><dd>{rdv.client.email ? <a href={`mailto:${rdv.client.email}`}>{rdv.client.email}</a> : '—'}</dd>
        <dt>Adresse</dt><dd>{rdv.address ? <>{rdv.address} <BoutonItineraire destination={{ address: rdv.address }} nom={rdv.client.name} /></> : 'Sur place'}</dd>
        {(rdv.quantite ?? 1) > 1 && (
          <><dt>Véhicules</dt><dd>{rdv.quantite}{Array.isArray(rdv.metierData.vehicules) && <ul className={styles.liste}>{(rdv.metierData.vehicules as string[]).map((v) => <li key={v}>{v}</li>)}</ul>}</dd></>
        )}
        <dt>Prestation</dt><dd><strong>{rdv.prestation || '—'}</strong>{(rdv.quantite ?? 1) > 1 ? ` × ${rdv.quantite} véhicules` : ''}</dd>
        {options.length > 0 && (rdv.quantite ?? 1) <= 1 && <><dt>Options</dt><dd>{options.join(', ')}</dd></>}
        {texte('modele') && <><dt>Véhicule</dt><dd>{texte('modele')}</dd></>}
        {texte('entreprise') && <><dt>Entreprise</dt><dd>{texte('entreprise')}{texte('siret') ? ` · SIRET ${texte('siret')}` : ''}{texte('adresseFacturation') ? <><br />Facturation : {texte('adresseFacturation')}</> : null}</dd></>}
        {rdv.notes && <><dt>Précisions</dt><dd>{rdv.notes}</dd></>}
        <dt>Montant</dt><dd>{formatEuros(rdv.totalCents)}{rdv.surPlaceCents !== undefined ? ` · ${rdv.surPlaceCents > 0 ? `à encaisser sur place : ${formatEuros(rdv.surPlaceCents)}` : 'tout payé en ligne'}` : ` dont acompte ${formatEuros(rdv.depositCents)}`}{rdv.travelFeeCents > 0 ? ` (déplacement ${formatEuros(rdv.travelFeeCents)})` : ''}{rdv.remiseFideliteCents ? ` · remise fidélité ${formatEuros(rdv.remiseFideliteCents)}` : ''}</dd>
        {rdv.produits && rdv.produits.length > 0 && (
          <><dt>Produits à apporter</dt><dd><strong>{rdv.produits.map((p) => `${p.quantite} × ${p.nom}`).join(', ')}</strong> ({formatEuros(rdv.produitsCents ?? 0)})</dd></>
        )}
        {rdv.status === 'done' && <><dt>Facture</dt><dd><BoutonFacture reservationId={rdv.id} /></dd></>}
        {rdv.clientId && <><dt>Fidélité</dt><dd><Fidelite clientId={rdv.clientId} /></dd></>}
      </dl>
      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      {rdv.status === 'confirmed' && (
        <div className={styles.actions}>
          {passe && <Button onClick={() => agir(async () => { await changerStatut(rdv.id, 'done'); return 'Rendez-vous marqué comme terminé.'; })}>Terminé</Button>}
          {passe && <Button variant="secondary" onClick={() => agir(async () => { await changerStatut(rdv.id, 'no_show'); return 'Client marqué absent.'; })}>Client absent</Button>}
          {!annulation && <Button variant="ghost" onClick={() => setAnnulation(true)}>Annuler le rendez-vous</Button>}
        </div>
      )}
      {annulation && rdv.status !== 'cancelled' && (
        <div className={styles.actions}>
          <span>Annuler ce rendez-vous (le client est prévenu par e-mail) :</span>
          <Button onClick={() => agir(async () => { const r = await annulerRendezVous(rdv.id, true); setAnnulation(false); return `Rendez-vous annulé, ${formatEuros(r.refundedCents)} remboursés.`; })}>Annuler et rembourser l’acompte</Button>
          <Button variant="secondary" onClick={() => agir(async () => { await annulerRendezVous(rdv.id, false); setAnnulation(false); return 'Rendez-vous annulé sans remboursement.'; })}>Annuler sans rembourser</Button>
          <Button variant="ghost" onClick={() => setAnnulation(false)}>Garder le rendez-vous</Button>
        </div>
      )}
      {(rdv.status === 'cancelled' || rdv.status === 'no_show') && rdv.depositCents > 0 && (
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => agir(async () => { const r = await rembourser(rdv.id); return `${formatEuros(r.refundedCents)} remboursés.`; })}>Rembourser l’acompte</Button>
        </div>
      )}
    </div>
  );
}

/** Carte de fidélité du client, avec ajout / retrait d'un tampon (carte papier, prestation hors site…). */
function Fidelite({ clientId }: { clientId: string }) {
  const [carte, setCarte] = useState<CarteFidelite>();
  useEffect(() => { carteClient(clientId).then(setCarte).catch(() => undefined); }, [clientId]);
  if (!carte) return <span>…</span>;
  if (!carte.actif) return <span>désactivée</span>;
  const ajuster = (delta: number) => ajusterCarte(clientId, delta).then(setCarte).catch(() => undefined);
  return (
    <span className={styles.actions}>
      <span>{carte.tampons} / {carte.tamponsRequis}{carte.remiseDisponible ? ` · −${carte.remisePercent} % à la prochaine réservation` : ''}</span>
      <Button variant="ghost" onClick={() => ajuster(1)}>Ajouter un tampon</Button>
      <Button variant="ghost" disabled={carte.tampons === 0} onClick={() => ajuster(-1)}>Retirer un tampon</Button>
    </span>
  );
}

/** Prestation faite : ouvre sa facture (émise automatiquement, ou créée à la demande pour un rendez-vous plus ancien). */
function BoutonFacture({ reservationId }: { reservationId: string }) {
  const [facture, setFacture] = useState<{ id: string; numero: string }>();
  const [erreur, setErreur] = useState('');
  if (facture) return <Link to={`/facture/${facture.id}`}>Voir la facture {facture.numero}</Link>;
  return (
    <>
      <Button variant="ghost" onClick={async () => { try { setFacture(await emettreFacture(reservationId)); } catch (e) { setErreur((e as Error).message); } }}>Ouvrir la facture</Button>
      {erreur && <span className={styles.erreur} role="alert"> {erreur}</span>}
    </>
  );
}
