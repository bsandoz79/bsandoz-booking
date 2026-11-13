import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, DataTable, Field, formatEuros } from '@bsandoz/ui';
import { enregistrerInfosVendeur, factures, infosVendeur, type FactureResume, type InfosVendeur } from '../../services/factures';
import styles from './Pro.module.css';

const A_COMPLETER = '[à compléter]';
const jour = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Factures : informations du vendeur imprimées sur chaque facture, puis la liste des factures émises (une par
 * prestation marquée « Terminé »), chacune consultable et imprimable en PDF.
 */
export function FacturesOnglet() {
  const [liste, setListe] = useState<FactureResume[]>([]);
  const [erreur, setErreur] = useState('');
  useEffect(() => { factures().then(setListe).catch((e: Error) => setErreur(e.message)); }, []);

  return (
    <section className={styles.section} aria-labelledby="titre-factures">
      <h2 id="titre-factures">Factures</h2>
      <p className={styles.aide}>Une facture est créée et envoyée au client dès que vous marquez un rendez-vous « Terminé ». Numérotation automatique, sans trou.</p>
      <InfosVendeurFormulaire />
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <DataTable caption="Factures émises" rows={liste} rowKey={(f) => f.id} emptyLabel="Aucune facture pour l’instant."
        columns={[
          { key: 'numero', header: 'Numéro', render: (f) => <Link to={`/facture/${f.id}`}>{f.numero}</Link>, sortValue: (f) => f.numero },
          { key: 'date', header: 'Prestation', render: (f) => jour(f.prestationLe), sortValue: (f) => f.prestationLe },
          { key: 'client', header: 'Client', sortValue: (f) => f.client },
          { key: 'total', header: 'Montant', align: 'end', render: (f) => formatEuros(f.totalCents), sortValue: (f) => f.totalCents },
        ]} />
    </section>
  );
}

function InfosVendeurFormulaire() {
  const [infos, setInfos] = useState<InfosVendeur>();
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  useEffect(() => { infosVendeur().then((i) => setInfos(Object.fromEntries(Object.entries(i).map(([k, v]) => [k, v === A_COMPLETER ? '' : v])) as InfosVendeur)).catch((e: Error) => setErreur(e.message)); }, []);
  if (!infos) return null;

  const champ = (cle: keyof InfosVendeur) => ({ value: infos[cle], onChange: (e: { target: { value: string } }) => setInfos({ ...infos, [cle]: e.target.value }) });
  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(''); setErreur('');
    try { await enregistrerInfosVendeur(infos); setMessage('Informations de facturation enregistrées.'); } catch (err) { setErreur((err as Error).message); }
  };

  return (
    <form className={styles.panneau} onSubmit={enregistrer} noValidate aria-labelledby="titre-vendeur">
      <h3 id="titre-vendeur">Vos informations sur les factures</h3>
      <p className={styles.aide}>Champ vide : « [à compléter] » sur les factures.</p>
      <div className={styles.grille}>
        <Field label="Nom ou raison sociale" {...champ('nom')} />
        <Field label="SIRET" inputMode="numeric" {...champ('siret')} hint="14 chiffres." />
        <Field label="E-mail" type="email" {...champ('email')} />
        <Field label="Téléphone" type="tel" placeholder="01 02 03 04 05" {...champ('telephone')} />
      </div>
      <Field label="Adresse" {...champ('adresse')} />
      <Field label="Mention de TVA" {...champ('mentionTva')} placeholder="TVA non applicable, art. 293 B du CGI" hint="Micro-entreprise : « TVA non applicable, art. 293 B du CGI ». Sinon, votre numéro de TVA." />
      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <div className={styles.actions}><Button type="submit">Enregistrer</Button></div>
    </form>
  );
}
