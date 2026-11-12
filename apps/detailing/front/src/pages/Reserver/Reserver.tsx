import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AddressInput, Calendar, ChoiceChips, OptionCard, PriceSummary, SlotPicker, StepCard, type StepCardStatus, formatEuros } from '@bsandoz/ui';
import type { Category, Formule, OptionItem, ProduitItem } from '../../data/demo';
import { CATEGORIES, tarifDe } from '../../data/demo';
import type { Address, Quote, Selection, Slot } from '../../services/api';
import { getAvailableDays, getCatalog, getQuote, getSlots, reserve, searchAddress } from '../../services/api';
import { PAGES_SEO } from '../../seo/donnees';
import { useSeo } from '../../seo/useSeo';
import { defilerVers } from '../../app/defilement';
import { ChoixProduits } from '../../components/ChoixProduits/ChoixProduits';
import styles from './Reserver.module.css';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const ETAPES = ['Que faut-il nettoyer ?', 'Où et quand ?', 'Vos coordonnées'];
const BOUTONS = ['Choisir le créneau', 'Mes coordonnées'];

/**
 * Parcours de réservation en 3 étapes repliables : la prestation, puis l'adresse et le créneau, puis les coordonnées
 * et le paiement de l'acompte. Une étape terminée se replie en un résumé avec « Modifier ». Tout le contenu (formules,
 * prix, créneaux) vient de l'API.
 */
export function Reserver() {
  const navigate = useNavigate();
  useSeo(PAGES_SEO[1].titre, PAGES_SEO[1].description);
  const [params] = useSearchParams();
  const paiementAnnule = params.get('paiement') === 'annule';
  const [step, setStep] = useState(0);
  const [formules, setFormules] = useState<Formule[]>([]);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [produits, setProduits] = useState<ProduitItem[]>([]);
  const [quantites, setQuantites] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<Category>();
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

  // Pas de véhicule demandé : prix de base de la formule (variante vide).
  const variante = '';
  const formule = useMemo(() => formules.find((f) => f.id === formuleId), [formules, formuleId]);
  const formulesVisibles = useMemo(() => formules.filter((f) => f.category === category), [formules, category]);
  const optionsVisibles = options.filter((o) => formule?.optionIds.includes(o.id));
  const metierData = useMemo<Record<string, unknown>>(() => ({ category }), [category]);
  const selection = useMemo<Selection | undefined>(
    () => (formule ? { formule, variante, optionIds, metierData } : undefined),
    [formule, variante, optionIds, metierData],
  );
  const dureeMin = quote?.durationMin;
  const dansZone = !!address && quote?.inZone !== false;

  useEffect(() => {
    // « Choisir » sur l'accueil : /reserver?formule=<id> présélectionne la catégorie et la formule.
    const choisie = params.get('formule');
    getCatalog().then((c) => {
      setFormules(c.formules);
      setOptions(c.options);
      setProduits(c.produits);
      const f = c.formules.find((x) => x.id === choisie);
      if (f) { setCategory(f.category as Category); setFormuleId(f.id); }
    }).catch((e: Error) => setError(e.message));
  }, [params]);
  useEffect(() => {
    if (selection) getQuote(selection, address).then(setQuote).catch((e: Error) => setError(e.message));
  }, [selection, address]);
  useEffect(() => {
    if (step === 1 && address && dureeMin) getAvailableDays(month, dureeMin, address, formule?.id).then(setDays).catch((e: Error) => setError(e.message));
  }, [step, month, address, dureeMin, formule]);
  useEffect(() => {
    if (day && address && dureeMin) getSlots(day, dureeMin, address, formule).then(setSlots).catch((e: Error) => setError(e.message));
  }, [day, address, dureeMin, formule]);

  // Parcours guidé : chaque choix ouvre la partie suivante et y amène le visiteur (ou passe à l'étape suivante).
  const allerA = (id: string) => { defilerVers(id); };
  const etapeSuivante = (i: number) => { setError(''); setStep(i); };

  /** Un changement de prestation peut changer la durée : l'heure choisie est à revoir. */
  const changerPrestation = (maj: () => void) => { maj(); setStart(undefined); };

  const contactOk = !!(contact.firstname && contact.lastname && /\S+@\S+\.\S+/.test(contact.email) && contact.phone);
  const canNext = [!!(category && formule), dansZone && !!start, contactOk && terms][step];

  const next = async () => {
    setError('');
    if (step < ETAPES.length - 1) { setStep(step + 1); return; }
    if (!selection || !address || !start) return;
    setSending(true);
    try {
      const choisis = Object.entries(quantites).filter(([, q]) => q > 0).map(([id, quantite]) => ({ id, quantite }));
      const resultat = await reserve(selection, start, address, contact, terms, choisis);
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
      if ((e as { status?: number }).status === 422) { setStart(undefined); setStep(1); }
    } finally {
      setSending(false);
    }
  };

  const statut = (i: number): StepCardStatus => (i < step ? 'done' : i === step ? 'active' : 'upcoming');
  const resumePrestation = [formule?.name, ...options.filter((o) => optionIds.includes(o.id)).map((o) => o.name.toLowerCase())]
    .filter(Boolean).join(', ');
  const resumeCreneau = [
    start && new Date(start).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    address?.label,
  ].filter(Boolean).join(', ');
  // Produits : payés en entier avec l'acompte.
  const totalProduits = produits.reduce((t, p) => t + p.priceCents * (quantites[p.id] ?? 0), 0);
  const aPayer = (quote?.depositCents ?? 0) + totalProduits;
  const libelleBouton = step < ETAPES.length - 1
    ? BOUTONS[step]
    : totalProduits === 0
      ? `Payer l'acompte${quote ? ` (${formatEuros(quote.depositCents)})` : ''}`
      : `Payer ${quote?.depositCents ? 'l’acompte et les produits' : 'les produits'} (${formatEuros(aPayer)})`;

  return (
    <main className={`container ${styles.page}`}>
      <h1 className={styles.title}>Réserver</h1>
      {paiementAnnule && step === 0 && (
        <p className={styles.info} role="status">Le paiement de l'acompte a été annulé : votre rendez-vous n'est pas confirmé. Vous pouvez recommencer la réservation.</p>
      )}

      <div className={styles.layout}>
        <div className={styles.etapes}>
          <StepCard number={1} title={ETAPES[0]} status={statut(0)} summary={resumePrestation} onEdit={() => setStep(0)}>
            <ChoiceChips label="Prestation" value={category} onChange={(v) => { changerPrestation(() => { setCategory(v as Category); setFormuleId(undefined); setOptionIds([]); }); allerA('resa-formules'); }}
              choices={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
            {category && (
              <div id="resa-formules" className={`${styles.liste} ${styles.ancre}`}>
                <h3 className={styles.sousTitre}>La formule</h3>
                {formulesVisibles.map((f) => {
                  const tarif = tarifDe(f, variante);
                  return (
                    <div key={f.id} className={styles.formule}>
                      <OptionCard title={f.name} description={f.description} badge={f.badge}
                        priceLabel={formatEuros(tarif.priceCents)}
                        selected={f.id === formuleId} onToggle={() => {
                          changerPrestation(() => { setFormuleId(f.id); setOptionIds([]); });
                          // Des options à proposer : on les montre ; sinon, direction le créneau.
                          if (options.some((o) => f.optionIds.includes(o.id))) allerA('resa-options'); else etapeSuivante(1);
                        }} />
                      {f.id === formuleId && optionsVisibles.length > 0 && (
                        <div id="resa-options" className={`${styles.options} ${styles.ancre}`}>
                          <h4 className={styles.optionsTitre}>En plus, si besoin</h4>
                          {optionsVisibles.map((o) => (
                            <OptionCard key={o.id} title={o.name} description={o.description} priceLabel={`+ ${formatEuros(o.priceCents)}`}
                              selected={optionIds.includes(o.id)}
                              onToggle={() => changerPrestation(() => setOptionIds(optionIds.includes(o.id) ? optionIds.filter((x) => x !== o.id) : [...optionIds, o.id]))} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </StepCard>

          <StepCard number={2} title={ETAPES[1]} status={statut(1)} summary={resumeCreneau} onEdit={() => setStep(1)}>
            <AddressInput label="Adresse de l'intervention" placeholder="N°, rue, ville" search={searchAddress}
              value={address} onSelect={(a: Address) => { setAddress(a); setDay(undefined); setStart(undefined); allerA('resa-calendrier'); }}
              hint="Choisissez votre adresse dans la liste pour calculer le déplacement." />
            {address && quote && (quote.inZone
              ? <p className={styles.ok}>✓ Je me déplace chez vous{quote.travelFeeCents > 0 ? ` (frais de déplacement : ${formatEuros(quote.travelFeeCents)})` : ', déplacement offert'}.</p>
              : <p className={styles.error}>Cette adresse est hors de ma zone d'intervention. Contactez-moi pour en parler.</p>)}
            {dansZone && quote && (
              <div id="resa-calendrier" className={`${styles.dateTime} ${styles.ancre}`}>
                <Calendar month={month} minMonth={currentMonth()} availableDays={days} selected={day}
                  onSelect={(d) => { setDay(d); setStart(undefined); allerA('resa-heures'); }} onMonthChange={setMonth} />
                {formule?.occupePlage && <p className={styles.hint}>Cette prestation occupe la demi-journée : seules les arrivées en début de matinée ou d'après-midi sont proposées.</p>}
                {day && (
                  <div id="resa-heures" className={styles.ancre}>
                    <SlotPicker title="Heure d'arrivée" slots={slots} selected={start} emptyMessage="Plus aucun créneau ce jour-là : choisissez un autre jour."
                      onSelect={(s) => { setStart(s); etapeSuivante(2); }} />
                  </div>
                )}
              </div>
            )}
          </StepCard>

          <StepCard number={3} title={ETAPES[2]} status={statut(2)}>
            <p className={styles.hint}>Pour confirmer le rendez-vous et vous prévenir la veille.</p>
            <div className={styles.duo}>
              <label className={styles.field}>Prénom<input value={contact.firstname} onChange={(e) => setContact({ ...contact, firstname: e.target.value })} autoComplete="given-name" /></label>
              <label className={styles.field}>Nom<input value={contact.lastname} onChange={(e) => setContact({ ...contact, lastname: e.target.value })} autoComplete="family-name" /></label>
            </div>
            <label className={styles.field}>Téléphone<input type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" placeholder="06 12 34 56 78" /></label>
            <label className={styles.field}>E-mail<input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" /></label>
            <label className={styles.field}>Précisions (véhicule, accès, parking, prise électrique…)<textarea rows={3} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} /></label>
            <p className={styles.hint}>Un espace client sera créé pour suivre vos rendez-vous : vous recevrez un lien pour choisir votre mot de passe. Carte de fidélité pleine ? La remise est déduite automatiquement du total et de l’acompte.</p>
            <ChoixProduits produits={produits} quantites={quantites}
              onChange={(id, q) => setQuantites({ ...quantites, [id]: Math.max(0, q) })} />
            <label className={styles.check}><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> J'accepte les <a href="/cgv" target="_blank" rel="noreferrer">conditions générales de vente</a>.</label>
          </StepCard>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.barre}>
            {quote && (
              <div className={styles.total}>
                <span className={styles.totalLibelle}>{step === 0 ? 'Total estimé' : 'Total'}, acompte {formatEuros(quote.depositCents)}{totalProduits > 0 ? ` + produits ${formatEuros(totalProduits)}` : ''}</span>
                <strong className={styles.totalMontant}>{formatEuros(quote.totalCents)}</strong>
                <a href="#detail-prix" className={styles.detail}>Détail du prix</a>
              </div>
            )}
            <button type="button" className={`btn ${styles.action}`} disabled={!canNext || sending} aria-busy={sending} onClick={next}>
              {libelleBouton}
            </button>
          </div>
        </div>

        {quote && (
          <aside className={styles.summary} id="detail-prix">
            <PriceSummary lines={quote.lines} totalCents={quote.totalCents} depositCents={quote.depositCents}
              footnote={`Durée estimée : ${Math.round(quote.durationMin / 60 * 10) / 10} h. Solde à régler sur place.`} />
          </aside>
        )}
      </div>
    </main>
  );
}
