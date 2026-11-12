import { useEffect, useState, type FormEvent } from 'react';
import { useContenu } from '../../app/contenuContexte';
import { SITE } from '../../data/site';
import { envoyerDemandeContact, getZone } from '../../services/api';
import { A_COMPLETER } from '../../services/contenu';
import { PAGES_SEO } from '../../seo/donnees';
import { useSeo } from '../../seo/useSeo';
import styles from './Professionnels.module.css';

const TYPES = ['Flotte d’entreprise', 'Utilitaires', 'Poids lourds', 'Garage ou concession', 'Autre'];
const FREQUENCES = ['Ponctuelle', 'Mensuelle', 'Hebdomadaire'];
const PRESTATIONS = ['Intérieur', 'Extérieur', 'Rénovation des phares'];
const PAGE = PAGES_SEO.find((p) => p.chemin === '/professionnels');

const vide = { entreprise: '', nom: '', email: '', telephone: '', type: '', nombre: '', frequence: '', adresse: '', message: '', site: '' };

/**
 * Page « Professionnels » (flottes, utilitaires, poids lourds, garages) : uniquement sur devis. Formulaire de demande
 * transmis au pro par mail (POST /contact), coordonnées modifiables dans l'espace pro (« Mon site »).
 */
export function Professionnels() {
  useSeo(PAGE?.titre ?? 'Professionnels | Perfect Clean', PAGE?.description);
  const { coordonnees } = useContenu().contenu;
  const [rayon, setRayon] = useState<number>();
  const [f, setF] = useState(vide);
  const [prestations, setPrestations] = useState<string[]>([]);
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye'>('saisie');
  const [erreur, setErreur] = useState('');
  useEffect(() => { getZone().then((z) => setRayon(z.surPlace ? undefined : z.maxDistanceKm)).catch(() => undefined); }, []);

  const telephone = coordonnees.telephone !== A_COMPLETER && coordonnees.telephone.trim() !== '' ? coordonnees.telephone : '';
  const email = coordonnees.email.includes('@') ? coordonnees.email : '';
  const valide = f.nom.trim() !== '' && /\S+@\S+\.\S+/.test(f.email) && f.message.trim() !== '';

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    if (!valide) return;
    setErreur('');
    setEtat('envoi');
    try {
      await envoyerDemandeContact({
        nom: f.nom, email: f.email, telephone: f.telephone, entreprise: f.entreprise, message: f.message, site: f.site,
        details: {
          'Type de véhicules': f.type, 'Nombre de véhicules': f.nombre, 'Fréquence souhaitée': f.frequence,
          'Adresse d’intervention': f.adresse, 'Prestations souhaitées': prestations.join(', '),
        },
      });
      setEtat('envoye');
      setF(vide);
      setPrestations([]);
    } catch (err) {
      setErreur((err as Error).message);
      setEtat('saisie');
    }
  };
  const champ = (cle: keyof typeof vide) => ({ value: f[cle], onChange: (e: { target: { value: string } }) => setF({ ...f, [cle]: e.target.value }) });

  return (
    <main className={`container ${styles.page}`}>
      <p className={styles.surtitre}>{SITE.brand} · Professionnels</p>
      <h1>{PAGE?.h1 ?? 'Espace professionnels'}</h1>
      <p className={styles.intro}>
        Flottes, utilitaires, poids lourds, garages : j’interviens sur site à {SITE.city}{rayon ? ` et dans un rayon de ${rayon} km` : ' et alentours'}. Uniquement sur devis.
      </p>

      <ul className={styles.atouts}>
        <li><strong>Sur site</strong><span>Je viens à votre dépôt ou sur votre parking.</span></li>
        <li><strong>Devis sur mesure</strong><span>Tarif selon le nombre de véhicules et la fréquence.</span></li>
        <li><strong>Eau et électricité autonomes</strong><span>Aucun raccordement nécessaire.</span></li>
        <li><strong>Interventions planifiées</strong><span>Ponctuelles ou régulières, aux horaires qui gênent le moins votre activité.</span></li>
      </ul>

      <section aria-labelledby="titre-devis" className={styles.section}>
        <h2 id="titre-devis">Demander un devis</h2>
        <p>Décrivez votre besoin : je vous réponds avec un devis personnalisé selon votre activité.</p>

        {etat === 'envoye' ? (
          <p className={styles.ok} role="status">Merci, votre demande est envoyée. Je vous réponds au plus vite par e-mail ou par téléphone.</p>
        ) : (
          <form className={styles.formulaire} onSubmit={envoyer} noValidate>
            <div className={styles.grille}>
              <label className={styles.champ}>Entreprise<input {...champ('entreprise')} autoComplete="organization" /></label>
              <label className={styles.champ}>Nom et prénom *<input {...champ('nom')} autoComplete="name" required /></label>
              <label className={styles.champ}>E-mail *<input type="email" {...champ('email')} autoComplete="email" required /></label>
              <label className={styles.champ}>Téléphone<input type="tel" {...champ('telephone')} autoComplete="tel" /></label>
              <label className={styles.champ}>Type de véhicules
                <select {...champ('type')}><option value="">Choisir…</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              </label>
              <label className={styles.champ}>Nombre de véhicules<input inputMode="numeric" {...champ('nombre')} /></label>
              <label className={styles.champ}>Fréquence souhaitée
                <select {...champ('frequence')}><option value="">Choisir…</option>{FREQUENCES.map((t) => <option key={t}>{t}</option>)}</select>
              </label>
              <label className={styles.champ}>Adresse d’intervention<input {...champ('adresse')} autoComplete="street-address" /></label>
            </div>
            <fieldset className={styles.prestations}>
              <legend>Prestations souhaitées</legend>
              {PRESTATIONS.map((p) => (
                <label key={p} className={styles.case}>
                  <input type="checkbox" checked={prestations.includes(p)} onChange={() => setPrestations(prestations.includes(p) ? prestations.filter((x) => x !== p) : [...prestations, p])} />
                  {p}
                </label>
              ))}
            </fieldset>
            <label className={styles.champ}>Votre besoin *<textarea rows={5} {...champ('message')} required placeholder="Ex. 6 utilitaires à nettoyer une fois par mois, intérieur et extérieur." /></label>
            {/* Champ piège invisible : les robots le remplissent, pas les visiteurs. */}
            <label className={styles.piege} aria-hidden="true">Site web<input tabIndex={-1} autoComplete="off" {...champ('site')} /></label>
            {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
            <p className={styles.note}>* obligatoire. Vos coordonnées servent uniquement à répondre à votre demande.</p>
            <button type="submit" className="btn" disabled={!valide || etat === 'envoi'} aria-busy={etat === 'envoi'}>Envoyer ma demande</button>
          </form>
        )}
      </section>

      <section aria-labelledby="titre-direct" className={styles.section}>
        <h2 id="titre-direct">Ou directement</h2>
        <p className={styles.contacts}>
          {telephone ? <a className="btn btn--ghost" href={`tel:${telephone.replace(/[^\d+]/g, '')}`}>Appeler le {telephone}</a> : <span>Téléphone : {A_COMPLETER}</span>}
          {email ? <a className="btn btn--ghost" href={`mailto:${email}?subject=${encodeURIComponent('Demande de devis professionnel')}`}>Écrire à {email}</a> : <span>E-mail : {A_COMPLETER}</span>}
        </p>
      </section>
    </main>
  );
}
