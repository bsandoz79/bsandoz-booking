import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, DataTable, Field, Toggle, formatEuros } from '@bsandoz/ui';
import { ajouterDepense, bilan, retirerDepense, type Bilan, type Depense } from '../../services/comptabilite';
import { jourLocal } from './dates';
import styles from './Pro.module.css';

const NOMS_MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const nomMois = (m: string) => NOMS_MOIS[Number(m.slice(5, 7)) - 1];
const jour = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const prixValide = (t: string) => /^\d+([.,]\d{1,2})?$/.test(t.trim()) && Number(t.trim().replace(',', '.')) > 0;

/** Comptabilité simple : chiffre d'affaires (prestations faites), dépenses et résultat par mois ; saisie des dépenses. */
export function ComptabiliteOnglet() {
  const [annee, setAnnee] = useState(() => new Date().getFullYear());
  const [b, setB] = useState<Bilan>();
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const charger = useCallback(() => bilan(annee).then(setB).catch((e: Error) => setErreur(e.message)), [annee]);
  useEffect(() => { charger(); }, [charger]);

  const retirer = async (d: Depense) => {
    setMessage(''); setErreur('');
    try {
      await retirerDepense(d.id);
      setMessage(d.mensuelle ? `« ${d.libelle} » arrêtée.` : `« ${d.libelle} » supprimée.`);
      charger();
    } catch (e) { setErreur((e as Error).message); }
  };

  return (
    <section className={styles.section} aria-labelledby="titre-compta">
      <h2 id="titre-compta">Comptabilité</h2>
      <p className={styles.aide}>Suivi simple : chiffre d’affaires des prestations marquées « Terminé » (produits compris), moins vos dépenses. Pour vos déclarations, rapprochez-vous de votre comptable.</p>
      <div className={styles.actions} role="group" aria-label="Année">
        <Button variant="ghost" onClick={() => setAnnee(annee - 1)} aria-label={`Année ${annee - 1}`}>← {annee - 1}</Button>
        <strong aria-live="polite">{annee}</strong>
        <Button variant="ghost" onClick={() => setAnnee(annee + 1)} aria-label={`Année ${annee + 1}`}>{annee + 1} →</Button>
      </div>
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      {b && (
        <>
          <div className={styles.tuiles}>
            <div className={styles.tuile}><span className={styles.valeur}>{formatEuros(b.totaux.chiffreAffairesCents)}</span><span className={styles.libelle}>Chiffre d’affaires {b.annee}</span></div>
            <div className={styles.tuile}><span className={styles.valeur}>{formatEuros(b.totaux.depensesCents)}</span><span className={styles.libelle}>Dépenses {b.annee}</span></div>
            <div className={styles.tuile}><span className={`${styles.valeur} ${b.totaux.resultatCents < 0 ? styles.negatif : ''}`}>{formatEuros(b.totaux.resultatCents)}</span><span className={styles.libelle}>Résultat {b.annee}</span></div>
          </div>
          <DataTable caption={`Par mois, ${b.annee}`} rows={b.mois} rowKey={(m) => m.mois} emptyLabel="—"
            columns={[
              { key: 'mois', header: 'Mois', render: (m) => nomMois(m.mois) },
              { key: 'ca', header: 'Chiffre d’affaires', align: 'end', render: (m) => formatEuros(m.chiffreAffairesCents) },
              { key: 'dep', header: 'Dépenses', align: 'end', render: (m) => formatEuros(m.depensesCents) },
              { key: 'res', header: 'Résultat', align: 'end', render: (m) => <span className={m.resultatCents < 0 ? styles.negatif : undefined}>{formatEuros(m.resultatCents)}</span> },
            ]} />
        </>
      )}

      <FormulaireDepense onAjoutee={(d) => { setErreur(''); setMessage(`Dépense « ${d.libelle} » ajoutée.`); charger(); }} />
      {message && <p className={styles.ok} role="status">{message}</p>}

      {b && (
        <>
          <h3>Dépenses {b.annee}</h3>
          {b.depenses.length === 0 ? <p>Aucune dépense saisie.</p> : (
            <ul className={styles.liste}>
              {b.depenses.map((d) => (
                <li key={d.id} className={styles.prochain}>
                  <span><strong>{d.libelle}</strong> · {formatEuros(d.montantCents)}{d.mensuelle ? ' par mois' : ''} · {d.mensuelle ? `depuis le ${jour(d.le)}` : jour(d.le)}{d.finLe ? `, arrêtée le ${jour(d.finLe)}` : ''}</span>
                  {!d.finLe && <Button variant="ghost" onClick={() => retirer(d)}>{d.mensuelle ? `Arrêter ${d.libelle}` : `Supprimer ${d.libelle}`}</Button>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function FormulaireDepense({ onAjoutee }: { onAjoutee: (d: Depense) => void }) {
  const [le, setLe] = useState(() => jourLocal(new Date()));
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState('');
  const [mensuelle, setMensuelle] = useState(false);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const valide = libelle.trim() !== '' && prixValide(montant) && /^\d{4}-\d{2}-\d{2}$/.test(le);

  const ajouter = async (e: FormEvent) => {
    e.preventDefault();
    if (!valide) return;
    setErreur(''); setEnCours(true);
    try {
      const d = await ajouterDepense({ le, libelle: libelle.trim(), montantCents: Math.round(Number(montant.trim().replace(',', '.')) * 100), mensuelle });
      setLibelle(''); setMontant(''); setMensuelle(false);
      onAjoutee(d);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <form className={styles.panneau} onSubmit={ajouter} noValidate aria-labelledby="titre-depense">
      <h3 id="titre-depense">Ajouter une dépense</h3>
      <div className={styles.grille}>
        <Field label="Libellé" value={libelle} maxLength={120} placeholder="Ex. produits, carburant, assurance" onChange={(e) => setLibelle(e.target.value)} />
        <Field label="Montant (€)" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} error={montant && !prixValide(montant) ? 'Montant invalide, ex. 15 ou 15,50.' : undefined} />
        <Field label="Date" type="date" value={le} onChange={(e) => setLe(e.target.value)} />
      </div>
      <Toggle label="Dépense mensuelle" checked={mensuelle} onChange={setMensuelle} hint="Comptée chaque mois à partir de cette date (assurance, abonnement, crédit du camion…), jusqu’à ce que vous l’arrêtiez." />
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <div><Button type="submit" loading={enCours} disabled={!valide}>Ajouter la dépense</Button></div>
    </form>
  );
}
