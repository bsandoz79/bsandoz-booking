import { useEffect, useState, type FormEvent } from 'react';
import { AddressInput, Button, Field, Toggle } from '@bsandoz/ui';
import { searchAddress, type Address } from '../../services/api';
import { modifierRegleFidelite, regleFidelite, type RegleFidelite } from '../../services/fidelite';
import { adresseAgendaPro, enregistrerRegles, enregistrerSeuilCreneauxGroupes, enregistrerZone, reglages, seuilCreneauxGroupes, type Regles, type Zone } from '../../services/pro';
import { enregistrerAvis, reglageAvis, type ReglageAvis } from '../../services/avis';
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
      <SynchroAgenda />
      <FormulaireRegles initiales={regles} />
      <FormulaireCreneauxGroupes />
      <FormulaireZone initiale={zone} />
      <FormulaireFidelite />
      <FormulaireAvis />
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

/** Zone d'intervention seule (chargée à l'ouverture), pour le mode « Modifier » du site. */
export function ReglageZone() {
  const [zone, setZone] = useState<Zone | null>();
  useEffect(() => { reglages().then((r) => setZone(r.zone)).catch(() => setZone(null)); }, []);
  return zone === undefined ? <p aria-busy="true">Chargement…</p> : <FormulaireZone initiale={zone} />;
}

function FormulaireZone({ initiale }: { initiale: Zone | null }) {
  const [deplacement, setDeplacement] = useState(initiale !== null);
  const [origine, setOrigine] = useState<Address | null>(initiale ? { label: 'Point de départ actuel', lat: initiale.originLat, lng: initiale.originLng } : null);
  const [rayon, setRayon] = useState(String(initiale?.freeRadiusKm ?? 15));
  const [rayonVille, setRayonVille] = useState(String(initiale?.rayonVilleKm ?? 0).replace('.', ','));
  const [prixKm, setPrixKm] = useState(((initiale?.pricePerKmCents ?? 50) / 100).toFixed(2).replace('.', ','));
  const [max, setMax] = useState(String(initiale?.maxDistanceKm ?? 50));
  const [paliers, setPaliers] = useState<{ km: string; prix: string }[]>(() =>
    (initiale?.paliers ?? []).map((p) => ({ km: String(p.jusquaKm).replace('.', ','), prix: (p.prixCents / 100).toFixed(2).replace('.', ',') })));
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  const nombre = (t: string) => Number(t.replace(',', '.'));
  const kmPaliers = paliers.map((p) => nombre(p.km));
  const paliersValides = paliers.every((p, i) => nombre(p.km) > (i === 0 ? nombre(rayon) : kmPaliers[i - 1]) && nombre(p.prix) >= 0 && p.prix.trim() !== '' && !Number.isNaN(nombre(p.prix)));
  const valide = !deplacement || (origine !== null && nombre(rayon) >= 0 && nombre(prixKm) >= 0 && nombre(max) > 0 && nombre(max) >= nombre(rayon) && paliersValides && nombre(rayonVille) >= 0 && nombre(rayonVille) <= 30);

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(''); setErreur('');
    try {
      await enregistrerZone(deplacement && origine ? {
        originLat: origine.lat, originLng: origine.lng, freeRadiusKm: nombre(rayon), pricePerKmCents: Math.round(nombre(prixKm) * 100), maxDistanceKm: nombre(max), rayonVilleKm: nombre(rayonVille),
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
              <Field label="Rayon de la ville de départ (km)" inputMode="decimal" value={rayonVille} onChange={(e) => setRayonVille(e.target.value)}
                hint="Toute la ville compte pour 0 km : le déplacement offert et les tranches se comptent à partir de sa sortie. 0 : depuis le point de départ." />
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

export function FormulaireFidelite() {
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

function FormulaireAvis() {
  const [avis, setAvis] = useState<ReglageAvis>();
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  useEffect(() => { reglageAvis().then((r) => setAvis({ ...r, actif: r.actif || r.lien === '' })).catch((e: Error) => setErreur(e.message)); }, []);

  if (!avis) return null;
  const valide = avis.lien.trim() === '' || /^https:\/\/\S+$/.test(avis.lien.trim());

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(''); setErreur('');
    try {
      const r = await enregistrerAvis(avis);
      setAvis({ ...r, actif: r.actif || r.lien === '' });
      setMessage(r.lien ? (r.actif ? 'Demande d’avis activée.' : 'Demande d’avis désactivée.') : 'Aucun lien : pas de demande d’avis pour le moment.');
    } catch (err) {
      setErreur((err as Error).message);
    }
  };

  return (
    <form className={styles.section} onSubmit={enregistrer} noValidate aria-labelledby="titre-avis">
      <h2 id="titre-avis">Avis Google</h2>
      <div className={styles.panneau}>
        <p className={styles.aide}>Quand un rendez-vous passe à « Terminé », le client reçoit sa facture par e-mail avec un bouton « Laisser un avis ». Lien à copier depuis votre fiche Google (« Demander des avis »).</p>
        <Field label="Lien de votre page d’avis" type="url" value={avis.lien} placeholder="https://g.page/r/…/review" onChange={(e) => setAvis({ ...avis, lien: e.target.value })}
          hint="Vide : pas de demande d’avis (à compléter quand votre fiche Google sera créée)." error={valide ? undefined : 'Adresse https:// complète attendue.'} />
        <Toggle label="Demander un avis après chaque prestation" checked={avis.actif} onChange={(actif) => setAvis({ ...avis, actif })} />
        {message && <p className={styles.ok} role="status">{message}</p>}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <div><Button type="submit" disabled={!valide}>Enregistrer</Button></div>
      </div>
    </form>
  );
}

function FormulaireCreneauxGroupes() {
  const [seuil, setSeuil] = useState<string>();
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  useEffect(() => { seuilCreneauxGroupes().then((s) => setSeuil(String(s))).catch(() => undefined); }, []);

  if (seuil === undefined) return null;
  const valide = /^\d+$/.test(seuil) && Number(seuil) <= 240;

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(''); setErreur('');
    try {
      const s = await enregistrerSeuilCreneauxGroupes(Number(seuil));
      setMessage(s === 0 ? 'Créneaux groupés désactivés.' : `Créneaux à ${s} min ou moins d’un rendez-vous mis en avant.`);
    } catch (err) {
      setErreur((err as Error).message);
    }
  };

  return (
    <form className={styles.section} onSubmit={enregistrer} noValidate aria-labelledby="titre-groupes">
      <h2 id="titre-groupes">Créneaux groupés</h2>
      <div className={styles.panneau}>
        <p className={styles.aide}>À la réservation, les heures juste avant ou juste après un rendez-vous déjà prévu sont marquées « Conseillé » : vos rendez-vous s’enchaînent et vous roulez moins.</p>
        <Field label="Écart maximal avec un rendez-vous (minutes)" inputMode="numeric" value={seuil} onChange={(e) => setSeuil(e.target.value)}
          hint="Trajets compris. 0 : aucune mise en avant. Conseillé : 15 à 30." error={valide || seuil === '' ? undefined : 'Entre 0 et 240.'} />
        {message && <p className={styles.ok} role="status">{message}</p>}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <div><Button type="submit" disabled={!valide}>Enregistrer les créneaux groupés</Button></div>
      </div>
    </form>
  );
}

/**
 * Agenda du pro : le flux iCal (tous les rendez-vous, mis à jour tout seul) s'ajoute une fois dans Google Agenda,
 * Apple Calendrier ou Outlook ; chaque nouveau rendez-vous y apparaît ensuite automatiquement.
 */
function SynchroAgenda() {
  const [url, setUrl] = useState<string | null>();
  const [copie, setCopie] = useState(false);
  useEffect(() => { adresseAgendaPro().then(setUrl).catch(() => setUrl(null)); }, []);
  if (url === undefined) return null;
  const webcal = url?.replace(/^https?:/, 'webcal:');

  return (
    <section className={styles.section} aria-labelledby="titre-agenda">
      <h2 id="titre-agenda">Mon agenda</h2>
      <div className={styles.panneau}>
        {url ? (
          <>
            <p className={styles.aide}>À faire une seule fois : tous vos rendez-vous apparaissent ensuite automatiquement dans votre agenda (nouveaux, déplacés, annulés). Google met parfois quelques heures à rafraîchir.</p>
            <div className={styles.actions}>
              <a className="btn" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal!)}`} target="_blank" rel="noreferrer">Ajouter à Google Agenda</a>
              <a className="btn btn--ghost" href={webcal}>Apple Calendrier / Outlook</a>
              <Button variant="ghost" onClick={async () => { await navigator.clipboard?.writeText(url); setCopie(true); }}>{copie ? 'Adresse copiée' : 'Copier l’adresse'}</Button>
            </div>
            <p className={styles.aide}>Gardez cette adresse pour vous : elle donne accès à vos rendez-vous.</p>
          </>
        ) : (
          <p className={styles.aide}>Pas encore activé : sur le serveur, ajoutez <code>BSANDOZ_ICAL_SECRET=</code> suivi d’une suite d’au moins 32 caractères au hasard dans le fichier <code>.env.local</code> de l’API, puis relancez <code>sh deploy/apres-envoi.sh</code>.</p>
        )}
      </div>
    </section>
  );
}
