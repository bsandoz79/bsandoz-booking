import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, DataTable, Field, Toggle, formatEuros } from '@bsandoz/ui';
import { CATEGORIES as CATEGORIES_SITE, VEHICLE_TYPES } from '../../data/demo';
import { catalogue, enregistrerOption, enregistrerPrestation, type OptionPro, type PrestationPro, type Tarif } from '../../services/pro';
import styles from './Pro.module.css';

/** Catégories du site (intérieur, extérieur, phares, soins à la carte). */
const CATEGORIES: { value: string; label: string }[] = CATEGORIES_SITE;

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const centimes = (texte: string) => Math.round(Number(texte.replace(',', '.').replace(/\s/g, '')) * 100);
const prixValide = (texte: string) => /^\d+([.,]\d{1,2})?$/.test(texte.trim());

const nouvellePrestation = (position: number): PrestationPro => ({
  name: '', description: '', basePriceCents: 0, baseDurationMin: 60, active: true, categoryId: 'interieur', position, occupePlage: false, tarifs: {}, optionIds: [],
});

export function CatalogueOnglet() {
  const [prestations, setPrestations] = useState<PrestationPro[]>([]);
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
          <DataTable caption="Prestations" rows={prestations} rowKey={(p) => p.id ?? p.name} emptyLabel="Aucune prestation."
            onRowClick={(p) => { setMessage(''); setPrestation(p); }} rowActionLabel={(p) => `Modifier ${p.name}`}
            columns={[
              { key: 'name', header: 'Prestation', sortValue: (p) => p.name },
              { key: 'categorie', header: 'Catégorie', render: (p) => CATEGORIES.find((c) => c.value === p.categoryId)?.label ?? '—' },
              { key: 'prix', header: 'À partir de', align: 'end', render: (p) => formatEuros(Math.min(p.basePriceCents, ...Object.values(p.tarifs).map((t) => t.priceCents))), sortValue: (p) => p.basePriceCents },
              { key: 'duree', header: 'Durée', render: (p) => (p.occupePlage ? 'Demi-journée' : `${p.baseDurationMin} min`) },
              { key: 'active', header: 'Proposée', render: (p) => (
                <span className={styles.actions}>
                  {p.active ? 'Oui' : 'Non'}
                  <Button variant="ghost" onClick={() => basculer(p)}>{p.active ? `Retirer ${p.name}` : `Proposer ${p.name}`}</Button>
                </span>
              ) },
            ]} />
          <Button variant="secondary" onClick={() => { setMessage(''); setPrestation(nouvellePrestation(prestations.length)); }}>Ajouter une prestation</Button>

          <DataTable caption="Options" rows={options} rowKey={(o) => o.id ?? o.name} emptyLabel="Aucune option."
            onRowClick={(o) => { setMessage(''); setOption(o); }} rowActionLabel={(o) => `Modifier l’option ${o.name}`}
            columns={[
              { key: 'name', header: 'Option', sortValue: (o) => o.name },
              { key: 'prix', header: 'Prix', align: 'end', render: (o) => formatEuros(o.priceCents), sortValue: (o) => o.priceCents },
              { key: 'duree', header: 'Durée', render: (o) => `+ ${o.durationMin} min` },
              { key: 'active', header: 'Proposée', render: (o) => (o.active ? 'Oui' : 'Non') },
            ]} />
          <Button variant="secondary" onClick={() => { setMessage(''); setOption({ name: '', description: '', priceCents: 0, durationMin: 0, active: true }); }}>Ajouter une option</Button>
        </>
      )}
    </section>
  );
}

function FormulairePrestation({ initiale, options, onAnnuler, onEnregistree }: {
  initiale: PrestationPro; options: OptionPro[]; onAnnuler: () => void; onEnregistree: (p: PrestationPro) => void;
}) {
  const [p, setP] = useState(initiale);
  const [prix, setPrix] = useState(initiale.id ? euros(initiale.basePriceCents) : '');
  const [duree, setDuree] = useState(String(initiale.baseDurationMin));
  const [parVehicule, setParVehicule] = useState(Object.keys(initiale.tarifs).length > 0);
  const [tarifs, setTarifs] = useState<Record<string, { prix: string; duree: string }>>(() =>
    Object.fromEntries(Object.entries(initiale.tarifs).map(([v, t]) => [v, { prix: euros(t.priceCents), duree: String(t.durationMin) }])));
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const dureeValide = (d: string) => /^\d+$/.test(d) && Number(d) > 0;
  const tarifsValides = !parVehicule || Object.values(tarifs).filter((t) => t.prix || t.duree).every((t) => prixValide(t.prix) && dureeValide(t.duree));
  const valide = p.name.trim() !== '' && prixValide(prix) && dureeValide(duree) && tarifsValides;

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
      onEnregistree(await enregistrerPrestation({ ...p, name: p.name.trim(), tarifs: liste, basePriceCents: centimes(prix), baseDurationMin: Number(duree) }));
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
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
      <Field label="Description" multiline rows={2} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} />

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
      <Toggle label="Proposée aux clients" checked={p.active} onChange={(v) => setP({ ...p, active: v })} />
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <div className={styles.actions}>
        <Button type="submit" loading={enCours} disabled={!valide}>Enregistrer</Button>
        <Button variant="ghost" onClick={onAnnuler}>Annuler</Button>
      </div>
    </form>
  );
}

function FormulaireOption({ initiale, onAnnuler, onEnregistree }: { initiale: OptionPro; onAnnuler: () => void; onEnregistree: (o: OptionPro) => void }) {
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
