import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AddressInput, Button, Calendar, Field, PriceSummary, SlotPicker, Toggle } from '@bsandoz/ui';
import { VEHICLE_TYPES, type Formule, type OptionItem } from '../../data/demo';
import { getAvailableDays, getCatalog, getQuote, getSlots, searchAddress, type Address, type Quote, type Selection, type Slot } from '../../services/api';
import { ajouterRendezVous } from '../../services/pro';
import styles from './Pro.module.css';

const PLACES = [{ value: '2', label: '2 places' }, { value: '3', label: '3 places' }, { value: '4', label: '4 places et plus' }];
const CONTACT_VIDE = { firstname: '', lastname: '', email: '', phone: '', notes: '' };

/** Rendez-vous pris par téléphone : mêmes règles que la réservation en ligne, confirmé tout de suite ou lien d'acompte envoyé. */
export function RdvTelephoneOnglet() {
  const [formules, setFormules] = useState<Formule[]>([]);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [formuleId, setFormuleId] = useState('');
  const [vehicule, setVehicule] = useState('');
  const [places, setPlaces] = useState('');
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [adresse, setAdresse] = useState<Address>();
  const [devis, setDevis] = useState<Quote>();
  const [moisCourant] = useState(() => new Date().toISOString().slice(0, 7));
  const [mois, setMois] = useState(moisCourant);
  const [jours, setJours] = useState<string[]>([]);
  const [jour, setJour] = useState<string>();
  const [creneaux, setCreneaux] = useState<Slot[]>([]);
  const [start, setStart] = useState<string>();
  const [contact, setContact] = useState(CONTACT_VIDE);
  const [lienAcompte, setLienAcompte] = useState(true);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => { getCatalog().then((c) => { setFormules(c.formules); setOptions(c.options); }).catch((e: Error) => setErreur(e.message)); }, []);

  const formule = useMemo(() => formules.find((f) => f.id === formuleId), [formules, formuleId]);
  const canape = formule?.category === 'canape';
  const variante = canape ? (places ? `canape_${places}` : '') : vehicule;
  const selection = useMemo<Selection | undefined>(() => (formule && variante ? {
    formule, variante, optionIds, metierData: canape ? { category: 'canape', seats: Number(places) } : { category: 'auto', vehicleType: vehicule },
  } : undefined), [formule, variante, optionIds, canape, places, vehicule]);
  const duree = devis?.durationMin;

  useEffect(() => { if (selection) getQuote(selection, adresse).then(setDevis).catch((e: Error) => setErreur(e.message)); }, [selection, adresse]);
  useEffect(() => {
    if (adresse && duree) getAvailableDays(mois, duree, adresse, formule?.id).then(setJours).catch((e: Error) => setErreur(e.message));
  }, [mois, adresse, duree, formule]);
  useEffect(() => {
    if (jour && adresse && duree) getSlots(jour, duree, adresse, formule).then(setCreneaux).catch((e: Error) => setErreur(e.message));
  }, [jour, adresse, duree, formule]);

  const complet = !!(selection && adresse && devis?.inZone && start && contact.firstname && contact.lastname && /\S+@\S+\.\S+/.test(contact.email) && contact.phone);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (!complet || !selection || !start) return;
    setErreur('');
    setEnCours(true);
    try {
      const r = await ajouterRendezVous({
        prestationId: selection.formule.id, variante: selection.variante, optionIds, metierData: selection.metierData,
        start, address: adresse ?? null, contact, sendDepositLink: lienAcompte,
      });
      setMessage(r.status === 'confirmed' ? 'Rendez-vous enregistré et confirmé : le client reçoit un e-mail de confirmation.' : 'Rendez-vous enregistré : le client reçoit un e-mail avec le lien de paiement de l’acompte.');
      setStart(undefined); setJour(undefined); setContact(CONTACT_VIDE);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  const champ = (cle: keyof typeof CONTACT_VIDE) => ({ value: contact[cle], onChange: (ev: { target: { value: string } }) => setContact({ ...contact, [cle]: ev.target.value }) });

  return (
    <section className={styles.section} aria-labelledby="titre-telephone">
      <h2 id="titre-telephone">Rendez-vous pris par téléphone</h2>
      {message && <p className={styles.ok} role="status">{message}</p>}
      <form className={styles.panneau} onSubmit={soumettre} noValidate>
        <div className={styles.grille}>
          <label className={styles.choix}>Prestation
            <select value={formuleId} onChange={(e) => { setFormuleId(e.target.value); setOptionIds([]); }}>
              <option value="">Choisir…</option>
              {formules.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          {formule && !canape && (
            <label className={styles.choix}>Type de véhicule
              <select value={vehicule} onChange={(e) => setVehicule(e.target.value)}>
                <option value="">Choisir…</option>
                {VEHICLE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </label>
          )}
          {canape && (
            <label className={styles.choix}>Canapé
              <select value={places} onChange={(e) => setPlaces(e.target.value)}>
                <option value="">Choisir…</option>
                {PLACES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
          )}
        </div>
        {formule && options.filter((o) => formule.optionIds.includes(o.id)).length > 0 && (
          <fieldset className={styles.liste} style={{ border: 0, padding: 0 }}>
            <legend className={styles.choix}>Options</legend>
            {options.filter((o) => formule.optionIds.includes(o.id)).map((o) => (
              <label key={o.id} className={styles.case}>
                <input type="checkbox" checked={optionIds.includes(o.id)} onChange={() => setOptionIds(optionIds.includes(o.id) ? optionIds.filter((x) => x !== o.id) : [...optionIds, o.id])} />
                {o.name}
              </label>
            ))}
          </fieldset>
        )}
        <AddressInput label="Adresse de l'intervention" search={searchAddress} value={adresse} onSelect={(a: Address) => { setAdresse(a); setJour(undefined); setStart(undefined); }}
          error={devis && adresse && !devis.inZone ? 'Adresse hors de la zone d’intervention.' : undefined} />
        {devis && <PriceSummary lines={devis.lines} totalCents={devis.totalCents} depositCents={devis.depositCents} footnote={`Durée estimée : ${Math.round((devis.durationMin / 60) * 10) / 10} h.`} />}
        {adresse && devis?.inZone && (
          <div className={styles.grille}>
            <Calendar month={mois} minMonth={moisCourant} availableDays={jours} selected={jour} onSelect={(d) => { setJour(d); setStart(undefined); }} onMonthChange={setMois} />
            {jour && <SlotPicker title="Heure d'arrivée" slots={creneaux} selected={start} onSelect={setStart} emptyMessage="Plus aucun créneau ce jour-là." />}
          </div>
        )}
        <div className={styles.grille}>
          <Field label="Prénom" required {...champ('firstname')} />
          <Field label="Nom" required {...champ('lastname')} />
          <Field label="E-mail" type="email" required {...champ('email')} />
          <Field label="Téléphone" type="tel" required {...champ('phone')} />
        </div>
        <Field label="Précisions" multiline rows={2} {...champ('notes')} />
        <Toggle label="Envoyer un lien de paiement de l’acompte" checked={lienAcompte} onChange={setLienAcompte}
          hint={lienAcompte ? 'Le créneau est bloqué le temps que le client règle l’acompte en ligne.' : 'Le rendez-vous est confirmé tout de suite, sans acompte en ligne.'} />
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <Button type="submit" loading={enCours} disabled={!complet}>Enregistrer le rendez-vous</Button>
      </form>
    </section>
  );
}
