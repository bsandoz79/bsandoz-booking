import { useEffect, useState } from 'react';
import { Button, Calendar, SlotPicker, formatEuros } from '@bsandoz/ui';
import type { Formule } from '../../data/demo';
import { getAvailableDays, getSlots, type Slot } from '../../services/api';
import type { RendezVous } from '../../services/compte';
import styles from './CarteRendezVous.module.css';

const STATUTS: Record<RendezVous['status'], string> = {
  pending_payment: 'En attente de l’acompte',
  confirmed: 'Confirmé',
  done: 'Terminé',
  cancelled: 'Annulé',
  expired: 'Expiré (acompte non réglé)',
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
}

/** Un rendez-vous du client : détails, déplacement (nouveau créneau) et annulation (acompte remboursé si annulation gratuite). */
export function CarteRendezVous({ rdv, formule, maintenant: maintenantFourni, onDeplacer, onAnnuler }: Props) {
  const [maintenantInitial] = useState(() => new Date());
  const maintenant = maintenantFourni ?? maintenantInitial;
  const [mode, setMode] = useState<'aucun' | 'deplacer' | 'annuler'>('aucun');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const aVenir = new Date(rdv.start) > maintenant;
  const modifiable = aVenir && rdv.status === 'confirmed';
  const annulationGratuite = maintenant <= new Date(rdv.freeCancelUntil);

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
      {rdv.produits && rdv.produits.length > 0 && <p>Produits apportés le jour J : {rdv.produits.map((p) => `${p.quantite} × ${p.nom}`).join(', ')} (payés : {formatEuros(rdv.produitsCents ?? 0)})</p>}
      <p className={styles.montants}>Total {formatEuros(rdv.totalCents)}{rdv.remiseFideliteCents ? ` (remise fidélité de ${formatEuros(rdv.remiseFideliteCents)} incluse)` : ''} · acompte {formatEuros(rdv.depositCents)} · solde à régler sur place</p>
      {modifiable && (
        <p className={styles.aide}>
          {annulationGratuite
            ? `Annulation gratuite jusqu’au ${dateLongue(rdv.freeCancelUntil)} : l’acompte vous sera remboursé.`
            : 'Le délai d’annulation gratuite est dépassé : en cas d’annulation, l’acompte reste dû.'}
        </p>
      )}

      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      {modifiable && mode === 'aucun' && (
        <div className={styles.actions}>
          {annulationGratuite && <Button variant="secondary" onClick={() => { setMessage(''); setMode('deplacer'); }}>Déplacer</Button>}
          <Button variant="ghost" onClick={() => { setMessage(''); setMode('annuler'); }}>Annuler le rendez-vous</Button>
        </div>
      )}

      {mode === 'deplacer' && (
        <Deplacement rdv={rdv} formule={formule} enCours={enCours} onFermer={() => setMode('aucun')}
          onChoisir={(start) => agir(async () => { await onDeplacer(start); return `Rendez-vous déplacé au ${dateLongue(start)}. Un e-mail de confirmation vous est envoyé.`; })} />
      )}

      {mode === 'annuler' && (
        <div className={styles.panneau}>
          <p><strong>Confirmer l’annulation ?</strong> {annulationGratuite ? 'L’acompte vous sera remboursé sous quelques jours.' : 'L’acompte ne sera pas remboursé.'}</p>
          <div className={styles.actions}>
            <Button loading={enCours} loadingLabel="Annulation…"
              onClick={() => agir(async () => {
                const { refundable } = await onAnnuler();
                return refundable ? 'Rendez-vous annulé. L’acompte vous sera remboursé.' : 'Rendez-vous annulé.';
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

function Deplacement({ rdv, formule, enCours, onChoisir, onFermer }: {
  rdv: RendezVous; formule?: Formule; enCours: boolean; onChoisir: (start: string) => void; onFermer: () => void;
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
        <Button disabled={!start} loading={enCours} loadingLabel="Déplacement…" onClick={() => start && onChoisir(start)}>Confirmer le nouveau créneau</Button>
        <Button variant="ghost" onClick={onFermer}>Fermer</Button>
      </div>
    </div>
  );
}
