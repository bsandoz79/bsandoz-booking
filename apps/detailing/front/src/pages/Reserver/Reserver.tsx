import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AddressInput, Calendar, ChoiceChips, OptionCard, PriceSummary, SlotPicker, Stepper, formatEuros } from '@bsandoz/ui';
import type { Category, Formule, OptionItem } from '../../data/demo';
import { CATEGORIES, VEHICLE_TYPES, tarifDe } from '../../data/demo';
import { suggestVehicleType } from '../../data/vehicles';
import type { Address, Quote, Selection, Slot } from '../../services/api';
import { getAvailableDays, getCatalog, getQuote, getSlots, reserve, searchAddress } from '../../services/api';
import { PAGES_SEO } from '../../seo/donnees';
import { useSeo } from '../../seo/useSeo';
import styles from './Reserver.module.css';

const currentMonth = () => new Date().toISOString().slice(0, 7);

/** Parcours de réservation en étapes. Tout le contenu (formules, prix, créneaux) vient de l'API. */
export function Reserver() {
  const navigate = useNavigate();
  useSeo(PAGES_SEO[1].titre, PAGES_SEO[1].description);
  const [params] = useSearchParams();
  const paiementAnnule = params.get('paiement') === 'annule';
  const [step, setStep] = useState(0);
  const [formules, setFormules] = useState<Formule[]>([]);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [category, setCategory] = useState<Category>();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [vehicleType, setVehicleType] = useState<string>();
  const [formuleId, setFormuleId] = useState<string>();
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [address, setAddress] = useState<Address>();
  const [month, setMonth] = useState(currentMonth());
  const [days, setDays] = useState<string[]>([]);
  const [day, setDay] = useState<string>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [start, setStart] = useState<string>();
  const [contact, setContact] = useState({ firstname: '', lastname: '', email: '', phone: '', notes: '' });
  const [terms, setTerms] = useState(false);
  const [quote, setQuote] = useState<Quote>();
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const steps = ['Prestation', 'Véhicule', 'Formule', 'Options', 'Adresse', 'Créneau', 'Coordonnées', 'Récapitulatif'];

  const variante = vehicleType;
  const formule = useMemo(() => formules.find((f) => f.id === formuleId), [formules, formuleId]);
  const formulesVisibles = useMemo(() => formules.filter((f) => f.category === category), [formules, category]);
  const optionsVisibles = options.filter((o) => formule?.optionIds.includes(o.id));
  const metierData = useMemo<Record<string, unknown>>(
    () => ({ category, brand, model, vehicleType }),
    [category, brand, model, vehicleType],
  );
  const selection = useMemo<Selection | undefined>(
    () => (formule && variante ? { formule, variante, optionIds, metierData } : undefined),
    [formule, variante, optionIds, metierData],
  );
  const dureeMin = quote?.durationMin;

  useEffect(() => {
    // « Choisir » sur l'accueil : /reserver?formule=<id> présélectionne la catégorie et la formule.
    const choisie = params.get('formule');
    getCatalog().then((c) => {
      setFormules(c.formules);
      setOptions(c.options);
      const f = c.formules.find((x) => x.id === choisie);
      if (f) { setCategory(f.category as Category); setFormuleId(f.id); }
    }).catch((e: Error) => setError(e.message));
  }, [params]);
  useEffect(() => {
    if (selection) getQuote(selection, address).then(setQuote).catch((e: Error) => setError(e.message));
  }, [selection, address]);
  useEffect(() => {
    if (step === 5 && address && dureeMin) getAvailableDays(month, dureeMin, address, formule?.id).then(setDays).catch((e: Error) => setError(e.message));
  }, [step, month, address, dureeMin, formule]);
  useEffect(() => {
    if (day && address && dureeMin) getSlots(day, dureeMin, address, formule).then(setSlots).catch((e: Error) => setError(e.message));
  }, [day, address, dureeMin, formule]);

  const updateVehicle = (nextBrand: string, nextModel: string) => {
    setBrand(nextBrand);
    setModel(nextModel);
    const suggested = suggestVehicleType(nextBrand, nextModel);
    if (suggested) setVehicleType(suggested);
  };

  const canNext = [
    !!category,
    !!(brand.trim() && model.trim() && vehicleType),
    !!formule,
    true,
    !!address && quote?.inZone !== false,
    !!start,
    !!(contact.firstname && contact.lastname && /\S+@\S+\.\S+/.test(contact.email) && contact.phone),
    terms,
  ][step];

  const next = async () => {
    setError('');
    if (step < steps.length - 1) { setStep(step + 1); return; }
    if (!selection || !address || !start) return;
    setSending(true);
    try {
      const resultat = await reserve(selection, start, address, contact, terms);
      if (resultat.paymentUrl?.startsWith('/')) {
        navigate(resultat.paymentUrl);
      } else if (resultat.paymentUrl) {
        window.location.assign(resultat.paymentUrl);
      } else if (resultat.status === 'confirmed') {
        navigate(`/confirmation?reservation=${encodeURIComponent(resultat.reservationId)}`);
      } else {
        setError(resultat.paymentError ?? 'Le paiement en ligne est momentanément indisponible. Merci de me contacter pour confirmer le rendez-vous.');
      }
    } catch (e) {
      setError((e as Error).message);
      if ((e as { status?: number }).status === 422) { setStart(undefined); setStep(5); }
    } finally {
      setSending(false);
    }
  };

  return (
    <main className={`container ${styles.page}`}>
      <h1 className={styles.title}>Réserver</h1>
      <Stepper steps={steps} current={step} />
      {paiementAnnule && step === 0 && (
        <p className={styles.info} role="status">Le paiement de l'acompte a été annulé : votre rendez-vous n'est pas confirmé. Vous pouvez recommencer la réservation.</p>
      )}

      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="etape-titre">
          <h2 id="etape-titre" className={styles.stepTitle}>{steps[step]}</h2>

          {step === 0 && (
            <div className={styles.fields}>
              <ChoiceChips label="Prestation" value={category} onChange={(v) => { setCategory(v as Category); setFormuleId(undefined); setOptionIds([]); }}
                choices={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
              {category && <p className={styles.hint}>{CATEGORIES.find((c) => c.value === category)?.description}</p>}
            </div>
          )}

          {step === 1 && (
            <div className={styles.fields}>
              <label className={styles.field}>Marque<input value={brand} onChange={(e) => updateVehicle(e.target.value, model)} placeholder="Ex. Peugeot" required /></label>
              <label className={styles.field}>Modèle<input value={model} onChange={(e) => updateVehicle(brand, e.target.value)} placeholder="Ex. 3008" required /></label>
              <ChoiceChips label="Type de véhicule" value={vehicleType} onChange={setVehicleType} choices={VEHICLE_TYPES} />
              <p className={styles.hint}>Même prix pour tous les véhicules ; le type de véhicule aide à préparer l’intervention.</p>
            </div>
          )}

          {step === 2 && (
            <div className={styles.cards}>
              {formulesVisibles.map((f) => {
                const tarif = tarifDe(f, variante);
                return (
                  <OptionCard key={f.id} title={f.name} description={f.description} badge={f.badge}
                    priceLabel={formatEuros(tarif.priceCents)}
                    selected={f.id === formuleId} onToggle={() => { setFormuleId(f.id); setOptionIds([]); }} />
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className={styles.cards}>
              {optionsVisibles.length === 0 && <p className={styles.hint}>Aucune option pour cette formule.</p>}
              {optionsVisibles.map((o) => (
                <OptionCard key={o.id} title={o.name} description={o.description} priceLabel={`+ ${formatEuros(o.priceCents)}`}
                  selected={optionIds.includes(o.id)}
                  onToggle={() => setOptionIds(optionIds.includes(o.id) ? optionIds.filter((x) => x !== o.id) : [...optionIds, o.id])} />
              ))}
            </div>
          )}

          {step === 4 && (
            <div className={styles.fields}>
              <AddressInput label="Adresse de l'intervention" placeholder="N°, rue, ville" search={searchAddress}
                value={address} onSelect={(a: Address) => { setAddress(a); setDay(undefined); setStart(undefined); }}
                hint="Choisissez votre adresse dans la liste pour calculer le déplacement." />
              {address && quote && (quote.inZone
                ? <p className={styles.ok}>✓ Je me déplace chez vous{quote.travelFeeCents > 0 ? ` (frais de déplacement : ${formatEuros(quote.travelFeeCents)})` : ', déplacement offert'}.</p>
                : <p className={styles.error}>Cette adresse est hors de ma zone d'intervention. Contactez-moi pour en parler.</p>)}
            </div>
          )}

          {step === 5 && (
            <div className={styles.dateTime}>
              <Calendar month={month} minMonth={currentMonth()} availableDays={days} selected={day}
                onSelect={(d) => { setDay(d); setStart(undefined); }} onMonthChange={setMonth} />
              {formule?.occupePlage && <p className={styles.hint}>Cette prestation occupe la demi-journée : seules les arrivées en début de matinée ou d'après-midi sont proposées.</p>}
              {day && <SlotPicker title="Heure d'arrivée" slots={slots} selected={start} onSelect={setStart} emptyMessage="Plus aucun créneau ce jour-là : choisissez un autre jour." />}
            </div>
          )}

          {step === 6 && (
            <div className={styles.fields}>
              <label className={styles.field}>Prénom<input value={contact.firstname} onChange={(e) => setContact({ ...contact, firstname: e.target.value })} autoComplete="given-name" /></label>
              <label className={styles.field}>Nom<input value={contact.lastname} onChange={(e) => setContact({ ...contact, lastname: e.target.value })} autoComplete="family-name" /></label>
              <label className={styles.field}>E-mail<input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" /></label>
              <label className={styles.field}>Téléphone<input type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" /></label>
              <label className={styles.field}>Précisions (accès, parking, prise électrique…)<textarea rows={3} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} /></label>
              <p className={styles.hint}>Un espace client sera créé pour suivre vos rendez-vous : vous recevrez un lien pour choisir votre mot de passe.</p>
            </div>
          )}

          {step === 7 && (
            <div className={styles.fields}>
              <p>{formule?.name} · {brand} {model}</p>
              <p>{start && new Date(start).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
              <p>{address?.label}</p>
              <p className={styles.hint}>Carte de fidélité pleine ? La remise est déduite automatiquement du total et de l’acompte.</p>
              <label className={styles.check}><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> J'accepte les <a href="/cgv" target="_blank" rel="noreferrer">conditions générales de vente</a>.</label>
            </div>
          )}

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.actions}>
            {step > 0 && <button type="button" className="btn btn--ghost" onClick={() => setStep(step - 1)}>Retour</button>}
            <button type="button" className="btn" disabled={!canNext || sending} aria-busy={sending} onClick={next}>
              {step === steps.length - 1 ? `Payer l'acompte${quote ? ` (${formatEuros(quote.depositCents)})` : ''}` : 'Continuer'}
            </button>
          </div>
        </section>

        {quote && (
          <aside className={styles.summary}>
            <PriceSummary lines={quote.lines} totalCents={quote.totalCents} depositCents={quote.depositCents}
              footnote={`Durée estimée : ${Math.round(quote.durationMin / 60 * 10) / 10} h. Solde à régler sur place.`} />
          </aside>
        )}
      </div>
    </main>
  );
}
