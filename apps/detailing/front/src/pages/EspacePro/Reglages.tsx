import { useEffect, useState, type FormEvent } from 'react';
import { AddressInput, Button, Field, Toggle } from '@bsandoz/ui';
import { searchAddress, type Address } from '../../services/api';
import { modifierRegleFidelite, regleFidelite, type RegleFidelite } from '../../services/fidelite';
import { enregistrerRegles, enregistrerZone, reglages, type Regles, type Zone } from '../../services/pro';
import { NotificationsPro } from './Notifications';
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
      <NotificationsPro />
      <FormulaireRegles initiales={regles} />
      <FormulaireZone initiale={zone} />
      <FormulaireFidelite />
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
  const [paliers, setPaliers] = useState<{ km: string; prix: string }[]>(() =>
    (initiale?.paliers ?? []).map((p) => ({ km: String(p.jusquaKm).replace('.', ','), prix: (p.prixCents / 100).toFixed(2).replace('.', ',') })));
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  const nombre = (t: string) => Number(t.replace(',', '.'));
  const kmPaliers = paliers.map((p) => nombre(p.km));
  const paliersValides = paliers.every((p, i) => nombre(p.km) > (i === 0 ? nombre(rayon) : kmPaliers[i - 1]) && nombre(p.prix) >= 0 && p.prix.trim() !== '' && !Number.isNaN(nombre(p.prix)));
  const valide = !deplacement || (origine !== null && nombre(rayon) >= 0 && nombre(prixKm) >= 0 && nombre(max) > 0 && nombre(max) >= nombre(rayon) && paliersValides);

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(''); setErreur('');
    try {
      await enregistrerZone(deplacement && origine ? {
        originLat: origine.lat, originLng: origine.lng, freeRadiusKm: nombre(rayon), pricePerKmCents: Math.round(nombre(prixKm) * 100), maxDistanceKm: nombre(max),
        paliers: paliers.map((p) => ({ jusquaKm: nombre(p.km), prixCents: Math.round(nombre(p.prix) * 100) })),
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
              <Field label="Distance maximale (km)" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)}
                error={nombre(max) < nombre(rayon) ? 'Doit être au moins égale au rayon offert.' : undefined} />
            </div>
            <fieldset className={styles.liste} style={{ border: 0, padding: 0 }}>
              <legend className={styles.choix}>Frais par tranches (au-delà du rayon offert)</legend>
              {paliers.map((p, i) => (
                <div key={i} className={`${styles.ligne} ${styles.petit}`}>
                  <Field label={`Tranche ${i + 1} : jusqu’à (km)`} inputMode="decimal" value={p.km}
                    onChange={(e) => setPaliers(paliers.map((x, j) => (j === i ? { ...x, km: e.target.value } : x)))}
                    error={p.km && nombre(p.km) <= (i === 0 ? nombre(rayon) : kmPaliers[i - 1]) ? 'Doit dépasser la tranche précédente (ou le rayon offert).' : undefined} />
                  <Field label={`Tranche ${i + 1} : prix (€)`} inputMode="decimal" value={p.prix}
                    onChange={(e) => setPaliers(paliers.map((x, j) => (j === i ? { ...x, prix: e.target.value } : x)))} />
                  <Button variant="ghost" onClick={() => setPaliers(paliers.filter((_, j) => j !== i))}>{`Retirer la tranche ${i + 1}`}</Button>
                </div>
              ))}
              <div><Button variant="secondary" onClick={() => setPaliers([...paliers, { km: '', prix: '' }])}>Ajouter une tranche</Button></div>
            </fieldset>
            <Field label={paliers.length > 0 ? 'Prix par km au-delà de la dernière tranche (€)' : 'Prix par km au-delà du rayon offert (€)'} inputMode="decimal" value={prixKm} onChange={(e) => setPrixKm(e.target.value)}
              hint={paliers.length > 0 ? '0 si la dernière tranche va jusqu’à la distance maximale.' : 'Chaque km commencé au-delà du rayon offert.'} />
          </>
        )}
        {message && <p className={styles.ok} role="status">{message}</p>}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <div><Button type="submit" disabled={!valide}>Enregistrer la zone</Button></div>
      </div>
    </form>
  );
}

function FormulaireFidelite() {
  const [regle, setRegle] = useState<RegleFidelite>();
  const [requis, setRequis] = useState('');
  const [remise, setRemise] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    regleFidelite().then((r) => { setRegle(r); setRequis(String(r.tamponsRequis)); setRemise(String(r.remisePercent)); }).catch((e: Error) => setErreur(e.message));
  }, []);

  if (!regle) return null;
  const valide = /^\d+$/.test(requis) && Number(requis) >= 1 && Number(requis) <= 50 && /^\d+$/.test(remise) && Number(remise) >= 1 && Number(remise) <= 100;

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(''); setErreur('');
    try {
      setRegle(await modifierRegleFidelite({ actif: regle.actif, tamponsRequis: Number(requis), remisePercent: Number(remise) }));
      setMessage('Carte de fidélité enregistrée.');
    } catch (err) {
      setErreur((err as Error).message);
    }
  };

  return (
    <form className={styles.section} onSubmit={enregistrer} noValidate aria-labelledby="titre-fidelite">
      <h2 id="titre-fidelite">Carte de fidélité</h2>
      <div className={styles.panneau}>
        <Toggle label="Carte de fidélité active" checked={regle.actif} onChange={(actif) => setRegle({ ...regle, actif })}
          hint="Un tampon à chaque prestation marquée « Terminé » ; la remise s’applique d’elle-même à la réservation suivante." />
        <div className={styles.grille}>
          <Field label="Prestations avant la remise" inputMode="numeric" value={requis} onChange={(e) => setRequis(e.target.value)} error={valide || !requis ? undefined : 'Entre 1 et 50.'} />
          <Field label="Remise (%)" inputMode="numeric" value={remise} onChange={(e) => setRemise(e.target.value)} error={valide || !remise ? undefined : 'Entre 1 et 100.'} />
        </div>
        {message && <p className={styles.ok} role="status">{message}</p>}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <div><Button type="submit" disabled={!valide}>Enregistrer la carte de fidélité</Button></div>
      </div>
    </form>
  );
}
