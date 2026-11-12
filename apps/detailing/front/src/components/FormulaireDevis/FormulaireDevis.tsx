import { useState, type FormEvent } from 'react';
import { CATEGORIES } from '../../data/demo';
import { envoyerDemandeContact } from '../../services/api';
import styles from './FormulaireDevis.module.css';

const TYPES = ['Flotte d’entreprise', 'Utilitaires', 'Poids lourds', 'Garage ou concession', 'Autre'];
const FREQUENCES = ['Ponctuelle', 'Mensuelle', 'Hebdomadaire'];
const PRESTATIONS_PRO = ['Intérieur', 'Extérieur', 'Rénovation des phares'];

export interface FormulaireDevisProps {
  /** « pro » : entreprise, type de véhicules, fréquence ; « particulier » : prestation et nombre de véhicules. */
  variante: 'pro' | 'particulier';
  /** Adresse déjà saisie (ex. adresse hors zone à la réservation). */
  adresseInitiale?: string;
  placeholder?: string;
}

const vide = { entreprise: '', nom: '', email: '', telephone: '', type: '', nombre: '', frequence: '', adresse: '', prestation: '', message: '', site: '' };

/** Demande de devis envoyée au pro par mail (POST /contact), avec un champ piège invisible contre les robots. */
export function FormulaireDevis({ variante, adresseInitiale = '', placeholder }: FormulaireDevisProps) {
  const [f, setF] = useState({ ...vide, adresse: adresseInitiale });
  const [prestations, setPrestations] = useState<string[]>([]);
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye'>('saisie');
  const [erreur, setErreur] = useState('');
  const pro = variante === 'pro';
  const valide = f.nom.trim() !== '' && /\S+@\S+\.\S+/.test(f.email) && f.message.trim() !== '';

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    if (!valide) return;
    setErreur('');
    setEtat('envoi');
    try {
      await envoyerDemandeContact({
        nom: f.nom, email: f.email, telephone: f.telephone, entreprise: pro ? f.entreprise : '', message: f.message, site: f.site,
        details: pro
          ? { 'Demande': 'Professionnel', 'Type de véhicules': f.type, 'Nombre de véhicules': f.nombre, 'Fréquence souhaitée': f.frequence,
              'Adresse d’intervention': f.adresse, 'Prestations souhaitées': prestations.join(', ') }
          : { 'Demande': 'Particulier', 'Prestation souhaitée': f.prestation, 'Nombre de véhicules': f.nombre, 'Adresse d’intervention': f.adresse },
      });
      setEtat('envoye');
    } catch (err) {
      setErreur((err as Error).message);
      setEtat('saisie');
    }
  };
  const champ = (cle: keyof typeof vide) => ({ value: f[cle], onChange: (e: { target: { value: string } }) => setF({ ...f, [cle]: e.target.value }) });

  if (etat === 'envoye') {
    return <p className={styles.ok} role="status">Merci, votre demande est envoyée. Je vous réponds au plus vite par e-mail ou par téléphone.</p>;
  }

  return (
    <form className={styles.formulaire} onSubmit={envoyer} noValidate>
      <div className={styles.grille}>
        {pro && <label className={styles.champ}>Entreprise<input {...champ('entreprise')} autoComplete="organization" /></label>}
        <label className={styles.champ}>Nom et prénom *<input {...champ('nom')} autoComplete="name" required /></label>
        <label className={styles.champ}>E-mail *<input type="email" {...champ('email')} autoComplete="email" required /></label>
        <label className={styles.champ}>Téléphone<input type="tel" {...champ('telephone')} autoComplete="tel" /></label>
        {pro ? (
          <label className={styles.champ}>Type de véhicules
            <select {...champ('type')}><option value="">Choisir…</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </label>
        ) : (
          <label className={styles.champ}>Prestation souhaitée
            <select {...champ('prestation')}><option value="">Choisir…</option>{CATEGORIES.map((c) => <option key={c.value}>{c.label}</option>)}</select>
          </label>
        )}
        <label className={styles.champ}>Nombre de véhicules<input inputMode="numeric" {...champ('nombre')} /></label>
        {pro && (
          <label className={styles.champ}>Fréquence souhaitée
            <select {...champ('frequence')}><option value="">Choisir…</option>{FREQUENCES.map((t) => <option key={t}>{t}</option>)}</select>
          </label>
        )}
        <label className={styles.champ}>Adresse d’intervention<input {...champ('adresse')} autoComplete="street-address" /></label>
      </div>
      {pro && (
        <fieldset className={styles.prestations}>
          <legend>Prestations souhaitées</legend>
          {PRESTATIONS_PRO.map((p) => (
            <label key={p} className={styles.case}>
              <input type="checkbox" checked={prestations.includes(p)} onChange={() => setPrestations(prestations.includes(p) ? prestations.filter((x) => x !== p) : [...prestations, p])} />
              {p}
            </label>
          ))}
        </fieldset>
      )}
      <label className={styles.champ}>Votre besoin *<textarea rows={5} {...champ('message')} required placeholder={placeholder} /></label>
      {/* Champ piège invisible : les robots le remplissent, pas les visiteurs. */}
      <label className={styles.piege} aria-hidden="true">Site web<input tabIndex={-1} autoComplete="off" {...champ('site')} /></label>
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <p className={styles.note}>* obligatoire. Vos coordonnées servent uniquement à répondre à votre demande.</p>
      <button type="submit" className="btn" disabled={!valide || etat === 'envoi'} aria-busy={etat === 'envoi'}>Envoyer ma demande</button>
    </form>
  );
}
