import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Field, Toggle, formatEuros } from '@bsandoz/ui';
import { Icone } from '../../components/Icone/Icone';
import r from '../../components/Reglages/Reglages.module.css';
import { CATEGORIES as CATEGORIES_SITE, VEHICLE_TYPES } from '../../data/demo';
import { catalogue, enregistrerOption, enregistrerPrestation, type OptionPro, type PrestationPro, type Tarif } from '../../services/pro';
import { nouvellePrestation } from './nouvellePrestation';
import { Filtres } from './Filtres';
import { filtrer } from './filtrer';
import { CarteFormule } from '../Accueil/CarteFormule';
import type { Formule } from '../../data/demo';
import styles from './Pro.module.css';

/** Catégories du site (intérieur, extérieur, phares, soins à la carte). */
const CATEGORIES: { value: string; label: string }[] = CATEGORIES_SITE;

/** « 1 h 30 », « 45 min ». */
const duree = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}` : `${min} min`);
const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const centimes = (texte: string) => Math.round(Number(texte.replace(',', '.').replace(/\s/g, '')) * 100);
const prixValide = (texte: string) => /^\d+([.,]\d{1,2})?$/.test(texte.trim());


export function CatalogueOnglet() {
  const [prestations, setPrestations] = useState<PrestationPro[]>([]);
  const [recherche, setRecherche] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('');
  const [options, setOptions] = useState<OptionPro[]>([]);
  const [prestation, setPrestation] = useState<PrestationPro>();
  const [option, setOption] = useState<OptionPro>();
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  const charger = useCallback(() => catalogue().then((c) => { setPrestations(c.prestations); setOptions(c.options); }).catch((e: Error) => setErreur(e.message)), []);
  useEffect(() => { charger(); }, [charger]);

  const apres = (texte: string) => { setMessage(texte); setPrestation(undefined); setOption(undefined); charger(); };
  const basculer = async (p: PrestationPro) => {
    setErreur('');
    try { await enregistrerPrestation({ ...p, active: !p.active }); apres(p.active ? `« ${p.name} » n’est plus proposée.` : `« ${p.name} » est de nouveau proposée.`); } catch (e) { setErreur((e as Error).message); }
  };

  return (
    <section className={styles.section} aria-labelledby="titre-catalogue">
      <h2 id="titre-catalogue">Catalogue</h2>
      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      {prestation ? (
        <FormulairePrestation initiale={prestation} options={options} onAnnuler={() => setPrestation(undefined)}
          onEnregistree={(p) => apres(`« ${p.name} » enregistrée.`)} />
      ) : option ? (
        <FormulaireOption initiale={option} onAnnuler={() => setOption(undefined)} onEnregistree={(o) => apres(`Option « ${o.name} » enregistrée.`)} />
      ) : (
        <>
          <Filtres recherche={recherche} onRecherche={setRecherche} categories={CATEGORIES} categorie={filtreCategorie} onCategorie={setFiltreCategorie}
            libelleRecherche="Rechercher une prestation" />
          {[...CATEGORIES, { value: '', label: 'Sans catégorie' }].map((c) => {
            if (filtreCategorie && c.value !== filtreCategorie) return null;
            const liste = filtrer(prestations.filter((p) => (p.categoryId ?? '') === c.value || (c.value === '' && !CATEGORIES.some((x) => x.value === p.categoryId))),
              recherche, '', (p) => `${p.name} ${p.description}`, () => '')
              .sort((a, b) => a.position - b.position);
            if ((c.value === '' || recherche.trim()) && liste.length === 0) return null;
            return (
              <section key={c.value || 'aucune'} className={r.rubrique} aria-labelledby={`cat-${c.value || 'aucune'}`}>
                <div className={r.rubriqueEntete}>
                  <div>
                    <h3 id={`cat-${c.value || 'aucune'}`}>{c.label}</h3>
                    <p className={r.aide}>{liste.filter((p) => p.active).length} proposée{liste.filter((p) => p.active).length > 1 ? 's' : ''} sur le site{liste.some((p) => !p.active) ? `, ${liste.filter((p) => !p.active).length} retirée${liste.filter((p) => !p.active).length > 1 ? 's' : ''}` : ''}</p>
                  </div>
                  {c.value && (
                    <button type="button" className={r.boutonContour} onClick={() => { setMessage(''); setPrestation(nouvellePrestation(prestations.length, c.value)); }}
                      aria-label={`Ajouter une prestation : ${c.label}`}>+ Ajouter</button>
                  )}
                </div>
                {liste.length === 0 ? <p className={r.aide}>Aucune prestation dans cette catégorie.</p> : (
                  <ul className={r.panneau}>
                    {liste.map((p) => (
                      <li key={p.id ?? p.name} className={`${r.ligne} ${p.active ? '' : r.estompee}`}>
                        <Icone nom="catalogue" className={r.ligneIcone} />
                        <div className={r.ligneTexte}>
                          <span className={r.ligneTitre}>{p.name}</span>
                          <span className={r.ligneSous}>
                            À partir de <strong>{formatEuros(Math.min(p.basePriceCents, ...Object.values(p.tarifs).map((t) => t.priceCents)))}</strong>
                            {' · '}{p.occupePlage ? 'demi-journée' : duree(p.baseDurationMin)}
                            {p.optionIds.length > 0 ? ` · ${p.optionIds.length} option${p.optionIds.length > 1 ? 's' : ''}` : ''}
                          </span>
                          {(p.badge || !p.active || (p.remiseUniteCents ?? 0) > 0 || Object.keys(p.tarifs).length > 0) && (
                            <span className={r.etiquettes}>
                              {!p.active && <span className={`${r.etiquette} ${r.etiquetteNeutre}`}>Retirée du site</span>}
                              {p.badge && <span className={r.etiquette}>{p.badge}</span>}
                              {Object.keys(p.tarifs).length > 0 && <span className={`${r.etiquette} ${r.etiquetteNeutre}`}>Prix selon le véhicule</span>}
                              {(p.remiseUniteCents ?? 0) > 0 && <span className={`${r.etiquette} ${r.etiquetteNeutre}`}>−{formatEuros(p.remiseUniteCents!)} par véhicule en plus</span>}
                            </span>
                          )}
                        </div>
                        <div className={r.ligneActions}>
                          <button type="button" className={r.boutonContour} aria-label={`Modifier ${p.name}`} onClick={() => { setMessage(''); setPrestation(p); }}>Modifier</button>
                          <button type="button" className={r.boutonContour} aria-label={p.active ? `Retirer ${p.name}` : `Proposer ${p.name}`} onClick={() => basculer(p)}>
                            {p.active ? 'Retirer' : 'Proposer'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <section className={r.rubrique} aria-labelledby="cat-options">
            <div className={r.rubriqueEntete}>
              <div>
                <h3 id="cat-options">Options</h3>
                <p className={r.aide}>Suppléments au choix du client, à cocher pour chaque prestation concernée.</p>
              </div>
              <button type="button" className={r.boutonContour} onClick={() => { setMessage(''); setOption({ name: '', description: '', priceCents: 0, durationMin: 0, active: true }); }}>
                Ajouter une option
              </button>
            </div>
            {options.length === 0 ? <p className={r.aide}>Aucune option.</p> : (
              <ul className={r.panneau}>
                {filtrer(options, recherche, '', (o) => o.name, () => '').map((o) => (
                  <li key={o.id ?? o.name} className={`${r.ligne} ${o.active ? '' : r.estompee}`}>
                    <Icone nom="etoile" className={r.ligneIcone} />
                    <div className={r.ligneTexte}>
                      <span className={r.ligneTitre}>{o.name}</span>
                      <span className={r.ligneSous}>+ {formatEuros(o.priceCents)}{o.durationMin > 0 ? ` · + ${duree(o.durationMin)}` : ''}{o.active ? '' : ' · non proposée'}</span>
                    </div>
                    <div className={r.ligneActions}>
                      <button type="button" className={r.boutonContour} aria-label={`Modifier l’option ${o.name}`} onClick={() => { setMessage(''); setOption(o); }}>Modifier</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export function FormulairePrestation({ initiale, options, onAnnuler, onEnregistree, apercu = true }: {
  initiale: PrestationPro; options: OptionPro[]; onAnnuler: () => void; onEnregistree: (p: PrestationPro) => void;
  /** Aperçu en direct de la carte affichée sur le site, à droite (sous le formulaire sur téléphone). */
  apercu?: boolean;
}) {
  const [p, setP] = useState(initiale);
  const [prix, setPrix] = useState(initiale.id ? euros(initiale.basePriceCents) : '');
  const [duree, setDuree] = useState(String(initiale.baseDurationMin));
  const [remise, setRemise] = useState(initiale.remiseUniteCents ? euros(initiale.remiseUniteCents) : '');
  const [parVehicule, setParVehicule] = useState(Object.keys(initiale.tarifs).length > 0);
  const [tarifs, setTarifs] = useState<Record<string, { prix: string; duree: string }>>(() =>
    Object.fromEntries(Object.entries(initiale.tarifs).map(([v, t]) => [v, { prix: euros(t.priceCents), duree: String(t.durationMin) }])));
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const dureeValide = (d: string) => /^\d+$/.test(d) && Number(d) > 0;
  const tarifsValides = !parVehicule || Object.values(tarifs).filter((t) => t.prix || t.duree).every((t) => prixValide(t.prix) && dureeValide(t.duree));
  const valide = p.name.trim() !== '' && prixValide(prix) && dureeValide(duree) && tarifsValides && (remise.trim() === '' || prixValide(remise));

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (!valide) return;
    const liste: Record<string, Tarif> = {};
    if (parVehicule) {
      for (const v of VEHICLE_TYPES) {
        const t = tarifs[v.value];
        if (t?.prix && t.duree) liste[v.value] = { priceCents: centimes(t.prix), durationMin: Number(t.duree) };
      }
    }
    setErreur('');
    setEnCours(true);
    try {
      onEnregistree(await enregistrerPrestation({ ...p, name: p.name.trim(), tarifs: liste, basePriceCents: centimes(prix), baseDurationMin: Number(duree), remiseUniteCents: remise.trim() === '' ? 0 : centimes(remise) }));
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  // Aperçu : la carte telle qu'elle apparaîtra sur le site, avec les valeurs en cours de saisie.
  const formuleApercu: Formule = {
    id: initiale.id ?? 'apercu', category: p.categoryId ?? '', name: p.name, description: p.description,
    basePriceCents: prixValide(prix) ? centimes(prix) : 0, baseDurationMin: Number(duree) || 0, tarifs: {}, optionIds: p.optionIds,
    occupePlage: p.occupePlage, badge: p.badge?.trim() ? p.badge : null,
  };

  const formulaire = (
    <form className={styles.panneau} onSubmit={soumettre} noValidate aria-labelledby="titre-prestation">
      <h3 id="titre-prestation">{initiale.id ? `Modifier « ${initiale.name} »` : 'Nouvelle prestation'}</h3>
      <div className={styles.grille}>
        <Field label="Nom" required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        <label className={styles.choix}>Catégorie
          <select value={p.categoryId ?? 'interieur'} onChange={(e) => setP({ ...p, categoryId: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <Field label="Prix (€)" inputMode="decimal" required value={prix} onChange={(e) => setPrix(e.target.value)}
          error={prix && !prixValide(prix) ? 'Montant invalide, ex. 69 ou 69,90.' : undefined} />
        <Field label="Durée (min)" inputMode="numeric" required value={duree} onChange={(e) => setDuree(e.target.value)}
          error={duree && !dureeValide(duree) ? 'Nombre de minutes attendu.' : undefined} />
      </div>
      <Field label="Description" multiline rows={2} value={p.description}
        hint="Éléments séparés par des virgules, « Durée : … » à la fin. Étiquette entre crochets après un élément : « anti-buée [Nouveau] », « désodorisant [Offert · durée limitée] »." onChange={(e) => setP({ ...p, description: e.target.value })} />

      <Toggle label="Prix différent selon le véhicule" checked={parVehicule} onChange={setParVehicule}
        hint="Facultatif : un type laissé vide garde le prix et la durée ci-dessus." />
      {parVehicule && (
        <fieldset className={styles.liste} style={{ border: 0, padding: 0 }}>
          <legend className={styles.choix}>Prix par type de véhicule</legend>
          {VEHICLE_TYPES.map((v) => (
            <div key={v.value} className={`${styles.ligne} ${styles.petit}`}>
              <span style={{ minWidth: 180 }}>{v.label}</span>
              <Field label={`Prix ${v.label} (€)`} inputMode="decimal" value={tarifs[v.value]?.prix ?? ''}
                onChange={(e) => setTarifs({ ...tarifs, [v.value]: { prix: e.target.value, duree: tarifs[v.value]?.duree ?? '' } })}
                error={tarifs[v.value]?.prix && !prixValide(tarifs[v.value].prix) ? 'Montant invalide, ex. 89 ou 89,90.' : undefined} />
              <Field label={`Durée ${v.label} (min)`} inputMode="numeric" value={tarifs[v.value]?.duree ?? ''}
                onChange={(e) => setTarifs({ ...tarifs, [v.value]: { prix: tarifs[v.value]?.prix ?? '', duree: e.target.value } })} />
            </div>
          ))}
        </fieldset>
      )}

      {options.length > 0 && (
        <fieldset className={styles.liste} style={{ border: 0, padding: 0 }}>
          <legend className={styles.choix}>Options proposées avec cette prestation</legend>
          {options.map((o) => o.id && (
            <label key={o.id} className={styles.case}>
              <input type="checkbox" checked={p.optionIds.includes(o.id)}
                onChange={() => setP({ ...p, optionIds: p.optionIds.includes(o.id!) ? p.optionIds.filter((x) => x !== o.id) : [...p.optionIds, o.id!] })} />
              {o.name}{o.active ? '' : ' (non proposée)'}
            </label>
          ))}
        </fieldset>
      )}

      <Toggle label="Durée incertaine (bloque la demi-journée)" checked={p.occupePlage} onChange={(v) => setP({ ...p, occupePlage: v })}
        hint="Proposée seulement en début de matinée ou d’après-midi libre ; le reste de la demi-journée n’est plus réservable." />
      <Field label="Mise en avant (facultatif)" value={p.badge ?? ''} maxLength={40} placeholder="Ex. Le plus choisi"
        hint="Petit badge affiché sur la formule, sur l’accueil et à la réservation. Vide : aucun." onChange={(e) => setP({ ...p, badge: e.target.value })} />
      <Field label="Remise par véhicule supplémentaire, en € (facultatif)" value={remise} inputMode="decimal" placeholder="Ex. 5"
        hint="Retirée du prix pour chaque véhicule au-delà du premier (ex. 5 : 45 € puis 40 € le 2e). Vide : aucune." onChange={(e) => setRemise(e.target.value)} />
      <Toggle label="Proposée aux clients" checked={p.active} onChange={(v) => setP({ ...p, active: v })} />
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <div className={styles.actions}>
        <Button type="submit" loading={enCours} disabled={!valide}>Enregistrer</Button>
        <Button variant="ghost" onClick={onAnnuler}>Annuler</Button>
      </div>
    </form>
  );

  if (!apercu) return formulaire;
  return (
    <div className={styles.avecApercu}>
      {formulaire}
      <aside className={styles.apercu} aria-label="Aperçu sur le site">
        <p className={styles.aide}>Aperçu sur le site</p>
        <CarteFormule formule={formuleApercu} apercu />
      </aside>
    </div>
  );
}

export function FormulaireOption({ initiale, onAnnuler, onEnregistree }: { initiale: OptionPro; onAnnuler: () => void; onEnregistree: (o: OptionPro) => void }) {
  const [o, setO] = useState(initiale);
  const [prix, setPrix] = useState(initiale.id ? euros(initiale.priceCents) : '');
  const [duree, setDuree] = useState(String(initiale.durationMin));
  const [erreur, setErreur] = useState('');
  const valide = o.name.trim() !== '' && prixValide(prix) && /^\d+$/.test(duree);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (!valide) return;
    try {
      onEnregistree(await enregistrerOption({ ...o, name: o.name.trim(), priceCents: centimes(prix), durationMin: Number(duree) }));
    } catch (err) {
      setErreur((err as Error).message);
    }
  };

  return (
    <form className={styles.panneau} onSubmit={soumettre} noValidate aria-labelledby="titre-option">
      <h3 id="titre-option">{initiale.id ? `Modifier l’option « ${initiale.name} »` : 'Nouvelle option'}</h3>
      <div className={styles.grille}>
        <Field label="Nom" required value={o.name} onChange={(e) => setO({ ...o, name: e.target.value })} />
        <Field label="Prix (€)" inputMode="decimal" required value={prix} onChange={(e) => setPrix(e.target.value)} error={prix && !prixValide(prix) ? 'Montant invalide, ex. 15 ou 15,50.' : undefined} />
        <Field label="Durée ajoutée (min)" inputMode="numeric" required value={duree} onChange={(e) => setDuree(e.target.value)} />
      </div>
      <Field label="Description" multiline rows={2} value={o.description} onChange={(e) => setO({ ...o, description: e.target.value })} />
      <Toggle label="Proposée aux clients" checked={o.active} onChange={(v) => setO({ ...o, active: v })} />
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <div className={styles.actions}>
        <Button type="submit" disabled={!valide}>Enregistrer</Button>
        <Button variant="ghost" onClick={onAnnuler}>Annuler</Button>
      </div>
    </form>
  );
}
