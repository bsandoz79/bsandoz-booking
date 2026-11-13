import { useEffect, useState } from 'react';
import { Button, Calendar, SlotPicker, formatEuros } from '@bsandoz/ui';
import type { Formule } from '../../data/demo';
import { getAvailableDays, getSlots, type Slot } from '../../services/api';
import type { RendezVous } from '../../services/compte';
import { AjouterAgenda } from '../AjouterAgenda/AjouterAgenda';
import { SITE } from '../../data/site';
import styles from './CarteRendezVous.module.css';

const STATUTS: Record<RendezVous['status'], string> = {
  pending_payment: 'En attente de paiement',
  confirmed: 'Confirmé',
  done: 'Terminé',
  cancelled: 'Annulé',
  expired: 'Paiement non réglé',
  no_show: 'Absent',
};

const dateLongue = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

interface Props {
  rdv: RendezVous;
  formule?: Formule;
  /** Maintenant (testable). */
  maintenant?: Date;
  onDeplacer: (start: string) => Promise<void>;
  onAnnuler: () => Promise<{ refundable: boolean }>;
  /** Acompte non réglé : renvoie l'adresse de la page de paiement. */
  onPayer?: () => Promise<string>;
  /** Ouverture de la page de paiement (testable). */
  naviguer?: (url: string) => void;
}

/**
 * Un rendez-vous du client : détails, déplacement (nouveau créneau) et annulation (paiement en ligne remboursé si
 * annulation gratuite). Paiement en ligne non réglé : « Payer » ; si le créneau a été repris entre-temps, le client en choisit un
 * autre puis paie. Il peut aussi changer de créneau ou annuler (rien n'a été payé).
 */
export function CarteRendezVous({ rdv, formule, maintenant: maintenantFourni, onDeplacer, onAnnuler, onPayer, naviguer = (url) => window.location.assign(url) }: Props) {
  const [maintenantInitial] = useState(() => new Date());
  const maintenant = maintenantFourni ?? maintenantInitial;
  const [mode, setMode] = useState<'aucun' | 'deplacer' | 'annuler'>('aucun');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const aVenir = new Date(rdv.start) > maintenant;
  const modifiable = aVenir && rdv.status === 'confirmed';
  const impayee = aVenir && (rdv.status === 'pending_payment' || rdv.status === 'expired') && !!onPayer;
  const annulationGratuite = maintenant <= new Date(rdv.freeCancelUntil);
  const aPayer = rdv.enLigneCents ?? rdv.depositCents + (rdv.produitsCents ?? 0);
  const surPlace = rdv.surPlaceCents ?? rdv.totalCents - rdv.depositCents;
  const payeEnLigne = rdv.status !== 'pending_payment' && rdv.status !== 'expired' && aPayer > 0;

  const payer = async () => {
    if (!onPayer) return;
    setErreur('');
    setMessage('');
    setEnCours(true);
    try {
      const url = await onPayer();
      naviguer(url);
    } catch (e) {
      // Créneau repris entre-temps : on propose directement d'en choisir un autre.
      if ((e as { status?: number }).status === 409) setMode('deplacer');
      setErreur((e as Error).message);
      setEnCours(false);
    }
  };

  const agir = async (action: () => Promise<string>) => {
    setErreur('');
    setEnCours(true);
    try {
      setMessage(await action());
      setMode('aucun');
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <article className={styles.carte} aria-labelledby={`rdv-${rdv.id}`}>
      <div className={styles.entete}>
        <h3 id={`rdv-${rdv.id}`}>{formule?.name ?? 'Rendez-vous'}</h3>
        <span className={`${styles.statut} ${styles[rdv.status] ?? ''}`}>{STATUTS[rdv.status] ?? rdv.status}</span>
      </div>
      <p className={styles.date}>{dateLongue(rdv.start)}</p>
      {rdv.address && <p>{rdv.address}</p>}
      {rdv.produits && rdv.produits.length > 0 && <p>Produits apportés le jour J : {rdv.produits.map((p) => `${p.quantite} × ${p.nom}`).join(', ')} ({formatEuros(rdv.produitsCents ?? 0)})</p>}
      <p className={styles.montants}>Total {formatEuros(rdv.totalCents + (rdv.produitsCents ?? 0))}{rdv.remiseFideliteCents ? ` (remise fidélité de ${formatEuros(rdv.remiseFideliteCents)} incluse)` : ''}{payeEnLigne ? ` · payé en ligne : ${formatEuros(aPayer)}` : ''}{surPlace > 0 ? ` · à régler sur place : ${formatEuros(surPlace)}` : ''}</p>
      {modifiable && (
        <p className={styles.aide}>
          {annulationGratuite
            ? `Annulation gratuite jusqu’au ${dateLongue(rdv.freeCancelUntil)}${payeEnLigne ? ' : ce que vous avez payé en ligne vous sera remboursé' : ''}.`
            : payeEnLigne ? 'Le délai d’annulation gratuite est dépassé : en cas d’annulation, le paiement en ligne reste dû.' : 'Le délai d’annulation gratuite est dépassé : merci de prévenir au plus tôt en cas d’empêchement.'}
        </p>
      )}

      {modifiable && mode === 'aucun' && (
        <AjouterAgenda evenement={{ titre: `${SITE.brand} : ${formule?.name ?? 'rendez-vous'}`, debut: rdv.start, fin: rdv.end, lieu: rdv.address }} />
      )}

      {impayee && (
        <p className={styles.aide}>Votre rendez-vous n’est pas encore confirmé : réglez le paiement en ligne ({formatEuros(aPayer)}) pour le garder.</p>
      )}

      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      {modifiable && mode === 'aucun' && (
        <div className={styles.actions}>
          {annulationGratuite && <Button variant="secondary" onClick={() => { setMessage(''); setMode('deplacer'); }}>Déplacer</Button>}
          <Button variant="ghost" onClick={() => { setMessage(''); setMode('annuler'); }}>Annuler le rendez-vous</Button>
        </div>
      )}

      {impayee && mode === 'aucun' && (
        <div className={styles.actions}>
          <Button loading={enCours} loadingLabel="Ouverture du paiement…" onClick={payer}>Payer ({formatEuros(aPayer)})</Button>
          <Button variant="secondary" onClick={() => { setMessage(''); setErreur(''); setMode('deplacer'); }}>Changer de créneau</Button>
          <Button variant="ghost" onClick={() => { setMessage(''); setErreur(''); setMode('annuler'); }}>Annuler</Button>
        </div>
      )}

      {mode === 'deplacer' && (
        <Deplacement rdv={rdv} formule={formule} enCours={enCours} onFermer={() => setMode('aucun')}
          libelle={impayee ? 'Choisir ce créneau et payer' : undefined}
          onChoisir={(start) => (impayee
            // Pas encore payé : nouveau créneau, puis paiement tout de suite.
            ? agir(async () => { await onDeplacer(start); await payer(); return ''; })
            : agir(async () => { await onDeplacer(start); return `Rendez-vous déplacé au ${dateLongue(start)}. Un e-mail de confirmation vous est envoyé.`; }))} />
      )}

      {mode === 'annuler' && (
        <div className={styles.panneau}>
          <p><strong>Confirmer l’annulation ?</strong> {impayee || !payeEnLigne ? 'Rien n’a été payé en ligne.' : annulationGratuite ? 'Ce que vous avez payé en ligne vous sera remboursé sous quelques jours.' : 'Le paiement en ligne ne sera pas remboursé.'}</p>
          <div className={styles.actions}>
            <Button loading={enCours} loadingLabel="Annulation…"
              onClick={() => agir(async () => {
                const { refundable } = await onAnnuler();
                return refundable ? 'Rendez-vous annulé. Le paiement en ligne vous sera remboursé.' : 'Rendez-vous annulé.';
              })}>
              Oui, annuler
            </Button>
            <Button variant="ghost" onClick={() => setMode('aucun')}>Garder le rendez-vous</Button>
          </div>
        </div>
      )}
    </article>
  );
}

function Deplacement({ rdv, formule, enCours, onChoisir, onFermer, libelle = 'Confirmer le nouveau créneau' }: {
  rdv: RendezVous; formule?: Formule; enCours: boolean; onChoisir: (start: string) => void; onFermer: () => void; libelle?: string;
}) {
  const duree = Math.round((new Date(rdv.end).getTime() - new Date(rdv.start).getTime()) / 60000);
  const { address, lat, lng, prestationId } = rdv;
  const [moisCourant] = useState(() => new Date().toISOString().slice(0, 7));
  const [mois, setMois] = useState(moisCourant);
  const [jours, setJours] = useState<string[]>([]);
  const [jour, setJour] = useState<string>();
  const [creneaux, setCreneaux] = useState<Slot[]>([]);
  const [start, setStart] = useState<string>();
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    getAvailableDays(mois, duree, { label: address, lat, lng }, prestationId).then(setJours).catch((e: Error) => setErreur(e.message));
  }, [mois, duree, address, lat, lng, prestationId]);
  useEffect(() => {
    if (jour) getSlots(jour, duree, { label: address, lat, lng }, formule).then(setCreneaux).catch((e: Error) => setErreur(e.message));
  }, [jour, duree, address, lat, lng, formule]);

  return (
    <div className={styles.panneau}>
      <p><strong>Choisissez un nouveau créneau.</strong></p>
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <div className={styles.calendrier}>
        <Calendar month={mois} minMonth={moisCourant} availableDays={jours} selected={jour}
          onSelect={(d) => { setJour(d); setStart(undefined); }} onMonthChange={setMois} />
        {jour && <SlotPicker title="Heure d'arrivée" slots={creneaux} selected={start} onSelect={setStart} emptyMessage="Plus aucun créneau ce jour-là." />}
      </div>
      <div className={styles.actions}>
        <Button disabled={!start} loading={enCours} loadingLabel="Déplacement…" onClick={() => start && onChoisir(start)}>{libelle}</Button>
        <Button variant="ghost" onClick={onFermer}>Fermer</Button>
      </div>
    </div>
  );
}
