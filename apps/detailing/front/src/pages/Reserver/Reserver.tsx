import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AddressInput, Button, Calendar, ChoiceChips, Dialog, PriceSummary, SlotPicker, StepCard, type StepCardStatus, formatEuros } from '@bsandoz/ui';
import type { Category, Formule, OptionItem, ProduitItem } from '../../data/demo';
import { CATEGORIES, tarifDe } from '../../data/demo';
import type { Address, Quote, Selection, Slot } from '../../services/api';
import { adresseDePosition, getAvailableDays, getCatalog, getQuote, getSlots, maPosition, reserve, searchAddress, type ModePaiement } from '../../services/api';
import { PAGES_SEO } from '../../seo/donnees';
import { useSeo } from '../../seo/useSeo';
import { defilerVers } from '../../app/defilement';
import { memoriserReservation } from '../../app/agenda';
import { Icone } from '../../components/Icone/Icone';
import { SITE } from '../../data/site';
import { ChoixProduits } from '../../components/ChoixProduits/ChoixProduits';
import styles from './Reserver.module.css';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const ETAPES = ['Que faut-il nettoyer ?', 'Où et quand ?', 'Vos coordonnées'];
const BOUTONS = ['Choisir le créneau', 'Mes coordonnées'];
const VEHICULES_MAX = 5;
/** 90 → « 1 h 30 », 45 → « 45 min ». */
const duree = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h === 0 ? `${m} min` : `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`;
};

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
  // Produits proposés une fois, dans une fenêtre, au clic sur le bouton final (non merci / ajouter).
  const [proposition, setProposition] = useState<'jamais' | 'ouverte' | 'vue'>('jamais');
  const [category, setCategory] = useState<Category>();
  const [formuleId, setFormuleId] = useState<string>();
  // Plusieurs véhicules : même formule pour tous, options choisies véhicule par véhicule.
  const [nbVehicules, setNbVehicules] = useState(1);
  const [optionsParVehicule, setOptionsParVehicule] = useState<string[][]>([[]]);
  const [address, setAddress] = useState<Address>();
  const [localisation, setLocalisation] = useState<'' | 'en_cours' | string>('');
  const [month, setMonth] = useState(currentMonth());
  const [days, setDays] = useState<string[]>([]);
  const [day, setDay] = useState<string>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [start, setStart] = useState<string>();
  const [contact, setContact] = useState({ nom: '', email: '', phone: '', notes: '' });
  const [modele, setModele] = useState('');
  const [entreprise, setEntreprise] = useState({ active: false, nom: '', siret: '', adresse: '' });
  // Pas d'acompte : le client paie tout en ligne maintenant, ou tout sur place une fois la prestation faite.
  const [paiement, setPaiement] = useState<ModePaiement>('sur_place');
  const [terms, setTerms] = useState(false);
  const [quote, setQuote] = useState<Quote>();
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  // Pas de véhicule demandé : prix de base de la formule (variante vide).
  const variante = '';
  const formule = useMemo(() => formules.find((f) => f.id === formuleId), [formules, formuleId]);
  const formulesVisibles = useMemo(() => formules.filter((f) => f.category === category), [formules, category]);
  const optionsVisibles = options.filter((o) => formule?.optionIds.includes(o.id));
  const optionIds = useMemo(() => optionsParVehicule.flat(), [optionsParVehicule]);
  const metierData = useMemo<Record<string, unknown>>(() => {
    if (nbVehicules === 1) return { category };
    // Détail pour le pro : les options de chaque véhicule.
    const nom = (id: string) => options.find((o) => o.id === id)?.name ?? id;
    return { category, vehicules: optionsParVehicule.map((ids, i) => `Véhicule ${i + 1} : ${ids.length ? ids.map(nom).join(', ') : 'sans option'}`) };
  }, [category, nbVehicules, optionsParVehicule, options]);
  const selection = useMemo<Selection | undefined>(
    () => (formule ? { formule, variante, optionIds, metierData, quantite: nbVehicules } : undefined),
    [formule, variante, optionIds, metierData, nbVehicules],
  );
  const viderOptions = (n = nbVehicules) => setOptionsParVehicule(Array.from({ length: n }, () => []));
  const changerNbVehicules = (n: number) => {
    setNbVehicules(n);
    setOptionsParVehicule((avant) => Array.from({ length: n }, (_, i) => avant[i] ?? []));
    setStart(undefined);
  };
  const basculerOption = (vehicule: number, id: string) => changerPrestation(() => setOptionsParVehicule((avant) =>
    avant.map((ids, i) => (i !== vehicule ? ids : ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))));
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
  // Un seul défilement en attente à la fois, annulé si le visiteur quitte la page.
  const defilementEnCours = useRef<() => void>(undefined);
  useEffect(() => () => defilementEnCours.current?.(), []);
  const allerA = (id: string) => { defilementEnCours.current?.(); defilementEnCours.current = defilerVers(id); };
  const etapeSuivante = (i: number) => { setError(''); setStep(i); allerA(`resa-etape-${i}`); };

  /** Un changement de prestation peut changer la durée : l'heure choisie est à revoir. */
  const changerPrestation = (maj: () => void) => { maj(); setStart(undefined); };

  // SIRET (14 chiffres) ou numéro d'entreprise belge (BCE, 10 chiffres).
  const siretOk = /^(\d{14}|\d{10})$/.test(entreprise.siret.replace(/[\s.]/g, ''));
  const entrepriseOk = !entreprise.active || (entreprise.nom.trim() !== '' && siretOk);
  const contactOk = !!(contact.nom.trim() && /\S+@\S+\.\S+/.test(contact.email) && contact.phone.trim() && modele.trim()) && entrepriseOk;
  const canNext = [!!(category && formule), dansZone && !!start, contactOk && terms][step];

  const next = async () => {
    setError('');
    if (step < ETAPES.length - 1) { etapeSuivante(step + 1); return; }
    if (produits.some((p) => p.stock > 0) && proposition !== 'vue') { setProposition('ouverte'); return; }
    await payer(quantites);
  };

  const payer = async (choix: Record<string, number>) => {
    if (!selection || !address || !start) return;
    setSending(true);
    try {
      const choisis = Object.entries(choix).filter(([, q]) => q > 0).map(([id, quantite]) => ({ id, quantite }));
      // Modèle et entreprise : données transmises au pro avec la réservation (sans changer le devis).
      const details: Record<string, unknown> = { ...selection.metierData, modele: modele.trim() };
      if (entreprise.active) Object.assign(details, { entreprise: entreprise.nom.trim(), siret: entreprise.siret.replace(/[\s.]/g, ''), adresseFacturation: entreprise.adresse.trim() || address.label });
      const resultat = await reserve({ ...selection, metierData: details }, start, address,
        { firstname: contact.nom.trim(), lastname: '', email: contact.email, phone: contact.phone, notes: contact.notes }, terms, choisis, paiement);
      // Pour proposer l'ajout à l'agenda sur la page de confirmation (aussi au retour du paiement en ligne).
      const fin = new Date(new Date(start).getTime() + (dureeMin ?? 60) * 60000).toISOString();
      memoriserReservation(resultat.reservationId, {
        titre: `${SITE.brand} : ${formule?.name ?? 'rendez-vous'}`, debut: new Date(start).toISOString(), fin, lieu: address.label,
        details: `Nettoyage à domicile. Pour déplacer ou annuler : lien de l'e-mail de confirmation ou « Mon espace ».`,
      });
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
  const resumePrestation = [
    formule && (nbVehicules > 1 ? `${formule.name} × ${nbVehicules} véhicules` : formule.name),
    ...options.map((o) => ({ o, n: optionIds.filter((id) => id === o.id).length })).filter((x) => x.n > 0)
      .map(({ o, n }) => (n > 1 ? `${o.name.toLowerCase()} × ${n}` : o.name.toLowerCase())),
  ].filter(Boolean).join(', ');
  const resumeCreneau = [
    start && new Date(start).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    address?.label,
  ].filter(Boolean).join(', ');
  // Produits : payés en entier avec l'acompte.
  const totalProduits = produits.reduce((t, p) => t + p.priceCents * (quantites[p.id] ?? 0), 0);
  const totalGeneral = (quote?.totalCents ?? 0) + totalProduits;
  // En ligne : tout ; sur place : seulement l'acompte s'il y en a un (réglage du pro), le reste une fois la prestation faite.
  const aPayer = paiement === 'en_ligne' ? totalGeneral : (quote?.depositCents ?? 0);
  const libelleBouton = step < ETAPES.length - 1
    ? BOUTONS[step]
    : aPayer > 0 ? `Payer ${formatEuros(aPayer)}` : 'Confirmer la réservation';
  const libelleTotal = step === 0 ? 'Total estimé' : paiement === 'en_ligne' && step === 2 ? 'Total, payé en ligne'
    : quote?.depositCents ? `Total, acompte ${formatEuros(quote.depositCents)} en ligne` : 'Total, à régler sur place';

  return (
    <main className={`container ${styles.page}`}>
      <h1 className={styles.title}>Réserver</h1>
      {paiementAnnule && step === 0 && (
        <p className={styles.info} role="status">Le paiement de l'acompte a été annulé : votre rendez-vous n'est pas confirmé. Vous pouvez le régler plus tard depuis « Mon espace » (lien aussi dans l’e-mail reçu), ou recommencer la réservation.</p>
      )}

      <div className={styles.layout}>
        <div className={styles.etapes}>
          <div id="resa-etape-0" className={styles.ancre}>
          <StepCard number={1} title={ETAPES[0]} status={statut(0)} summary={resumePrestation} onEdit={() => etapeSuivante(0)}>
            <ChoiceChips label="Prestation" value={category} onChange={(v) => { changerPrestation(() => { setCategory(v as Category); setFormuleId(undefined); viderOptions(); }); allerA('resa-formules'); }}
              choices={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
            <div className={styles.compteur}>
              <span id="label-vehicules" className={styles.compteurLibelle}>Nombre de véhicules</span>
              <div className={styles.stepper} role="group" aria-labelledby="label-vehicules">
                <button type="button" onClick={() => changerNbVehicules(nbVehicules - 1)} disabled={nbVehicules <= 1} aria-label="Un véhicule de moins">−</button>
                <span className={styles.nombre} aria-live="polite">{nbVehicules}</span>
                <button type="button" onClick={() => changerNbVehicules(nbVehicules + 1)} disabled={nbVehicules >= VEHICULES_MAX} aria-label="Un véhicule de plus">+</button>
              </div>
            </div>
            {category && (
              <div id="resa-formules" className={`${styles.liste} ${styles.ancre}`}>
                <div className={styles.listeEntete}>
                  <h3 className={styles.sousTitre}>La formule</h3>
                  <span className={styles.hint}>Prix pour 1 véhicule</span>
                </div>
                <div role="radiogroup" aria-label="La formule" className={styles.formules}>
                  {formulesVisibles.map((f) => {
                    const tarif = tarifDe(f, variante);
                    const choisie = f.id === formuleId;
                    return (
                      <div key={f.id} className={styles.formule}>
                        <label className={`${styles.formuleLigne} ${choisie ? styles.formuleChoisie : ''}`}>
                          <input type="radio" name="formule" checked={choisie} onChange={() => {
                            changerPrestation(() => { setFormuleId(f.id); viderOptions(); });
                            // Des options à proposer : on les montre ; sinon, direction le créneau.
                            if (options.some((o) => f.optionIds.includes(o.id))) allerA('resa-options'); else etapeSuivante(1);
                          }} />
                          <span className={styles.formuleNom}>{f.name}{f.badge && <span className={styles.formuleBadge}>{f.badge}</span>}</span>
                          <span className={styles.formulePrix}>{formatEuros(tarif.priceCents)}</span>
                          <span className={styles.formuleDuree}>Environ {duree(tarif.durationMin)} sur place</span>
                        </label>
                        {choisie && optionsVisibles.length > 0 && (
                          <div id="resa-options" className={`${styles.options} ${styles.ancre}`}>
                            <p className={styles.optionsTitre}>En plus, si besoin</p>
                            {optionsParVehicule.map((choix, v) => (
                              <fieldset key={v} className={styles.vehicule}>
                                <legend className={nbVehicules > 1 ? styles.vehiculeTitre : styles.srOnly}>{nbVehicules > 1 ? `Véhicule ${v + 1}` : 'Options'}</legend>
                                {optionsVisibles.map((o) => (
                                  <label key={o.id} className={styles.optionLigne}>
                                    <input type="checkbox" checked={choix.includes(o.id)} onChange={() => basculerOption(v, o.id)}
                                      aria-label={nbVehicules > 1 ? `${o.name}, véhicule ${v + 1}` : undefined} />
                                    <span>{o.name}</span>
                                    <span className={styles.optionPrix}>+{formatEuros(o.priceCents)}</span>
                                  </label>
                                ))}
                              </fieldset>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </StepCard>

          </div>

          <div id="resa-etape-1" className={styles.ancre}>
          <StepCard number={2} title={ETAPES[1]} status={statut(1)} summary={resumeCreneau} onEdit={() => etapeSuivante(1)}>
            <AddressInput label="Adresse de l'intervention" placeholder="N°, rue, ville" search={searchAddress}
              value={address} onSelect={(a: Address) => { setAddress(a); setDay(undefined); setStart(undefined); allerA('resa-calendrier'); }}
              hint="Choisissez votre adresse dans la liste pour calculer le déplacement." />
            <div className={styles.position}>
              <button type="button" className="btn btn--ghost" disabled={localisation === 'en_cours'} aria-busy={localisation === 'en_cours'}
                onClick={async () => {
                  setLocalisation('en_cours');
                  try {
                    const { lat, lng } = await maPosition();
                    const a = await adresseDePosition(lat, lng);
                    setAddress(a); setDay(undefined); setStart(undefined); setLocalisation('');
                    allerA('resa-calendrier');
                  } catch (e) {
                    setLocalisation((e as Error).message);
                  }
                }}>
                <Icone nom="position" taille={18} /> {localisation === 'en_cours' ? 'Recherche de votre position…' : 'Utiliser ma position'}
              </button>
              {localisation && localisation !== 'en_cours' && <p className={styles.hint} role="status">{localisation}</p>}
            </div>
            {address && quote && (quote.inZone
              ? <p className={styles.ok}>✓ Je me déplace chez vous{quote.travelFeeCents > 0 ? ` (frais de déplacement : ${formatEuros(quote.travelFeeCents)})` : ', déplacement offert'}.</p>
              : (
                <div className={styles.horsZone} role="status">
                  <p><strong>Cette adresse est au-delà de ma zone de réservation en ligne.</strong> Je peux tout de même venir, sur devis.</p>
                  <Link className="btn" to={`/devis?adresse=${encodeURIComponent(address.label)}`}>Demander un devis</Link>
                </div>
              ))}
            {dansZone && quote && (
              <div id="resa-calendrier" className={`${styles.dateTime} ${styles.ancre}`}>
                <Calendar month={month} minMonth={currentMonth()} availableDays={days} selected={day}
                  onSelect={(d) => { setDay(d); setStart(undefined); allerA('resa-heures'); }} onMonthChange={setMonth} />
                {formule?.occupePlage && <p className={styles.hint}>Cette prestation occupe la demi-journée : seules les arrivées en début de matinée ou d'après-midi sont proposées.</p>}
                {day && (
                  <div id="resa-heures" className={styles.ancre}>
                    <SlotPicker title="Heure d'arrivée" slots={slots.map((s) => ({ ...s, highlighted: s.groupe }))} selected={start} emptyMessage="Plus aucun créneau ce jour-là : choisissez un autre jour."
                      highlightLabel="Conseillé" highlightHint="Conseillé : juste avant ou juste après un autre rendez-vous, déjà sur la route."
                      onSelect={(s) => { setStart(s); etapeSuivante(2); }} />
                  </div>
                )}
              </div>
            )}
          </StepCard>

          </div>

          <div id="resa-etape-2" className={styles.ancre}>
          <StepCard number={3} title={ETAPES[2]} status={statut(2)}>
            <p className={styles.hint}>Pour confirmer le rendez-vous et vous prévenir le jour J.</p>
            <label className={styles.field}>Nom et prénom<input value={contact.nom} onChange={(e) => setContact({ ...contact, nom: e.target.value })} autoComplete="name" /></label>
            <label className={styles.field}>Téléphone<input type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" placeholder="01 02 03 04 05" /></label>
            <label className={styles.field}><span>E-mail <span className={styles.facultatif}>pour recevoir le récapitulatif</span></span><input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" /></label>
            <label className={styles.field}>Modèle du véhicule<input value={modele} onChange={(e) => setModele(e.target.value)} placeholder="Ex. Peugeot 208 grise" /></label>

            <label className={styles.check}><input type="checkbox" checked={entreprise.active} onChange={(e) => setEntreprise({ ...entreprise, active: e.target.checked })} /> Je réserve pour une entreprise</label>
            {entreprise.active && (
              <div className={styles.entreprise}>
                <label className={styles.field}>Nom de l’entreprise<input value={entreprise.nom} onChange={(e) => setEntreprise({ ...entreprise, nom: e.target.value })} autoComplete="organization" />
                  <span className={styles.hint}>Le récapitulatif sera établi à ce nom.</span></label>
                <label className={styles.field}>SIRET ou n° BCE (Belgique)<input inputMode="numeric" value={entreprise.siret} onChange={(e) => setEntreprise({ ...entreprise, siret: e.target.value })} aria-invalid={entreprise.siret !== '' && !siretOk} />
                  <span className={entreprise.siret !== '' && !siretOk ? styles.error : styles.hint}>{entreprise.siret !== '' && !siretOk ? 'SIRET : 14 chiffres ; BCE : 10 chiffres.' : '14 chiffres pour identifier votre entreprise.'}</span></label>
                <label className={styles.field}><span>Adresse de facturation <span className={styles.facultatif}>facultatif</span></span><input value={entreprise.adresse} onChange={(e) => setEntreprise({ ...entreprise, adresse: e.target.value })} placeholder="Adresse du lavage si vide" autoComplete="street-address" /></label>
              </div>
            )}

            <details className={styles.precision} open={contact.notes !== '' || undefined}>
              <summary>Ajouter une précision pour le pro</summary>
              <label className={styles.field}><span className={styles.srOnly}>Précision</span><textarea rows={3} value={contact.notes} placeholder="Code portail, accès, parking…" onChange={(e) => setContact({ ...contact, notes: e.target.value })} /></label>
            </details>

            <fieldset className={styles.paiement}>
              <legend>Comment souhaitez-vous régler ?</legend>
              <label className={`${styles.modePaiement} ${paiement === 'sur_place' ? styles.modeChoisi : ''}`}>
                <input type="radio" name="paiement" checked={paiement === 'sur_place'} onChange={() => setPaiement('sur_place')} />
                <span><strong>Sur place</strong><span className={styles.hint}>Rien à payer maintenant : vous réglez une fois le lavage terminé.</span></span>
              </label>
              <label className={`${styles.modePaiement} ${paiement === 'en_ligne' ? styles.modeChoisi : ''}`}>
                <input type="radio" name="paiement" checked={paiement === 'en_ligne'} onChange={() => setPaiement('en_ligne')} />
                <span><strong>En ligne, maintenant</strong><span className={styles.hint}>Carte, Apple Pay ou Google Pay : tout est réglé, rien à payer sur place.</span></span>
              </label>
            </fieldset>
            <p className={styles.hint}><strong>Un empêchement ?</strong> Vous pourrez décaler ou annuler depuis le lien reçu par e-mail ou dans « Mon espace ». Carte de fidélité pleine ? La remise est déduite automatiquement.</p>
            <label className={styles.check}><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> J'accepte les <a href="/cgv" target="_blank" rel="noreferrer">conditions générales de vente</a>.</label>
          </StepCard>
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.barre}>
            {quote && (
              <div className={styles.total}>
                <span className={styles.totalLibelle}>{libelleTotal}</span>
                <strong className={styles.totalMontant}>{formatEuros(totalGeneral)}</strong>
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
            <PriceSummary lines={quote.lines} totalCents={quote.totalCents} depositCents={paiement === 'sur_place' ? quote.depositCents : undefined}
              footnote={`Durée estimée : ${Math.round(quote.durationMin / 60 * 10) / 10} h. ${paiement === 'en_ligne' ? 'Payé en ligne à la réservation.' : 'À régler sur place, une fois la prestation terminée.'}`} />
          </aside>
        )}
      </div>
      <Dialog open={proposition === 'ouverte'} title="Un petit plus pour l’entretien ?" onClose={() => setProposition('jamais')}
        description={paiement === 'en_ligne' ? 'Mes produits, réglés maintenant avec la prestation : je vous les apporte le jour du rendez-vous.' : 'Mes produits, réglés sur place avec la prestation : je vous les apporte le jour du rendez-vous.'}
        actions={(
          <>
            <Button variant="ghost" onClick={() => { setQuantites({}); setProposition('vue'); void payer({}); }}>Non merci</Button>
            <Button disabled={totalProduits === 0} onClick={() => { setProposition('vue'); void payer(quantites); }}>
              {paiement === 'en_ligne'
                ? (totalProduits === 0 ? 'Ajouter et payer' : `Ajouter et payer (${formatEuros(aPayer)})`)
                : (totalProduits === 0 ? 'Ajouter' : `Ajouter (${formatEuros(totalProduits)})`)}
            </Button>
          </>
        )}>
        <ChoixProduits produits={produits} quantites={quantites} avecTitre={false}
          onChange={(id, q) => setQuantites({ ...quantites, [id]: Math.max(0, q) })} />
      </Dialog>
    </main>
  );
}
