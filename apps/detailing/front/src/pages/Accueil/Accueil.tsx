import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Dialog, formatEuros } from '@bsandoz/ui';
import { useModeEdition } from '../../app/modeEditionContexte';
import { Crayon } from '../../components/ModeEdition';
import { FormulaireOption, FormulairePrestation } from '../EspacePro/Catalogue';
import { nouvellePrestation } from '../EspacePro/nouvellePrestation';
import { catalogue as cataloguePro, enregistrerPrestation, type OptionPro, type PrestationPro } from '../../services/pro';
import { useContenu } from '../../app/contenuContexte';
import { CarteFidelite } from '../../components/CarteFidelite/CarteFidelite';
import { CarteZone } from '../../components/CarteZone/CarteZone';
import { IconeTelephone } from '../../components/Telephone/Telephone';
import { lienTel, useTelephone } from '../../components/Telephone/numeroTelephone';
import { CATEGORIES, FORMULES, OPTIONS, prixMin, type Category, type Formule, type OptionItem } from '../../data/demo';
import { SITE } from '../../data/site';
import { detailPrestation, jourIso, semaine, tranches, type Plage } from '../../data/vitrine';
import { couleurTranche, type Estimation, type ZonePublique } from '../../data/zone';
import { estimerDeplacement, getCatalog, getHoraires, getZone, searchAddress } from '../../services/api';
import { estConnecte, reprendreSession } from '../../services/compte';
import { maCarteFidelite, messageCarte, regleFidelite, type CarteFidelite as Carte, type RegleFidelite } from '../../services/fidelite';
import { A_COMPLETER } from '../../services/contenu';
import { COMMUNES, ENTREPRISE, PAGES_SEO } from '../../seo/donnees';
import { useSeo } from '../../seo/useSeo';
import styles from './Accueil.module.css';

/** Accueil : textes, étapes, réalisations, avis, FAQ et communes modifiables dans l'espace pro (« Mon site »). */
export function Accueil() {
  const telephone = useTelephone();
  const { contenu } = useContenu();
  useSeo(PAGES_SEO[0].titre, PAGES_SEO[0].description);
  // Catalogue réel (API) dès qu'il est chargé ; données de démonstration en attendant ou si l'API ne répond pas.
  const [formules, setFormules] = useState<Formule[]>(FORMULES);
  const [options, setOptions] = useState<OptionItem[]>(OPTIONS);
  useEffect(() => {
    getCatalog().then((c) => { if (c.formules.length > 0) { setFormules(c.formules); setOptions(c.options); } }).catch(() => undefined);
  }, []);
  // Mode modification (pro connecté) : catalogue complet de l'espace pro, formules retirées comprises.
  const { actif: edition } = useModeEdition();
  const [pro, setPro] = useState<{ prestations: PrestationPro[]; options: OptionPro[] }>();
  const [enEdition, setEnEdition] = useState<{ prestation: PrestationPro } | { option: OptionPro }>();
  const [messageEdition, setMessageEdition] = useState('');
  const chargerPro = () => cataloguePro().then(setPro).catch((e: Error) => setMessageEdition(e.message));
  useEffect(() => { if (edition) chargerPro(); }, [edition]);
  /** Après un enregistrement : le site affiche tout de suite le catalogue à jour (formules proposées seulement). */
  const appliquer = (c: { prestations: PrestationPro[]; options: OptionPro[] }) => {
    setPro(c);
    setFormules(c.prestations.filter((p) => p.active && p.id).sort((a, b) => a.position - b.position).map(versFormule));
    setOptions(c.options.filter((o) => o.active && o.id).map((o) => ({ id: o.id!, name: o.name, description: o.description, priceCents: o.priceCents, durationMin: o.durationMin })));
  };
  const enregistree = async (texte: string) => {
    setEnEdition(undefined);
    setMessageEdition(texte);
    appliquer(await cataloguePro());
  };
  const remettre = async (p: PrestationPro) => {
    await enregistrerPrestation({ ...p, active: true });
    await enregistree(`« ${p.name} » est de nouveau proposée.`);
  };
  const prestationPro = (id: string) => pro?.prestations.find((p) => p.id === id);
  const optionPro = (id: string) => pro?.options.find((o) => o.id === id);

  const categories = CATEGORIES.filter((c) => edition || formules.some((f) => f.category === c.value));
  const [onglet, setOnglet] = useState<Category>('interieur');
  const categorie = categories.find((c) => c.value === onglet) ?? categories[0];
  const formulesOnglet = formules.filter((f) => f.category === categorie?.value);
  const optionsOnglet = options.filter((o) => formulesOnglet.some((f) => f.optionIds.includes(o.id)));
  const [horaires, setHoraires] = useState<Plage[]>();
  useEffect(() => { getHoraires().then(setHoraires).catch(() => undefined); }, []);
  const [aujourdhui] = useState(() => jourIso(new Date()));
  const [zone, setZone] = useState<ZonePublique>();
  const [estimation, setEstimation] = useState<Estimation>();
  useEffect(() => { getZone().then(setZone).catch(() => undefined); }, []);
  const [fidelite, setFidelite] = useState<RegleFidelite>();
  useEffect(() => { regleFidelite().then(setFidelite).catch(() => undefined); }, []);
  // Client connecté (ou session à reprendre) : sa vraie carte, tamponnée, à la place de l'exemple.
  const [maCarte, setMaCarte] = useState<Carte>();
  const fideliteActive = !!fidelite?.actif;
  useEffect(() => {
    if (!fideliteActive) return;
    (estConnecte() ? Promise.resolve(true) : reprendreSession())
      .then((ok) => (ok ? maCarteFidelite().then(setMaCarte) : undefined))
      .catch(() => undefined);
  }, [fideliteActive]);

  const { accueil, etapes, faq, avis, realisations, communes } = contenu;
  const nomsCommunes = [...new Set([...COMMUNES.map((c) => c.nom), ...communes.map((c) => c.trim()).filter(Boolean)])];
  const avisPublies = avis.filter((a) => a.texte.trim() !== '');

  return (
    <main>
      <section className={styles.hero}>
        {/* Grand écran : texte à gauche, photo du camion à droite ; téléphone et tablette : photo sous le titre. */}
        <div className={`container ${styles.heroGrille}`}>
          <p className={styles.eyebrow}>{accueil.surtitre}</p>
          <h1 className={styles.title}>{accueil.titre}</h1>
          <picture className={styles.heroPhoto}>
            <source srcSet="/camion.webp" type="image/webp" />
            <img src="/camion.jpg" width="600" height="600" fetchPriority="high"
              alt={`Le camion-atelier ${SITE.brand}, portes ouvertes : produits, enrouleurs et matériel autonome en eau et en électricité.`} />
          </picture>
          <p className={styles.lead}>{accueil.introduction}</p>
          <div className={styles.ctas}>
            <Link to="/reserver" className="btn">Réserver un créneau</Link>
            {telephone && <a href={lienTel(telephone)} className={`btn ${styles.appeler}`}><IconeTelephone /> Appeler le {telephone}</a>}
            <a href="#prestations" className="btn btn--ghost">Voir les prestations</a>
          </div>
          {accueil.arguments.length > 0 && (
            <ul className={styles.args}>
              {accueil.arguments.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
        </div>
      </section>

      <section id="prestations" className={`container ${styles.section}`} aria-labelledby="titre-prestations">
        <h2 id="titre-prestations">Prestations</h2>
        <p className={styles.note}>Même prix quel que soit le véhicule. Choisissez une catégorie pour voir le détail de chaque formule.</p>
        <div role="tablist" aria-label="Catégories de prestations" className={styles.onglets} onKeyDown={(e: KeyboardEvent) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          const i = categories.findIndex((c) => c.value === categorie?.value);
          const suivante = categories[(i + (e.key === 'ArrowRight' ? 1 : categories.length - 1)) % categories.length];
          setOnglet(suivante.value);
          document.getElementById(`onglet-${suivante.value}`)?.focus();
        }}>
          {categories.map((c) => (
            <button key={c.value} id={`onglet-${c.value}`} type="button" role="tab" aria-selected={c.value === categorie?.value} aria-controls="panneau-prestations"
              tabIndex={c.value === categorie?.value ? 0 : -1} className={styles.onglet} onClick={() => setOnglet(c.value)}>
              {c.label}
            </button>
          ))}
        </div>
        {categorie && (
          <div id="panneau-prestations" role="tabpanel" aria-labelledby={`onglet-${categorie.value}`} className={styles.panneau}>
            <p className={styles.intro}>{categorie.description}</p>
            <div className={styles.cartes}>
              {formulesOnglet.map((f) => {
                const detail = detailPrestation(f.description);
                return (
                  <article key={f.id} className={`${styles.formule} ${f.badge ? styles.vedette : ''}`}>
                    {f.badge && <span className={styles.badge}>{f.badge}</span>}
                    {prestationPro(f.id) && <div className={styles.crayonCarte}><Crayon libelle={`Modifier ${f.name}`} onClick={() => setEnEdition({ prestation: prestationPro(f.id)! })} /></div>}
                    <h3>{f.name}</h3>
                    <p className={styles.prix}>{formatEuros(prixMin(f))}</p>
                    {detail.duree && <p className={styles.duree}><span aria-hidden="true">⏱</span> {detail.duree}</p>}
                    {detail.inclus.length > 0 ? (
                      <>
                        <p className={styles.compris}>Ce qui est compris</p>
                        <ul className={styles.inclus}>
                          {detail.elements.map((e) => (
                            <li key={e.texte} className={e.formule ? styles.formuleIncluse : undefined}>
                              {e.texte}
                              {e.etiquette && <span className={`${styles.etiquette} ${/offert/i.test(e.etiquette) ? styles.etiquetteOfferte : ''}`}>{e.etiquette}</span>}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : <p>{detail.texte}</p>}
                    <Link to={`/reserver?formule=${encodeURIComponent(f.id)}`} className={`btn ${f.badge ? '' : 'btn--ghost'} ${styles.choisir}`} aria-label={`Choisir ${f.name}`}>
                      Choisir
                    </Link>
                  </article>
                );
              })}
            </div>
            {edition && pro && categorie && (
              <div className={styles.edition}>
                <Button variant="secondary" onClick={() => { setMessageEdition(''); setEnEdition({ prestation: nouvellePrestation(pro.prestations.length, categorie.value) }); }}>
                  + Ajouter une formule « {categorie.label} »
                </Button>
                {pro.prestations.filter((p) => !p.active && p.categoryId === categorie.value).map((p) => (
                  <p key={p.id} className={styles.retiree}>« {p.name} » n’est plus proposée. <Button variant="ghost" onClick={() => remettre(p)}>La proposer à nouveau</Button></p>
                ))}
                {messageEdition && <p role="status" className={styles.messageEdition}>{messageEdition}</p>}
              </div>
            )}
            {optionsOnglet.length > 0 && (
              <div className={styles.options}>
                <h3>Options</h3>
                <ul>{optionsOnglet.map((o) => (
                  <li key={o.id}>
                    <span>{o.name}</span>
                    <span className={styles.optionPrix}>
                      <strong>+ {formatEuros(o.priceCents)}</strong>
                      {optionPro(o.id) && <Crayon libelle={`Modifier l’option ${o.name}`} onClick={() => setEnEdition({ option: optionPro(o.id)! })} />}
                    </span>
                  </li>
                ))}</ul>
              </div>
            )}
            {pro && enEdition && (
              <Dialog open title={'prestation' in enEdition ? (enEdition.prestation.id ? `Modifier « ${enEdition.prestation.name} »` : 'Nouvelle formule') : `Modifier l’option « ${enEdition.option.name} »`}
                description="Les changements sont visibles tout de suite sur le site." onClose={() => setEnEdition(undefined)}>
                {'prestation' in enEdition ? (
                  <FormulairePrestation initiale={enEdition.prestation} options={pro.options} onAnnuler={() => setEnEdition(undefined)}
                    onEnregistree={(p) => enregistree(p.active ? `« ${p.name} » enregistrée.` : `« ${p.name} » n’est plus proposée aux clients.`)} />
                ) : (
                  <FormulaireOption initiale={enEdition.option} onAnnuler={() => setEnEdition(undefined)} onEnregistree={(o) => enregistree(`Option « ${o.name} » enregistrée.`)} />
                )}
              </Dialog>
            )}
          </div>
        )}
      </section>

      {etapes.length > 0 && (
        <section className={styles.band} aria-labelledby="titre-etapes">
          <div className={`container ${styles.section}`}>
            <h2 id="titre-etapes">Comment ça marche</h2>
            <ol className={styles.steps}>
              {etapes.map((e, i) => (
                <li key={`${i}-${e.titre}`} className={styles.step}>
                  <h3>{e.titre}</h3>
                  <p>{e.texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <section id="realisations" className={`container ${styles.section}`} aria-labelledby="titre-realisations">
        <h2 id="titre-realisations">Réalisations</h2>
        <div className={styles.grid}>
          {realisations.map((r, i) => (
            <figure key={`${i}-${r.titre}`} className={styles.realisation}>
              <div className={styles.beforeAfter}>
                {(['avant', 'apres'] as const).map((moment) => (r[moment] ? (
                  <img key={moment} src={r[moment]} alt={`${r.titre} – ${moment === 'avant' ? 'avant' : 'après'}`} className={styles.image} loading="lazy" />
                ) : (
                  <div key={moment} className={styles.photo}><span>{moment === 'avant' ? 'Avant' : 'Après'}</span><span>{A_COMPLETER}</span></div>
                )))}
              </div>
              <figcaption>{r.titre}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="zone" className={styles.band} aria-labelledby="titre-zone">
        <div className={`container ${styles.section}`}>
          <h2 id="titre-zone">Zone d’intervention</h2>
          {zone?.surPlace ? (
            <p>Les prestations se font sur place, à <strong>{SITE.city}</strong>.</p>
          ) : (
            <>
              <p>Je me déplace chez vous ou au travail autour de <strong>{SITE.city}</strong>{zone ? `, jusqu’à ${String(zone.maxDistanceKm).replace('.', ',')} km` : ''}. Frais de déplacement selon la distance :</p>
              {zone && (
                <ol className={styles.tranches} aria-label="Frais de déplacement par distance">
                  {tranches(zone).map((t, i, toutes) => (
                    <li key={t.de} aria-current={estimation && estimation.distanceKm > t.de && estimation.distanceKm <= (t.jusqua ?? Infinity) ? 'true' : undefined}
                      className={`${styles.tranche} ${t.jusqua === undefined ? styles.devis : ''}`}
                      style={t.jusqua === undefined ? undefined : { '--teinte': couleurTranche(i, toutes.length - 1) } as CSSProperties}>
                      <span className={styles.km}>{t.jusqua === undefined ? `Au-delà de ${t.de} km` : t.de === 0 && zone.rayonVilleKm ? `${SITE.city} + ${t.jusqua} km` : `${t.de} à ${t.jusqua} km`}</span>
                      <strong>{t.prix}</strong>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
          {zone && !zone.surPlace && (
            <CarteZone zone={zone} centre={{ lat: ENTREPRISE.geo.latitude, lng: ENTREPRISE.geo.longitude }} ville={SITE.city}
              estimer={estimerDeplacement} rechercherAdresse={searchAddress} onEstimation={setEstimation} />
          )}
          {zone?.rayonVilleKm ? <p className={styles.note}>Tout {SITE.city} est compris dans le déplacement offert : les distances se comptent à partir de la sortie de la ville.</p> : null}
          <p className={styles.note}>Cercles indicatifs (distance par la route). Le prix exact du déplacement est recalculé à partir de votre adresse lors de la réservation.</p>
          {/* Repliées par défaut (discret), mais présentes dans la page : chaque commune qui a sa page est un lien, utile à Google. */}
          <details className={styles.communes}>
            <summary>Voir les communes desservies</summary>
            <p>
              {nomsCommunes.map((nom, i) => {
                const page = COMMUNES.find((c) => c.nom.toLowerCase() === nom.toLowerCase());
                return <span key={nom}>{i > 0 && ', '}{page ? <Link to={`/nettoyage-voiture/${page.slug}`}>{nom}</Link> : nom}</span>;
              })}, et alentours.
            </p>
          </details>
        </div>
      </section>

      {horaires && horaires.length > 0 && (
        <section id="horaires" className={`container ${styles.section}`} aria-labelledby="titre-horaires">
          <h2 id="titre-horaires">Horaires</h2>
          <ul className={styles.horaires}>
            {semaine(horaires).map((j) => (
              <li key={j.weekday} className={`${j.weekday === aujourdhui ? styles.aujourdhui : ''} ${j.plages.length === 0 ? styles.ferme : ''}`}
                aria-current={j.weekday === aujourdhui ? 'date' : undefined}>
                <span className={styles.jour}>{j.jour}{j.weekday === aujourdhui && <em> · aujourd’hui</em>}</span>
                <span>{j.plages.length > 0 ? j.plages.join(', ') : 'Fermé'}</span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>Uniquement sur rendez-vous, aux créneaux proposés en ligne.</p>
        </section>
      )}

      {fidelite?.actif && (
        <section id="fidelite" className={styles.band} aria-labelledby="titre-fidelite">
          <div className={`container ${styles.section} ${styles.fidelite}`}>
            <div className={styles.fideliteTexte}>
              <h2 id="titre-fidelite">{maCarte ? 'Votre carte de fidélité' : 'Carte de fidélité'}</h2>
              <p>
                Au bout de {fidelite.tamponsRequis} prestations, la suivante bénéficie de <strong>{fidelite.remisePercent} % de remise</strong>. Chaque
                prestation terminée ajoute un tampon sur votre carte, et la remise s’applique d’elle-même à la réservation.
              </p>
              {maCarte
                ? <p className={styles.messageCarte} role="status">{messageCarte(maCarte)}</p>
                : <p className={styles.note}>Déjà client ? <Link to="/mon-espace">Connectez-vous</Link> pour voir votre carte et vos tampons.</p>}
            </div>
            {maCarte
              ? <CarteFidelite carte={maCarte} titre="Votre carte de fidélité" />
              : <CarteFidelite carte={{ ...fidelite, tampons: Math.min(2, fidelite.tamponsRequis - 1), remiseDisponible: false }} titre="Carte de fidélité" exemple />}
          </div>
        </section>
      )}

      <section id="avis" className={`container ${styles.section}`} aria-labelledby="titre-avis">
        <h2 id="titre-avis">Avis clients</h2>
        {avisPublies.length === 0 ? (
          <>
            <p>{A_COMPLETER}</p>
            <p className={styles.note}>Seuls des avis réels et vérifiables seront publiés ici.</p>
          </>
        ) : (
          <div className={styles.grid}>
            {avisPublies.map((a, i) => (
              <blockquote key={`${i}-${a.auteur}`} className={styles.card}>
                <p className={styles.etoiles} aria-label={`Note : ${a.note} sur 5`}>{'★'.repeat(Math.max(0, Math.min(5, a.note)))}{'☆'.repeat(5 - Math.max(0, Math.min(5, a.note)))}</p>
                <p>« {a.texte} »</p>
                <footer className={styles.note}>{a.auteur}{a.date ? ` · ${a.date}` : ''}</footer>
              </blockquote>
            ))}
          </div>
        )}
      </section>

      {faq.length > 0 && (
        <section id="faq" className={styles.band} aria-labelledby="titre-faq">
          <div className={`container ${styles.section}`}>
            <h2 id="titre-faq">Questions fréquentes</h2>
            <div className={styles.faq}>
              {faq.map((item, i) => (
                <details key={`${i}-${item.question}`} className={styles.question}>
                  <summary>{item.question}</summary>
                  <p>{item.reponse}</p>
                </details>
              ))}
            </div>
            <Link to="/reserver" className={`btn ${styles.selfStart}`}>Réserver un créneau</Link>
          </div>
        </section>
      )}
    </main>
  );
}

/** Prestation de l'espace pro → formule affichée sur le site. */
function versFormule(p: PrestationPro): Formule {
  return {
    id: p.id!, category: p.categoryId ?? '', name: p.name, description: p.description, basePriceCents: p.basePriceCents, baseDurationMin: p.baseDurationMin,
    tarifs: p.tarifs, optionIds: p.optionIds, occupePlage: p.occupePlage, badge: p.badge ?? null, remiseUniteCents: p.remiseUniteCents ?? 0,
  };
}
