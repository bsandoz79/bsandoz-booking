import { useCallback, useEffect, useState } from 'react';
import { Button, PlanningView, formatEuros, startOfWeek, type PlanningEvent, type PlanningMode } from '@bsandoz/ui';
import { ajusterCarte, carteClient, type CarteFidelite } from '../../services/fidelite';
import { annulerRendezVous, changerStatut, indisponibilites, planning, rembourser, type Indisponibilite, type RendezVousPro } from '../../services/pro';
import { dateHeure, jourLocal, localIso, plusJours } from './dates';
import styles from './Pro.module.css';

const STATUTS: Record<RendezVousPro['status'], string> = {
  pending_payment: 'Acompte en attente', confirmed: 'Confirmé', done: 'Terminé', cancelled: 'Annulé', expired: 'Expiré', no_show: 'Client absent',
};

const LIBELLES = {
  day: 'Jour', week: 'Semaine', month: 'Mois', previous: 'Période précédente', next: 'Période suivante', today: 'Aujourd’hui',
  empty: 'Rien de prévu', more: (n: number) => `+${n}`,
  dayWithCount: (jour: string, n: number) => `${jour}, ${n === 0 ? 'aucun rendez-vous' : n === 1 ? '1 élément' : `${n} éléments`}`,
};

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
  const [mode, setMode] = useState<PlanningMode>('week');
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
      title: [r.prestation, r.client.name].filter(Boolean).join(' – ') || 'Rendez-vous',
      subtitle: r.status === 'pending_payment' ? `${STATUTS[r.status]} · ${r.address}` : r.address,
      tone: r.status === 'pending_payment' ? ('muted' as const) : ('default' as const),
    })),
    ...conges.map((c) => ({ id: `conge-${c.id}`, start: localIso(c.start), end: localIso(c.end), title: c.reason || 'Indisponible', tone: 'blocked' as const })),
  ];
  const selection = rdv.find((r) => r.id === choisi);

  return (
    <section className={styles.section} aria-labelledby="titre-planning">
      <h2 id="titre-planning">Planning</h2>
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <PlanningView mode={mode} date={jour} today={aujourdhui} events={evenements} labels={LIBELLES}
        onModeChange={setMode} onDateChange={setJour}
        onEventClick={(e) => { if (!e.id.startsWith('conge-')) setChoisi(e.id); }} />
      {selection && <DetailRendezVous rdv={selection} onFermer={() => setChoisi(undefined)} onChange={charger} />}
    </section>
  );
}

function DetailRendezVous({ rdv, onFermer, onChange }: { rdv: RendezVousPro; onFermer: () => void; onChange: () => void }) {
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
        <Button variant="ghost" onClick={onFermer}>Fermer</Button>
      </div>
      <dl className={styles.detail}>
        <dt>Quand</dt><dd>{dateHeure(rdv.start)} → {new Date(rdv.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</dd>
        <dt>Client</dt><dd>{rdv.client.name || '—'}</dd>
        <dt>Téléphone</dt><dd>{rdv.client.phone ? <a href={`tel:${rdv.client.phone.replace(/\s/g, '')}`}>{rdv.client.phone}</a> : '—'}</dd>
        <dt>E-mail</dt><dd>{rdv.client.email ? <a href={`mailto:${rdv.client.email}`}>{rdv.client.email}</a> : '—'}</dd>
        <dt>Adresse</dt><dd>{rdv.address ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rdv.address)}`} target="_blank" rel="noreferrer">{rdv.address}</a> : 'Sur place'}</dd>
        {(rdv.quantite ?? 1) > 1 && (
          <><dt>Véhicules</dt><dd>{rdv.quantite}{Array.isArray(rdv.metierData.vehicules) && <ul className={styles.liste}>{(rdv.metierData.vehicules as string[]).map((v) => <li key={v}>{v}</li>)}</ul>}</dd></>
        )}
        {Object.keys(rdv.metierData).length > 0 && <><dt>Détails</dt><dd>{Object.entries(rdv.metierData).filter(([k, v]) => k !== 'vehicules' && v !== '' && v !== null).map(([k, v]) => `${k} : ${String(v)}`).join(' · ')}</dd></>}
        {rdv.notes && <><dt>Précisions</dt><dd>{rdv.notes}</dd></>}
        <dt>Montant</dt><dd>{formatEuros(rdv.totalCents)} dont acompte {formatEuros(rdv.depositCents)}{rdv.travelFeeCents > 0 ? ` (déplacement ${formatEuros(rdv.travelFeeCents)})` : ''}{rdv.remiseFideliteCents ? ` · remise fidélité ${formatEuros(rdv.remiseFideliteCents)}` : ''}</dd>
        {rdv.produits && rdv.produits.length > 0 && (
          <><dt>Produits à apporter</dt><dd><strong>{rdv.produits.map((p) => `${p.quantite} × ${p.nom}`).join(', ')}</strong> (déjà payés : {formatEuros(rdv.produitsCents ?? 0)})</dd></>
        )}
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
