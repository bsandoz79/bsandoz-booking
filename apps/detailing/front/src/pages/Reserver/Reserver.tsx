import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChoiceChips, OptionCard, PriceSummary, SlotPicker, Stepper, formatEuros } from '@bsandoz/ui';
import type { Category, Formule, OptionItem } from '../../data/demo';
import { VEHICLE_TYPES } from '../../data/demo';
import { suggestVehicleType } from '../../data/vehicles';
import type { Address, Quote } from '../../services/api';
import { getAvailableDays, getCatalog, getQuote, getSlots, reserve, searchAddress } from '../../services/api';
import styles from './Reserver.module.css';

const currentMonth = () => new Date().toISOString().slice(0, 7);

/** Parcours de réservation en étapes. Tout le contenu (formules, prix, créneaux) vient de l'API. */
export function Reserver() {
  const [step, setStep] = useState(0);
  const [formules, setFormules] = useState<Formule[]>([]);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [category, setCategory] = useState<Category>();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [vehicleType, setVehicleType] = useState<string>();
  const [seats, setSeats] = useState<string>();
  const [formuleId, setFormuleId] = useState<string>();
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [address, setAddress] = useState<Address>();
  const [month, setMonth] = useState(currentMonth());
  const [days, setDays] = useState<string[]>([]);
  const [day, setDay] = useState<string>();
  const [slots, setSlots] = useState<{ start: string; label: string }[]>([]);
  const [start, setStart] = useState<string>();
  const [contact, setContact] = useState({ firstname: '', lastname: '', email: '', phone: '', notes: '' });
  const [terms, setTerms] = useState(false);
  const [quote, setQuote] = useState<Quote>();
  const [error, setError] = useState('');

  const steps = category === 'canape'
    ? ['Prestation', 'Canapé', 'Formule', 'Options', 'Adresse', 'Créneau', 'Coordonnées', 'Récapitulatif']
    : ['Prestation', 'Véhicule', 'Formule', 'Options', 'Adresse', 'Créneau', 'Coordonnées', 'Récapitulatif'];

  const variante = category === 'canape' ? (seats ? `canape_${seats}` : undefined) : vehicleType;
  const formule = formules.find((f) => f.id === formuleId);
  const formulesVisibles = useMemo(() => formules.filter((f) => f.category === category), [formules, category]);
  const optionsVisibles = options.filter((o) => formule?.optionIds.includes(o.id));

  useEffect(() => { getCatalog().then((c) => { setFormules(c.formules); setOptions(c.options); }); }, []);
  useEffect(() => {
    if (formule && variante) getQuote(formule, variante, optionIds, address).then(setQuote).catch((e) => setError(e.message));
  }, [formule, variante, optionIds, address]);
  useEffect(() => {
    if (step === 5 && address && quote) getAvailableDays(month, quote.durationMin, address).then(setDays);
  }, [step, month, address, quote]);
  useEffect(() => {
    if (day && address && quote) getSlots(day, quote.durationMin, address).then(setSlots);
  }, [day, address, quote]);
  useEffect(() => {
    const id = setTimeout(() => { searchAddress(addressQuery).then(setSuggestions).catch(() => setSuggestions([])); }, 300);
    return () => clearTimeout(id);
  }, [addressQuery]);

  const updateVehicle = (nextBrand: string, nextModel: string) => {
    setBrand(nextBrand);
    setModel(nextModel);
    const suggested = suggestVehicleType(nextBrand, nextModel);
    if (suggested) setVehicleType(suggested);
  };

  const canNext = [
    !!category,
    category === 'canape' ? !!seats : !!(brand.trim() && model.trim() && vehicleType),
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
    if (!formule || !address || !start) return;
    try {
      const { paymentUrl } = await reserve({
        formuleId: formule.id, optionIds, start, address, ...contact, acceptedTerms: terms,
        metierData: category === 'canape' ? { category, seats: Number(seats) } : { category, brand, model, vehicleType },
      });
      window.location.assign(paymentUrl);
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <main className={`container ${styles.page}`}>
      <h1 className={styles.title}>Réserver</h1>
      <Stepper steps={steps} current={step} />

      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="etape-titre">
          <h2 id="etape-titre" className={styles.stepTitle}>{steps[step]}</h2>

          {step === 0 && (
            <ChoiceChips label="Prestation" value={category} onChange={(v) => { setCategory(v as Category); setFormuleId(undefined); setOptionIds([]); }}
              choices={[{ value: 'auto', label: 'Mon véhicule' }, { value: 'canape', label: 'Mon canapé' }]} />
          )}

          {step === 1 && category === 'auto' && (
            <div className={styles.fields}>
              <label className={styles.field}>Marque<input value={brand} onChange={(e) => updateVehicle(e.target.value, model)} placeholder="Ex. Peugeot" required /></label>
              <label className={styles.field}>Modèle<input value={model} onChange={(e) => updateVehicle(brand, e.target.value)} placeholder="Ex. 3008" required /></label>
              <ChoiceChips label="Type de véhicule" value={vehicleType} onChange={setVehicleType} choices={VEHICLE_TYPES} />
              <p className={styles.hint}>Le prix est ajusté sur place si le véhicule ne correspond pas au type choisi.</p>
            </div>
          )}
          {step === 1 && category === 'canape' && (
            <ChoiceChips label="Nombre de places" value={seats} onChange={setSeats}
              choices={[{ value: '2', label: '2 places' }, { value: '3', label: '3 places' }, { value: '4', label: '4 places et plus' }]} />
          )}

          {step === 2 && (
            <div className={styles.cards}>
              {formulesVisibles.map((f) => {
                const tarif = variante ? f.tarifs[variante] : undefined;
                return (
                  <OptionCard key={f.id} title={f.name} description={f.description} badge={f.badge}
                    priceLabel={tarif ? formatEuros(tarif.priceCents) : undefined}
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
              <label className={styles.field}>Adresse de l'intervention
                <input value={addressQuery} onChange={(e) => { setAddressQuery(e.target.value); setAddress(undefined); }} placeholder="N°, rue, ville" autoComplete="street-address" />
              </label>
              {!address && suggestions.length > 0 && (
                <ul className={styles.suggestions}>
                  {suggestions.map((s) => (
                    <li key={s.label}><button type="button" onClick={() => { setAddress(s); setAddressQuery(s.label); }}>{s.label}</button></li>
                  ))}
                </ul>
              )}
              {address && quote && (quote.inZone
                ? <p className={styles.ok}>✓ Je me déplace chez vous{quote.travelFeeCents > 0 ? ` (frais de déplacement : ${formatEuros(quote.travelFeeCents)})` : ', déplacement offert'}.</p>
                : <p className={styles.error}>Cette adresse est hors de ma zone d'intervention. Contactez-moi pour en parler.</p>)}
            </div>
          )}

          {step === 5 && (
            <div className={styles.dateTime}>
              <Calendar month={month} minMonth={currentMonth()} availableDays={days} selected={day}
                onSelect={(d) => { setDay(d); setStart(undefined); }} onMonthChange={setMonth} />
              {day && <SlotPicker title="Heure d'arrivée" slots={slots} selected={start} onSelect={setStart} />}
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
              <p>{formule?.name} · {category === 'canape' ? `canapé ${seats} places` : `${brand} ${model}`}</p>
              <p>{start && new Date(start).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
              <p>{address?.label}</p>
              <label className={styles.check}><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> J'accepte les <a href="/cgv" target="_blank" rel="noreferrer">conditions générales de vente</a>.</label>
            </div>
          )}

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.actions}>
            {step > 0 && <button type="button" className="btn btn--ghost" onClick={() => setStep(step - 1)}>Retour</button>}
            <button type="button" className="btn" disabled={!canNext} onClick={next}>
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
