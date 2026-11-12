import { useEffect, useState, type FormEvent } from 'react';
import { AddressInput, Button, Field, Toggle } from '@bsandoz/ui';
import { searchAddress, type Address } from '../../services/api';
import { enregistrerRegles, enregistrerZone, reglages, type Regles, type Zone } from '../../services/pro';
import styles from './Pro.module.css';

const CHAMPS_REGLES: { cle: keyof Regles; label: string; aide: string }[] = [
  { cle: 'minNoticeHours', label: 'Délai minimum avant un rendez-vous (heures)', aide: 'Un client ne peut pas réserver moins de … heures à l’avance.' },
  { cle: 'horizonDays', label: 'Réservation possible jusqu’à (jours)', aide: 'Nombre de jours ouverts à la réservation.' },
  { cle: 'bufferMin', label: 'Battement entre deux rendez-vous (minutes)', aide: 'Temps de rangement ajouté après chaque prestation, en plus du trajet.' },
  { cle: 'slotStepMin', label: 'Pas des créneaux (minutes)', aide: 'Ex. 30 : arrivées proposées à 8h00, 8h30, 9h00…' },
  { cle: 'freeCancelHours', label: 'Annulation gratuite jusqu’à (heures avant)', aide: 'Avant ce délai, l’acompte est remboursé automatiquement.' },
  { cle: 'depositPercent', label: 'Acompte (% du total)', aide: '0 : pas d’acompte, le rendez-vous est confirmé sans paiement.' },
  { cle: 'depositFixedCents', label: 'Acompte fixe (centimes)', aide: 'Utilisé à la place du pourcentage s’il est supérieur à 0.' },
  { cle: 'holdMinutes', label: 'Créneau bloqué pendant le paiement (minutes)', aide: 'Temps laissé au client pour régler l’acompte.' },
];

export function ReglagesOnglet() {
  const [regles, setRegles] = useState<Record<keyof Regles, string>>();
  const [zone, setZone] = useState<Zone | null>(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    reglages().then((r) => {
      setRegles(Object.fromEntries(Object.entries(r.rules).map(([k, v]) => [k, String(v)])) as Record<keyof Regles, string>);
      setZone(r.zone);
    }).catch((e: Error) => setErreur(e.message));
  }, []);

  if (erreur) return <p className={styles.erreur} role="alert">{erreur}</p>;
  if (!regles) return <p aria-busy="true">Chargement…</p>;

  return (
    <>
      <FormulaireRegles initiales={regles} />
      <FormulaireZone initiale={zone} />
    </>
  );
}

function FormulaireRegles({ initiales }: { initiales: Record<keyof Regles, string> }) {
  const [valeurs, setValeurs] = useState(initiales);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const valide = Object.values(valeurs).every((v) => /^\d+$/.test(v));

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(''); setErreur('');
    try {
      await enregistrerRegles(Object.fromEntries(Object.entries(valeurs).map(([k, v]) => [k, Number(v)])) as unknown as Regles);
      setMessage('Règles de réservation enregistrées.');
    } catch (err) {
      setErreur((err as Error).message);
    }
  };

  return (
    <form className={styles.section} onSubmit={enregistrer} noValidate aria-labelledby="titre-regles">
      <h2 id="titre-regles">Règles de réservation</h2>
      <div className={`${styles.panneau} ${styles.grille}`}>
        {CHAMPS_REGLES.map((c) => (
          <Field key={c.cle} label={c.label} hint={c.aide} inputMode="numeric" value={valeurs[c.cle]}
            onChange={(e) => setValeurs({ ...valeurs, [c.cle]: e.target.value })} error={/^\d+$/.test(valeurs[c.cle]) ? undefined : 'Nombre entier attendu.'} />
        ))}
      </div>
      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <div><Button type="submit" disabled={!valide}>Enregistrer les règles</Button></div>
    </form>
  );
}

function FormulaireZone({ initiale }: { initiale: Zone | null }) {
  const [deplacement, setDeplacement] = useState(initiale !== null);
  const [origine, setOrigine] = useState<Address | null>(initiale ? { label: 'Point de départ actuel', lat: initiale.originLat, lng: initiale.originLng } : null);
  const [rayon, setRayon] = useState(String(initiale?.freeRadiusKm ?? 15));
  const [prixKm, setPrixKm] = useState(((initiale?.pricePerKmCents ?? 50) / 100).toFixed(2).replace('.', ','));
  const [max, setMax] = useState(String(initiale?.maxDistanceKm ?? 50));
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  const nombre = (t: string) => Number(t.replace(',', '.'));
  const valide = !deplacement || (origine !== null && nombre(rayon) >= 0 && nombre(prixKm) >= 0 && nombre(max) > 0 && nombre(max) >= nombre(rayon));

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(''); setErreur('');
    try {
      await enregistrerZone(deplacement && origine ? {
        originLat: origine.lat, originLng: origine.lng, freeRadiusKm: nombre(rayon), pricePerKmCents: Math.round(nombre(prixKm) * 100), maxDistanceKm: nombre(max),
        ...(initiale?.roadFactor ? { roadFactor: initiale.roadFactor } : {}), ...(initiale?.averageSpeedKmh ? { averageSpeedKmh: initiale.averageSpeedKmh } : {}),
      } : null);
      setMessage('Zone d’intervention enregistrée.');
    } catch (err) {
      setErreur((err as Error).message);
    }
  };

  return (
    <form className={styles.section} onSubmit={enregistrer} noValidate aria-labelledby="titre-zone">
      <h2 id="titre-zone">Zone d’intervention</h2>
      <div className={styles.panneau}>
        <Toggle label="Je me déplace chez le client" checked={deplacement} onChange={setDeplacement}
          hint={deplacement ? 'Le trajet est compté entre deux rendez-vous et les frais de déplacement ajoutés au-delà du rayon offert.' : 'Activité sur place : pas d’adresse demandée, les rendez-vous s’enchaînent.'} />
        {deplacement && (
          <>
            <AddressInput label="Point de départ" search={searchAddress} value={origine} onSelect={setOrigine} hint="Votre adresse ou celle de votre atelier." />
            <div className={styles.grille}>
              <Field label="Déplacement offert jusqu’à (km)" inputMode="decimal" value={rayon} onChange={(e) => setRayon(e.target.value)} />
              <Field label="Prix par km au-delà (€)" inputMode="decimal" value={prixKm} onChange={(e) => setPrixKm(e.target.value)} />
              <Field label="Distance maximale (km)" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)}
                error={nombre(max) < nombre(rayon) ? 'Doit être au moins égale au rayon offert.' : undefined} />
            </div>
          </>
        )}
        {message && <p className={styles.ok} role="status">{message}</p>}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <div><Button type="submit" disabled={!valide}>Enregistrer la zone</Button></div>
      </div>
    </form>
  );
}
